import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiQuestionsPage } from './AiQuestionsPage'

const REQUEST_ID = 'a0000000-0000-4000-8000-000000000001'
const ITEM_ID = 'b0000000-0000-4000-8000-000000000001'
const SAMPLE_ID = 'c0000000-0000-4000-8000-000000000001'
const AI_ROW = {
  level: 'starter',
  skill: 'reading',
  question_type: 'multiple_choice',
  difficulty: 'easy',
  question_text: 'Which one is an animal?',
  options: ['Dog', 'Table'],
  correct_answer: 'Dog',
}

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body }
}

/** Minimal stateful backend for one request moving draft -> imported -> reviewed -> saved_to_bank. */
function stubBackend() {
  let status = 'draft'
  let itemStatus = 'pending'
  let hasItems = false
  const request = () => ({
    id: REQUEST_ID,
    createdBy: '70000000-0000-4000-8000-000000000001',
    levelCode: 'starter',
    skill: 'reading',
    questionType: null,
    difficulty: null,
    count: 10,
    sampleQuestionIds: [SAMPLE_ID],
    prompt: 'Write exactly 10 NEW reading questions',
    status,
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z',
  })
  const detail = () => ({
    request: request(),
    items: hasItems ? [{ id: ITEM_ID, position: 1, row: AI_ROW, status: itemStatus, questionId: null }] : [],
  })
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/api/questions')) {
      return json({
        questions: [
          {
            id: SAMPLE_ID,
            levelId: SAMPLE_ID,
            levelCode: 'starter',
            skill: 'reading',
            questionType: 'multiple_choice',
            difficulty: 'easy',
            questionText: 'Which one is a fruit?',
            options: ['Apple', 'Car'],
            correctAnswer: 'Apple',
            points: 1,
            explanation: null,
            sourceReference: null,
            source: 'manual',
            createdAt: '2026-11-01T00:00:00.000Z',
          },
        ],
      })
    }
    if (url.endsWith('/api/ai-requests') && method === 'GET') {
      return json({ requests: status === 'draft' && !hasItems ? [] : [request()] })
    }
    if (url.endsWith('/api/ai-requests') && method === 'POST') return json(detail(), 201)
    if (url.endsWith(`/api/ai-requests/${REQUEST_ID}`)) return json(detail())
    if (url.endsWith('/results')) {
      hasItems = true
      status = 'imported'
      return json(detail())
    }
    if (url.endsWith(`/items/${ITEM_ID}`)) {
      itemStatus = JSON.parse(String(init?.body)).status
      status = 'reviewed'
      return json(detail())
    }
    if (url.endsWith('/save')) {
      status = 'saved_to_bank'
      itemStatus = 'saved'
      return json({ ...detail(), saved: 1 })
    }
    throw new Error(`unexpected fetch: ${method} ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function bodyOf(fetchMock: ReturnType<typeof stubBackend>, suffix: string): unknown {
  const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith(suffix) && init?.method)
  return JSON.parse(String(call?.[1]?.body))
}

describe('AiQuestionsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('generates a prompt with a bank sample, imports pasted JSON, approves and saves it', async () => {
    const fetchMock = stubBackend()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AiQuestionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByLabelText('Which one is a fruit?'))
    fireEvent.click(screen.getByRole('button', { name: 'Sinh prompt' }))
    expect(await screen.findByLabelText('Prompt')).toHaveValue('Write exactly 10 NEW reading questions')
    expect(bodyOf(fetchMock, '/api/ai-requests')).toEqual({
      level: 'starter',
      skill: 'reading',
      count: 10,
      sampleQuestionIds: [SAMPLE_ID],
    })

    fireEvent.change(screen.getByLabelText('Kết quả từ AI'), {
      target: { value: '```json\n' + JSON.stringify([AI_ROW]) + '\n```' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Đưa vào hàng chờ duyệt' }))
    expect(await screen.findByText('Which one is an animal?')).toBeInTheDocument()
    expect(bodyOf(fetchMock, '/results')).toEqual({ rows: [AI_ROW] })
    expect(screen.getByRole('button', { name: 'Lưu vào ngân hàng' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt câu 1' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu vào ngân hàng' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Lưu vào ngân hàng' }))

    expect(await screen.findByText('Đã lưu 1 câu hỏi vào ngân hàng (nguồn AI)')).toBeInTheDocument()
    expect(bodyOf(fetchMock, `/items/${ITEM_ID}`)).toEqual({ status: 'approved' })
  })

  it('shows a parse error and sends nothing when the pasted text is not valid JSON', async () => {
    const fetchMock = stubBackend()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AiQuestionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Sinh prompt' }))
    fireEvent.change(await screen.findByLabelText('Kết quả từ AI'), { target: { value: '[{"level": ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đưa vào hàng chờ duyệt' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('JSON không hợp lệ')
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/results'))).toBe(false)
  })
})
