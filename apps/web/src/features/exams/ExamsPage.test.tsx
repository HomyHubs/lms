import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExamsPage } from './ExamsPage'

vi.mock('@/features/auth/useAuth', () => ({ useSession: () => ({ user: { role: 'student' } }) }))

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
        passPercent: 60,
        maxAttempts: 2,
        retakeCooldownMinutes: 0,
        opensAt: '2026-09-27T00:00:00.000Z',
        closesAt: '2026-09-28T00:00:00.000Z',
        createdBy: '44444444-4444-4444-4444-444444444444',
        createdAt: '2026-09-27T00:00:00.000Z',
      },
    ],
  }
}

function attempt(status: 'in_progress' | 'submitted', deadlineAt: string, extra: Record<string, unknown> = {}) {
  return {
    attempt: {
      ...extra,
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

const notStarted = () => response({ error: 'Chua bat dau lam bai' }, 404)

/** In-progress attempt whose server copy already holds 'Blue' at the given revision. */
function answeredAttempt(revision: number) {
  const base = attempt('in_progress', new Date(Date.now() + 60_000).toISOString())
  return { attempt: { ...base.attempt, answers: { [QUESTION_ID]: 'Blue' }, revision } }
}
const CURRENT = `/api/exams/${EXAM_ID}/attempt`

function graded(score: number, passed: boolean) {
  return { status: 'graded', score, maxScore: 1, percent: score * 100, passPercent: 60, passed,
    gradedAt: '2026-09-27T00:05:00.000Z' }
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
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  })

  it('bat dau, chon dap an va nop bai', async () => {
    let submittedBody: unknown
    let checkpointBody: unknown
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(CURRENT)) return notStarted()
        if (url.endsWith(`/api/exams/${EXAM_ID}/attempts`))
          return response(attempt('in_progress', new Date(Date.now() + 60_000).toISOString()))
        if (url.endsWith(`/api/exams/${EXAM_ID}/submit`)) {
          submittedBody = JSON.parse(String(init?.body))
          return response(attempt('submitted', new Date(Date.now() + 60_000).toISOString()))
        }
        if (url.endsWith('/answers')) {
          checkpointBody = JSON.parse(String(init?.body))
          const saved = attempt('in_progress', new Date(Date.now() + 60_000).toISOString())
          return response({ attempt: { ...saved.attempt, answers: { [QUESTION_ID]: 'Blue' }, revision: 1 } })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    await screen.findByText(/What color is the sky/)
    expect(screen.getByText('Đã trả lời 0/1 câu')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Blue'))
    await screen.findByText('Đã lưu đáp án')
    expect(checkpointBody).toEqual({ answers: { [QUESTION_ID]: 'Blue' }, revision: 0 })
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
        if (url.endsWith(CURRENT)) return notStarted()
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
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    await screen.findByText(/Hết giờ — bài đã được tự động nộp/)
    expect(submitCalls).toBe(1)
  })

  it('mo lai de da nop thi xem ket qua, khong tu sinh luot moi', async () => {
    let starts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(`/api/exams/${EXAM_ID}/attempts`)) starts += 1
        if (url.endsWith(CURRENT))
          return response(attempt('submitted', new Date().toISOString(), {
            result: graded(1, true),
            retake: { available: false, reason: 'passed', nextAttemptNumber: null, availableAt: null,
              attemptsUsed: 1, maxAttempts: 2 },
          }))
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    await screen.findByText(/Điểm: 1\/1 \(100%\)/)
    expect(starts).toBe(0)
    expect(screen.getByText('ĐẠT')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nộp bài' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Thi lại/ })).not.toBeInTheDocument()
  })

  it('truot thi hien diem va cho thi lai lan 2', async () => {
    let starts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(CURRENT))
          return response(attempt('submitted', new Date().toISOString(), {
            result: { ...graded(0, false), feedback: 'Can luyen them' },
            retake: { available: true, reason: 'retake_ready', nextAttemptNumber: 2,
              availableAt: new Date(Date.now() - 1000).toISOString(), attemptsUsed: 1, maxAttempts: 2 },
          }))
        if (url.endsWith(`/api/exams/${EXAM_ID}/attempts`)) {
          starts += 1
          return response(attempt('in_progress', new Date(Date.now() + 60_000).toISOString(), { attemptNumber: 2 }))
        }
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    await screen.findByText('CHƯA ĐẠT')
    expect(starts).toBe(0)
    expect(screen.getByText(/Điểm: 0\/1 \(0%\)/)).toBeInTheDocument()
    expect(screen.getByText('Nhận xét của giáo viên: Can luyen them')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thi lại (lần 2)' }))
    await screen.findByRole('button', { name: 'Nộp bài' })
    expect(starts).toBe(1)
  })

  it('hoi xac nhan khi con cau chua tra loi', async () => {
    let submitCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(CURRENT)) return notStarted()
        if (url.endsWith(`/api/exams/${EXAM_ID}/attempts`))
          return response(attempt('in_progress', new Date(Date.now() + 60_000).toISOString()))
        if (url.endsWith(`/api/exams/${EXAM_ID}/submit`)) {
          submitCalls += 1
          return response(attempt('submitted', new Date(Date.now() + 60_000).toISOString()))
        }
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Nộp bài' }))
    expect(screen.getByRole('alertdialog', { name: 'Xác nhận nộp bài' })).toHaveTextContent('Còn 1 câu chưa trả lời')
    expect(submitCalls).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Vẫn nộp bài' }))
    await screen.findByText(/Đã nộp bài thành công/)
    expect(submitCalls).toBe(1)
  })

  it('danh dau cau xem lai, dieu huong toi cau va hoi lai khi nop', async () => {
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(CURRENT))
          return response(answeredAttempt(1))
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    // Các lookup phụ thuộc fetch (danh sách đề, rồi UI làm bài sau khi tải attempt) có thể
    // vượt 1000ms mặc định của findBy khi chạy test song song -> nới timeout chống flaky.
    await screen.findByText('Starter Reading', undefined, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    const flag = await screen.findByRole(
      'button',
      { name: 'Đánh dấu xem lại câu 1' },
      { timeout: 5000 },
    )
    expect(flag).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(flag)
    expect(flag).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Đánh dấu xem lại: 1 câu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Câu 1, đã trả lời, xem lại' }))
    expect(scrolled).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }))
    expect(screen.getByRole('alertdialog', { name: 'Xác nhận nộp bài' })).toHaveTextContent('1 câu đánh dấu xem lại')
  })

  it('khoi phuc dap an luu tren may khi vao lai va gui len may chu', async () => {
    window.localStorage.setItem(`lms.examDraft:${EXAM_ID}:2026-09-27T00:00:00.000Z`,
      JSON.stringify({ answers: { [QUESTION_ID]: 'Green' }, flagged: [QUESTION_ID], revision: 0 }))
    let checkpointBody: unknown
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(CURRENT)) return response(attempt('in_progress', new Date(Date.now() + 60_000).toISOString()))
        if (url.endsWith('/answers')) {
          checkpointBody = JSON.parse(String(init?.body))
          const saved = attempt('in_progress', new Date(Date.now() + 60_000).toISOString())
          return response({ attempt: { ...saved.attempt, answers: { [QUESTION_ID]: 'Green' }, revision: 1 } })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    await screen.findByText('Đã lưu đáp án')
    expect(checkpointBody).toEqual({ answers: { [QUESTION_ID]: 'Green' }, revision: 0 })
    expect(screen.getByLabelText('Green')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Đánh dấu xem lại câu 1' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('bo qua ban nhap cu hon ban tren may chu', async () => {
    window.localStorage.setItem(`lms.examDraft:${EXAM_ID}:2026-09-27T00:00:00.000Z`,
      JSON.stringify({ answers: { [QUESTION_ID]: 'Green' }, flagged: [], revision: 0 }))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(CURRENT))
          return response(answeredAttempt(2))
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    await screen.findByRole('radio', { name: 'Blue', checked: true })
    expect(screen.queryByText(/Đã khôi phục/)).not.toBeInTheDocument()
  })

  it('mat mang thi giu tam dap an va gui lai khi co mang', async () => {
    let checkpointCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/exams') && !init?.method) return response(examList())
        if (url.endsWith(CURRENT)) return response(attempt('in_progress', new Date(Date.now() + 60_000).toISOString()))
        if (url.endsWith('/answers')) {
          checkpointCalls += 1
          if (checkpointCalls === 1) throw new TypeError('Failed to fetch')
          const saved = attempt('in_progress', new Date(Date.now() + 60_000).toISOString())
          return response({ attempt: { ...saved.attempt, answers: { [QUESTION_ID]: 'Blue' }, revision: 1 } })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )
    renderPage()
    await screen.findByText('Starter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Vào thi' }))
    fireEvent.click(await screen.findByLabelText('Blue'))
    await screen.findByText(/Mất kết nối/)
    // Ban nhap duoc ghi xuong localStorage bat dong bo sau khi checkpoint that bai,
    // nen cho toi khi no duoc luu thay vi doc ngay (tranh race khi chay cung ca suite).
    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(`lms.examDraft:${EXAM_ID}:2026-09-27T00:00:00.000Z`) ?? '{}',
      )
      expect(stored.answers).toEqual({ [QUESTION_ID]: 'Blue' })
    })
    fireEvent(window, new Event('online'))
    await screen.findByText('Đã lưu đáp án')
    expect(checkpointCalls).toBe(2)
  })
})
