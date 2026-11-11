import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MyTimesheet, StaffShift, WorkHoursReport } from '@lms/shared'
import { workHoursToSheets } from './work-hours-export'
import { WorkHoursPage } from './WorkHoursPage'

const TEACHER_ID = '70000000-0000-0000-0000-000000000001'
const SESSION_ID = '90000000-0000-0000-0000-000000000001'
const CLASS_ID = '50000000-0000-0000-0000-000000000001'

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })

const report: WorkHoursReport = {
  month: '2026-11',
  teachers: [
    { teacherId: TEACHER_ID, phoneNumber: '0911000001', firstName: 'Hà', lastName: 'Nguyễn Thu', planned: 3, held: 3, missed: 1, makeup: 1, substitute: 0, taughtMinutes: 270 },
  ],
  staff: [{ userId: TEACHER_ID, phoneNumber: '0912000001', firstName: null, lastName: null, role: 'staff', workDays: 2, workedMinutes: 960, openShifts: 0 }],
  sessions: [
    {
      sessionId: SESSION_ID,
      classId: CLASS_ID,
      className: 'Starter A',
      sessionDate: '2026-11-03',
      startsAt: '18:00',
      durationMinutes: 90,
      plannedTeacherPhone: '0911000001',
      taughtByPhone: '0911000001',
      status: 'held',
      isMakeup: true,
      isSubstitute: false,
    },
  ],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WorkHoursPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WorkHoursPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lets staff check in and shows the open shift', async () => {
    let open: StaffShift | null = null
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me')) return json({ user: { id: TEACHER_ID, phoneNumber: '0912000001', role: 'staff' } })
      if (url.includes('/api/me/timesheet')) {
        const sheet: MyTimesheet = {
          month: '2026-11',
          openShift: open,
          shifts: open ? [open] : [],
          summary: { workedMinutes: 0, workDays: open ? 1 : 0, openShifts: open ? 1 : 0 },
          teaching: null,
        }
        return json(sheet)
      }
      if (url.endsWith('/api/timesheet/check-in') && init?.method === 'POST') {
        open = { id: SESSION_ID, checkInAt: '2026-11-08T01:00:00.000Z', checkOutAt: null, workedMinutes: null }
        return json({ shift: open }, 201)
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const checkIn = await screen.findByRole('button', { name: 'Check-in' })
    await waitFor(() => expect(checkIn.hasAttribute('disabled')).toBe(false))
    fireEvent.click(checkIn)
    expect(await screen.findByText('Bạn đang trong ca')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Check-out' })).toBeTruthy()
    expect(screen.getByText('Đang trong ca')).toBeTruthy()
  })

  it('shows the admin monthly report and flattens it for the Excel export', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me')) return json({ user: { id: TEACHER_ID, phoneNumber: '0901234567', role: 'admin' } })
      if (url.endsWith('/api/branches')) return json({ branches: [] })
      if (url.includes('/api/reports/work-hours')) return json(report)
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const teachers = await screen.findByRole('region', { name: 'Giáo viên' })
    expect(teachers.textContent).toContain('Nguyễn Thu Hà')
    expect(teachers.textContent).toContain('0911000001')
    expect(teachers.textContent).toContain('4.5 giờ')
    expect(screen.getByText('Bù')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('button', { name: /Xuất Excel/ }).hasAttribute('disabled')).toBe(false))
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('month='))).toBe(true)

    const [teacherSheet, staffSheet, detailSheet] = workHoursToSheets(report)
    expect(teacherSheet?.rows[1]).toEqual(['2026-11', '0911000001', 'Nguyễn Thu Hà', 3, 3, 1, 1, 0, 4.5])
    expect(staffSheet?.rows[1]).toEqual(['2026-11', '0912000001', '', 'staff', 2, 16, 0])
    expect(detailSheet?.rows[1]?.slice(6)).toEqual(['Đã dạy', 'Có', ''])
  })
})
