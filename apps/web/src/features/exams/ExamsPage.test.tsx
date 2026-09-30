import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExamsPage } from './ExamsPage'

const EXAM_ID = '11111111-1111-1111-1111-111111111111'
const QUESTION_ID = '22222222-2222-2222-2222-222222222222'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function examList() {
  return {
    exams: [
      {
        id: EXAM_ID,
        title: 'Starter Reading',
        levelId: '33333333-3333-3333-3333-333333333333',
        levelCode: 'starter',
        skill: 'reading',
        questionCount: 1,
        durationMinutes: 10,
        opensAt: '2026-09-27T00:00:00.000Z',
        closesAt: '2026-09-28T00:00:00.000Z',
        createdBy: '44444444-4444-4444-4444-444444444444',
        createdAt: '2026-09-27T00:00:00.000Z',
      },
    ],
  }
}

function attempt(status: 'in_progress' | 'submitted', deadlineAt: string) {
  return {
    attempt: {
      examId: EXAM_ID,
      examTitle: 'Starter Reading',
      durationMinutes: 10,
      status,
      startedAt: '2026-09-27T00:00:00.000Z',
      deadlineAt,
      submittedAt: status === 'submitted' ? '2026-09-27T00:05:00.000Z' : null,
      questions: [
        {
          id: QUESTION_ID,
          questionText: 'What color is the sky?',
          questionType: 'multiple_choice',
          skill: 'reading',
          points: 1,
          options: ['Blue', 'Green'],
        },
      ],
      answers: status === 'submitted' ? { [QUESTION_ID]: 'Blue' } : {},
    },
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ExamsPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('bat dau, chon dap an va nop bai', async () => {
    let submittedBody: unknown
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(`/api/exams/${EXAM_ID}/attempts`))
          return response(attempt('in_progress', new Date(Date.now() + 60_000).toISOString()))
        if (url.endsWith(`/api/exams/${EXAM_ID}/submit`)) {
          submittedBody = JSON.parse(String(init?.body))
          return response(attempt('submitted', new Date(Date.now() + 60_000).toISOString()))
        }
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    await screen.findByText(/What color is the sky/)
    fireEvent.click(screen.getByLabelText('Blue'))
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }))
    await screen.findByText(/Đã nộp bài thành công/)
    expect(submittedBody).toEqual({ answers: { [QUESTION_ID]: 'Blue' } })
  })

  it('tu dong nop khi deadline da het', async () => {
    let submitCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(`/api/exams/${EXAM_ID}/attempts`))
          return response(attempt('in_progress', new Date(Date.now() - 1000).toISOString()))
        if (url.endsWith(`/api/exams/${EXAM_ID}/submit`)) {
          submitCalls += 1
          return response(attempt('submitted', new Date(Date.now() - 1000).toISOString()))
        }
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    await screen.findByText(/Hết giờ — bài đã được tự động nộp/)
    expect(submitCalls).toBe(1)
  })

  it('hien trang thai da nop va khong cho nop lai', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(`/api/exams/${EXAM_ID}/attempts`))
          return response(attempt('submitted', new Date().toISOString()))
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    await screen.findByText(/Bạn không thể làm lại đề này/)
    expect(screen.queryByRole('button', { name: 'Nộp bài' })).not.toBeInTheDocument()
  })
})
