import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExamAttemptReport, ExamHistoryRow } from '@lms/shared'
import { ExamHistoryPage } from './ExamHistoryPage'
import { ExamReportsPage } from './ExamReportsPage'

const EXAM_ID = '40000000-0000-4000-8000-000000000001'
const STUDENT_ID = '20000000-0000-4000-8000-000000000001'

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })

const row = (n: number, overrides: Partial<ExamHistoryRow> = {}): ExamHistoryRow => ({
  attemptId: `80000000-0000-4000-8000-00000000000${n}`,
  examId: EXAM_ID,
  examTitle: 'Starter Reading',
  levelCode: 'starter',
  skill: 'reading',
  mode: 'random',
  examSetTitle: null,
  attemptNumber: n,
  startedAt: '2026-11-12T17:30:00.000Z',
  submittedAt: '2026-11-12T18:00:00.000Z',
  durationSeconds: 1800,
  submitReason: 'manual',
  score: 8,
  maxScore: 10,
  percent: 80,
  passed: true,
  status: 'graded',
  ...overrides,
})

function renderPage(page: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('ExamHistoryPage', () => {
  it('lists own attempts in local time with submit reason and loads the next page by cursor', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('cursor=')
        ? json({ attempts: [row(1, { passed: false, percent: 30, score: 3, submitReason: 'deadline_auto' })], nextCursor: null })
        : json({ attempts: [row(2)], nextCursor: 'c1' }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage(<ExamHistoryPage />)

    expect(await screen.findByText('Lần 2')).toBeInTheDocument()
    expect(screen.getAllByText(/13\/11/).length).toBeGreaterThan(0)
    expect(screen.getByText('30 phút 0 giây')).toBeInTheDocument()
    expect(screen.getByText('Tự nộp')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm' }))
    expect(await screen.findByText('Không đạt')).toBeInTheDocument()
    expect(screen.getByText('Hết giờ, tự nộp')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/me/exam-attempts?cursor=c1', { credentials: 'include' })
    expect(screen.queryByRole('button', { name: 'Tải thêm' })).not.toBeInTheDocument()
  })
})

describe('ExamReportsPage', () => {
  it('shows per-exam pass rates and opens a student history', async () => {
    const report: ExamAttemptReport = {
      byExam: [
        {
          examId: EXAM_ID, examTitle: 'Starter Reading', levelCode: 'starter', students: 1, attempts: 2, retakes: 1,
          firstAttemptPassRate: 0, finalPassRate: 100, averagePercent: 55, bestPercent: 80,
        },
      ],
      attempts: [{ ...row(2), studentId: STUDENT_ID, studentPhone: '0933000001' }],
    }
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('/api/reports/exam-attempts')) return json(report)
      if (url.startsWith(`/api/students/${STUDENT_ID}/exam-attempts`)) return json({ attempts: [row(1), row(2)], nextCursor: null })
      return json([])
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage(<ExamReportsPage />)

    expect(await screen.findByText('100%')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '0933000001' }))
    expect(await screen.findByText('Lịch sử thi của 0933000001')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('Lần 1').length).toBe(1))

    fireEvent.click(screen.getByRole('button', { name: 'Starter Reading' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(`/api/reports/exam-attempts?examId=${EXAM_ID}`, { credentials: 'include' }),
    )
  })
})
