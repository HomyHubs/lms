import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ManualGradingAttempt, ManualGradingItem } from '@lms/shared'
import { GradingPage } from './GradingPage'

const ATTEMPT_ID = '80000000-0000-4000-8000-000000000001'
const Q1 = '30000000-0000-4000-8000-000000000001'
const Q2 = '30000000-0000-4000-8000-000000000002'

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })

const item: ManualGradingItem = {
  attemptId: ATTEMPT_ID,
  examId: '40000000-0000-4000-8000-000000000001',
  examTitle: 'Writing Starter',
  levelCode: 'starter',
  skill: 'writing',
  studentId: '20000000-0000-4000-8000-000000000001',
  studentPhone: '0933000001',
  attemptNumber: 1,
  submittedAt: '2026-11-10T03:00:00.000Z',
  maxScore: 5,
}

const question = (id: string, text: string, points: number, answer: string | null) => ({
  id, questionText: text, questionType: 'fill_blank' as const, skill: 'writing' as const, points, options: null, answer,
})

const attempt: ManualGradingAttempt = {
  ...item,
  passPercent: 50,
  questions: [
    { ...question(Q1, 'Describe your family', 3, 'I have two sisters.'), stemImages: ['/api/media/m1'] },
    question(Q2, 'Your hobby', 2, null),
  ],
  result: null,
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GradingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GradingPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('grades a queued attempt per question with feedback and empties the queue', async () => {
    let graded = false
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/grading/attempts')) return json({ attempts: graded ? [] : [item] })
      if (url.endsWith(`/api/grading/attempts/${ATTEMPT_ID}`)) return json({ attempt })
      if (url.endsWith(`/api/grading/attempts/${ATTEMPT_ID}/grade`) && init?.method === 'POST') {
        graded = true
        const result = { status: 'graded', score: 2, maxScore: 5, percent: 40, passPercent: 50, passed: false,
          gradedAt: '2026-11-10T04:00:00.000Z', feedback: 'Viet dai hon' }
        return json({ attempt: { ...attempt, result } })
      }
      return json({ error: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Chấm' }))
    expect(await screen.findByText('I have two sisters.')).toBeInTheDocument()
    expect(screen.getByText('(Học viên không trả lời)')).toBeInTheDocument()
    expect(screen.getByAltText('Hình câu 1')).toHaveAttribute('src', '/api/media/m1')
    expect(screen.queryByAltText('Hình câu 2')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Điểm câu 1'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Điểm câu 2'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Nhận xét cho học viên'), { target: { value: 'Viet dai hon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điểm' }))

    expect(await screen.findByText(/Đã lưu điểm 2\/5 cho 0933000001/)).toBeInTheDocument()
    expect(screen.getByText('Chưa đạt')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ scores: { [Q1]: 2, [Q2]: 0 }, feedback: 'Viet dai hon' })
    await waitFor(() => expect(screen.getByText('Không còn bài nào chờ chấm.')).toBeInTheDocument())
  })
})
