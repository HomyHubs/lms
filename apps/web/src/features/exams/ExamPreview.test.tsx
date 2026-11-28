import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Exam } from '@lms/shared'
import { ExamPreview } from './ExamPreview'

/**
 * slice-20: xem trước đề có nhiều bộ liên kết. Trước đây gọi `getExamSet` cho TỪNG bộ (N+1) — test
 * này khoá lại việc chỉ còn MỘT request, và thứ tự hiển thị theo `examSetIds` (thứ tự làm bài)
 * chứ không theo thứ tự API trả về.
 */

const SET_A = '11111111-1111-4111-8111-111111111111'
const SET_B = '22222222-2222-4222-8222-222222222222'

const EXAM: Exam = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Đề giữa kỳ',
  levelId: '44444444-4444-4444-8444-444444444444',
  levelCode: 'starter',
  skill: 'reading',
  questionCount: 20,
  durationMinutes: 40,
  opensAt: '2026-11-01T00:00:00.000Z',
  closesAt: '2026-11-30T00:00:00.000Z',
  passPercent: 50,
  maxAttempts: 2,
  retakeCooldownMinutes: 0,
  mode: 'fixed_set',
  examSetIds: [SET_A, SET_B],
  classIds: [],
  shuffleQuestions: false,
  shuffleOptions: false,
  retakeStrategy: 'same_set_shuffled',
  createdBy: '55555555-5555-4555-8555-555555555555',
  createdAt: '2026-11-01T00:00:00.000Z',
}

const setSummary = (id: string, title: string, itemCount: number) => ({
  id,
  title,
  levelId: EXAM.levelId,
  levelCode: 'starter',
  skill: 'reading',
  description: null,
  status: 'published',
  itemCount,
  createdBy: EXAM.createdBy,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  publishedAt: '2026-11-01T00:00:00.000Z',
})

function renderPreview(): string[] {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      // Cố tình trả NGƯỢC thứ tự để chứng minh FE sắp theo `examSetIds`, không theo API.
      return {
        ok: true,
        status: 200,
        json: async () => ({
          examSets: [setSummary(SET_B, 'Bộ số 2', 5), setSummary(SET_A, 'Bộ số 1', 10)],
        }),
      }
    }),
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ExamPreview exam={EXAM} onClose={() => {}} />
    </QueryClientProvider>,
  )
  return calls
}

describe('ExamPreview — bộ đề liên kết', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads every linked set with a single request', async () => {
    const calls = renderPreview()
    expect(await screen.findByText(/1\. Bộ số 1/)).toBeInTheDocument()
    // Một request cho cả 2 bộ, không phải 2 request. `URLSearchParams` mã hoá dấu phẩy thành %2C
    // nên giải mã trước khi so.
    expect(calls).toHaveLength(1)
    expect(decodeURIComponent(calls[0]!)).toContain(`ids=${SET_A},${SET_B}`)
  })

  it('keeps the serving order of examSetIds and shows the item count', async () => {
    renderPreview()
    expect(await screen.findByText(/1\. Bộ số 1/)).toBeInTheDocument()
    expect(screen.getByText(/2\. Bộ số 2/)).toBeInTheDocument()
    expect(screen.getByText('10 câu')).toBeInTheDocument()
    expect(screen.getByText('5 câu')).toBeInTheDocument()
  })

  it('does not request sets when the exam draws randomly', () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        calls.push(String(input))
        return { ok: true, status: 200, json: async () => ({ examSets: [] }) }
      }),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ExamPreview exam={{ ...EXAM, mode: 'random', examSetIds: [] }} onClose={() => {}} />
      </QueryClientProvider>,
    )
    expect(screen.queryByText('Bộ đề liên kết')).toBeNull()
    expect(calls).toHaveLength(0)
  })
})
