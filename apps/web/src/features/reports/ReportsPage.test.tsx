import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StudentReport } from '@lms/shared'
import { buildXlsx } from '@/lib/xlsx-export'
import { reportToSheets } from './report-export'
import { ReportsPage } from './ReportsPage'

// recharts needs a sized container; jsdom reports 0 width so charts don't paint.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 240 }}>{children}</div>
    ),
  }
})

const BRANCH_ID = '10000000-0000-0000-0000-000000000001'
const LEVEL_ID = '20000000-0000-0000-0000-000000000001'
const CLASS_ID = '50000000-0000-0000-0000-000000000001'
const STUDENT_ID = '80000000-0000-0000-0000-000000000001'

const passFail = { passed: 2, failed: 1 }
const report: StudentReport = {
  totals: { students: 1, averageExamScore: 80, averageAttendanceRate: 100, averageFinal: 82, passRate: 67, studentsPassed: 1, studentsFailed: 0, ...passFail },
  classifications: { excellent: 0, good: 1, average: 0, weak: 0, unranked: 0 },
  byClass: [{ classId: CLASS_ID, className: 'Starter A', branchName: 'Cơ sở 1', levelCode: 'starter', students: 1, averageFinal: 82, ...passFail }],
  byLevel: [{ levelId: LEVEL_ID, levelCode: 'starter', students: 1, averageFinal: 82, ...passFail }],
  byMonth: [{ month: '2026-11', ...passFail }],
  ranking: [
    {
      rank: 1,
      studentId: STUDENT_ID,
      phoneNumber: '0900000021',
      studentName: 'Nguyễn Văn A',
      classId: CLASS_ID,
      className: 'Starter A',
      branchName: 'Cơ sở 1',
      levelCode: 'starter',
      examScore: 80,
      attendanceRate: 100,
      finalScore: 82,
      classification: 'good',
      passed: true,
      examsTaken: 2,
      examsPassed: 1,
      attempts: 3,
      retakes: 1,
      pendingRetakes: 1,
    },
  ],
}
const policy = { levelId: LEVEL_ID, levelCode: 'starter', levelName: 'Starter', examWeight: 90, attendanceWeight: 10, excellentMin: 85, goodMin: 70, averageMin: 50, passMin: 50 }

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

function stubAdminFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/branches')) return json({ branches: [{ id: BRANCH_ID, centerId: BRANCH_ID, name: 'Cơ sở 1', address: null, createdAt: '2026-11-01' }] })
    if (url.endsWith('/api/levels')) return json({ levels: [{ id: LEVEL_ID, code: 'starter', name: 'Starter' }] })
    if (url.endsWith('/api/classes')) return json({ classes: [] })
    if (url.includes('/api/reports/students')) return json(report)
    if (url.endsWith('/api/reports/classification-policies')) return json({ policies: [policy] })
    if (url.endsWith(`/api/reports/classification-policies/${LEVEL_ID}`) && init?.method === 'PUT') {
      return json({ ...policy, ...JSON.parse(String(init.body)) })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ReportsPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows ranking with retake tracking, filters by branch and saves only a valid policy', async () => {
    const fetchMock = stubAdminFetch()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('0900000021')).toBeInTheDocument()
    expect(screen.getByText('(chờ thi lại 1)')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByRole('option', { name: 'Cơ sở 1' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Cơ sở'), { target: { value: BRANCH_ID } })
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes(`/api/reports/students?branchId=${BRANCH_ID}`))).toBe(true),
    )

    // Weights must sum to 100: rejected locally, nothing is sent.
    fireEvent.change(await screen.findByLabelText('starter Trọng số thi (%)'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(await screen.findByText(/phai bang 100/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(false)

    fireEvent.change(screen.getByLabelText('starter Trọng số chuyên cần (%)'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(await screen.findByText('Đã lưu.')).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({ examWeight: 80, attendanceWeight: 20 })
  })

  it('exports an XLSX that the real reader parses back with the same rows', async () => {
    const bytes = buildXlsx(reportToSheets(report))
    const { default: readXlsxFile } = await import('read-excel-file/browser')
    const sheets = await readXlsxFile(Uint8Array.from(bytes).buffer)
    expect(sheets.map((s) => s.sheet)).toEqual(['Xep hang', 'Theo lop', 'Theo cap do', 'Theo thang'])
    const ranking = sheets[0]!.data
    expect(ranking[0]?.[0]).toBe('Hạng')
    expect(ranking[1]).toEqual([1, 'Nguyễn Văn A', '0900000021', 'Starter A', 'Cơ sở 1', 'starter', 80, 100, 82, 'Khá', 'Đậu', 2, 1, 3, 1, 1])
  })

  it('paginates the ranking 20/50 per page and keeps the search filter (slice-24)', async () => {
    const many: StudentReport = {
      ...report,
      totals: { ...report.totals, students: 25 },
      ranking: Array.from({ length: 25 }, (_, i) => ({
        ...report.ranking[0]!,
        rank: i + 1,
        studentId: `80000000-0000-0000-0000-0000000000${String(i).padStart(2, '0')}`,
        phoneNumber: `090000${String(i).padStart(4, '0')}`,
        studentName: `HV ${String(i).padStart(2, '0')}`,
      })),
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/branches')) return json({ branches: [] })
      if (url.endsWith('/api/levels')) return json({ levels: [] })
      if (url.endsWith('/api/classes')) return json({ classes: [] })
      if (url.includes('/api/reports/students')) return json(many)
      if (url.endsWith('/api/reports/classification-policies')) return json({ policies: [] })
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Default page size 20: first row visible, row 21 (HV 20) not yet.
    expect(await screen.findByText('HV 00')).toBeInTheDocument()
    expect(screen.queryByText('HV 20')).not.toBeInTheDocument()
    expect(screen.getByText(/Trang 1\/2/)).toBeInTheDocument()

    // Next page shows the remaining 5.
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(await screen.findByText('HV 20')).toBeInTheDocument()
    expect(screen.queryByText('HV 00')).not.toBeInTheDocument()

    // Switch to 50/page: everyone on one page, back to page 1.
    fireEvent.change(screen.getByLabelText('Số dòng mỗi trang'), { target: { value: '50' } })
    expect(await screen.findByText('HV 00')).toBeInTheDocument()
    expect(screen.getByText('HV 24')).toBeInTheDocument()
    expect(screen.getByText(/Trang 1\/1/)).toBeInTheDocument()

    // Search narrows + resets to page 1 without losing the filter.
    fireEvent.change(screen.getByLabelText('Tìm theo tên hoặc mã học sinh'), { target: { value: 'HV 24' } })
    expect(await screen.findByText('HV 24')).toBeInTheDocument()
    expect(screen.queryByText('HV 00')).not.toBeInTheDocument()
  })
})
