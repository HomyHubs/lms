import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExamSetDetail, ExamSetImportPreview, Question } from '@lms/shared'
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
  const previews: ExamSetImportPreview[] = []
  const uploads: { url: string; type: string | null }[] = []
  const commits: unknown[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/exams') return json({ exams: [] })
    if (url === '/api/questions') return json({ questions: [Q1, Q2] })
    if (url.startsWith('/api/exam-sets/import/preview?')) {
      uploads.push({ url, type: new Headers(init?.headers).get('content-type') })
      return json(previews.shift())
    }
    if (url === '/api/exam-sets/import/commit') {
      commits.push(JSON.parse(String(init?.body)))
      return json({ examSet: set }, 201)
    }
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
  return { puts, previews, uploads, commits }
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
    // Mở bộ đề kích hoạt tải song song (chi tiết bộ đề + ngân hàng câu hỏi); nút "Thêm"
    // chỉ render sau khi query ngân hàng xong. Dưới tải test song song, 1000ms mặc định của
    // findBy có thể hụt -> cho timeout rộng hơn cho các lookup phụ thuộc fetch (chống flaky).
    fireEvent.click(await screen.findByRole('button', { name: 'Mở' }, { timeout: 5000 }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Thêm: Question 2' }, { timeout: 5000 }),
    )
    await waitFor(() => expect(puts).toEqual([[Q1.id, Q2.id]]), { timeout: 5000 })
    fireEvent.click(await screen.findByRole('button', { name: 'Lên câu 2' }, { timeout: 5000 }))
    await waitFor(() => expect(puts[1]).toEqual([Q2.id, Q1.id]), { timeout: 5000 })
    const items = within(screen.getByRole('list', { name: 'Câu hỏi trong bộ đề' }))
    await waitFor(
      () =>
        expect(items.getAllByText(/^Câu \d\./).map((n) => n.textContent)).toEqual([
          'Câu 1. Question 2',
          'Câu 2. Question 1',
        ]),
      { timeout: 5000 },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Phát hành' }))
    expect(await screen.findByText(/không thể sửa/, undefined, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lên câu 2' })).toBeNull()
    expect(screen.queryByRole('form', { name: 'Soạn câu hỏi' })).toBeNull()
  })

  it('imports a file: preview with errors blocks confirm, a clean preview commits and opens the editor', async () => {
    const { previews, uploads, commits } = fakeBackend()
    const item = { order: 1, questionType: 'multiple_choice' as const, difficulty: 'medium' as const,
      questionText: 'Pick the animal', options: ['cat', 'car'], correctAnswer: 'a', points: 1, explanation: null,
      warnings: [], imageRefs: ['rId5'], mediaIds: ['00000000-0000-4000-8000-000000000001'] }
    const base = { title: 'Bo import', level: 'starter' as const, skill: 'reading' as const, format: 'docx' as const, warnings: [] }
    previews.push(
      { ...base, items: [item], errors: [{ block: 2, row: null, field: 'correct_answer', message: 'thiếu dòng Đáp án' }] },
      { ...base, items: [item], errors: [] },
    )
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Import từ Word/Excel' }))
    const form = within(screen.getByRole('form', { name: 'Import bộ đề từ file' }))
    fireEvent.change(form.getByLabelText('Tên bộ đề'), { target: { value: 'Bo import' } })
    const file = new File(['PK'], 'de.docx')
    fireEvent.change(form.getByLabelText(/File đề/), { target: { files: [file] } })

    fireEvent.click(form.getByRole('button', { name: 'Xem trước' }))
    expect(await screen.findByText('Câu 2 · correct_answer: thiếu dòng Đáp án')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xác nhận import' })).toBeDisabled()
    expect(uploads[0]).toMatchObject({ type: 'application/octet-stream' })
    expect(uploads[0]!.url).toContain('fileName=de.docx')

    fireEvent.click(form.getByRole('button', { name: 'Xem trước' }))
    expect(await screen.findByText('a. cat ✓')).toBeTruthy()
    expect(screen.getByAltText('Hình câu 1 (1)')).toHaveAttribute('src', '/api/media/00000000-0000-4000-8000-000000000001')
    const confirm = screen.getByRole('button', { name: 'Xác nhận import' })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(commits).toHaveLength(1))
    expect(commits[0]).toMatchObject({ title: 'Bo import', level: 'starter', skill: 'reading',
      items: [{ questionText: 'Pick the animal', options: ['cat', 'car'], correctAnswer: 'a',
        mediaIds: ['00000000-0000-4000-8000-000000000001'] }] })
    expect(await screen.findByRole('list', { name: 'Câu hỏi trong bộ đề' })).toBeTruthy()
    expect(screen.queryByRole('form', { name: 'Import bộ đề từ file' })).toBeNull()
  })
})
