import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExamSetDetail, Question } from '@lms/shared'
import { ExamSetsPage } from './ExamSetsPage'

const SET_ID = '50000000-0000-4000-8000-000000000001'
const LEVEL_ID = '10000000-0000-4000-8000-000000000001'
const USER = '20000000-0000-4000-8000-000000000001'
const T = '2026-11-12T00:00:00.000Z'

const question = (n: number): Question => ({
  id: `30000000-0000-4000-8000-00000000000${n}`, levelId: LEVEL_ID, levelCode: 'starter', skill: 'reading',
  questionType: 'multiple_choice', difficulty: 'easy', questionText: `Question ${n}`, options: ['cat', 'dog'],
  correctAnswer: 'b', points: 1, explanation: null, sourceReference: null, source: 'manual', createdAt: T,
})
const Q1 = question(1)
const Q2 = question(2)

const json = (body: unknown, status = 200) => Response.json(body, { status })

function fakeBackend() {
  const set: ExamSetDetail = { id: SET_ID, title: 'Bo A', levelId: LEVEL_ID, levelCode: 'starter', skill: 'reading',
    description: null, status: 'draft', itemCount: 1, createdBy: USER, createdAt: T, updatedAt: T, publishedAt: null,
    items: [Q1] }
  const puts: string[][] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/exams') return json({ exams: [] })
    if (url === '/api/questions') return json({ questions: [Q1, Q2] })
    if (url.startsWith('/api/exam-sets?') || url === '/api/exam-sets') return json({ examSets: [{ ...set, items: undefined }] })
    if (url === `/api/exam-sets/${SET_ID}/items` && init?.method === 'PUT') {
      const ids = (JSON.parse(String(init.body)) as { questionIds: string[] }).questionIds
      puts.push(ids)
      set.items = ids.map((id) => [Q1, Q2].find((q) => q.id === id)!)
      set.itemCount = ids.length
      return json({ examSet: set })
    }
    if (url === `/api/exam-sets/${SET_ID}/publish`) {
      Object.assign(set, { status: 'published', publishedAt: T })
      return json({ examSet: set })
    }
    if (url === `/api/exam-sets/${SET_ID}`) return json({ examSet: set })
    return json({ error: `unexpected ${url}` }, 500)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { puts }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><ExamSetsPage /></QueryClientProvider>)
}

describe('ExamSetsPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('adds a bank question, reorders, publishes and then locks editing', async () => {
    const { puts } = fakeBackend()
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Mở' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm: Question 2' }))
    await waitFor(() => expect(puts).toEqual([[Q1.id, Q2.id]]))
    fireEvent.click(await screen.findByRole('button', { name: 'Lên câu 2' }))
    await waitFor(() => expect(puts[1]).toEqual([Q2.id, Q1.id]))
    const items = within(screen.getByRole('list', { name: 'Câu hỏi trong bộ đề' }))
    await waitFor(() => expect(items.getAllByText(/^Câu \d\./).map((n) => n.textContent)).toEqual(['Câu 1. Question 2', 'Câu 2. Question 1']))

    fireEvent.click(screen.getByRole('button', { name: 'Phát hành' }))
    expect(await screen.findByText(/không thể sửa/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lên câu 2' })).toBeNull()
    expect(screen.queryByRole('form', { name: 'Soạn câu hỏi' })).toBeNull()
  })
})
