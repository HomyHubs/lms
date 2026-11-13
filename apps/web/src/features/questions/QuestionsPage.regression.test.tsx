import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IMPORT_COLUMNS, type Question } from '@lms/shared'
import { QuestionsPage } from './QuestionsPage'

const first: Question = {
  id: '11111111-1111-4111-8111-111111111111',
  levelId: '22222222-2222-4222-8222-222222222222',
  levelCode: 'starter',
  skill: 'reading',
  questionType: 'fill_blank',
  difficulty: 'easy',
  questionText: 'First question',
  options: null,
  correctAnswer: 'answer',
  points: 1,
  explanation: 'Old explanation',
  sourceReference: 'Old source',
  createdAt: '2026-11-02T00:00:00Z',
}
const second = {
  ...first,
  id: '33333333-3333-4333-8333-333333333333',
  levelCode: 'mover',
  difficulty: 'hard',
  questionText: 'Second question',
}

function setup(failImport = false) {
  let questions = [first, second]
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      const input = JSON.parse(String(init.body))
      questions = questions.map((q) =>
        q.id === first.id ? { ...q, ...input, levelCode: input.level } : q,
      )
      return new Response(JSON.stringify({ question: questions[0] }))
    }
    if (String(url).endsWith('/import'))
      return new Response(
        JSON.stringify(
          failImport
            ? {
                error: 'Invalid import',
                errors: [{ row: 1, field: 'points', message: 'Wrong points' }],
              }
            : { imported: 1, questions: [first] },
        ),
        { status: failImport ? 400 : 200 },
      )
    return new Response(JSON.stringify({ questions }))
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <QuestionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return fetchMock
}
function upload(text: string) {
  const file = new File([text], 'questions.csv', { type: 'text/csv' })
  Object.defineProperty(file, 'text', { value: async () => text })
  fireEvent.change(screen.getByLabelText('Chọn file CSV'), { target: { files: [file] } })
}
afterEach(() => vi.unstubAllGlobals())

describe('question UI with real hooks/client/parser', () => {
  it('edits existing data, saves metadata, clears nullable fields and refreshes list', async () => {
    const fetchMock = setup()
    await screen.findByText('First question')
    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]!)
    expect(screen.getByLabelText('Giải thích')).toHaveValue('Old explanation')
    expect(screen.getByLabelText('Nguồn tham khảo')).toHaveValue('Old source')
    fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'), {
      target: { value: 'Edited question' },
    })
    fireEvent.change(screen.getByLabelText('Giải thích'), { target: { value: 'New explanation' } })
    fireEvent.change(screen.getByLabelText('Nguồn tham khảo'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await screen.findByText('Edited question')
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      explanation: 'New explanation',
      sourceReference: null,
      options: null,
    })
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument()
  })
  it('filters within a level panel and resets the displayed list', async () => {
    // slice-18: mỗi cấp độ là một panel riêng (Starter/Mover/Flyer); lọc theo cột
    // nằm trong từng panel. 'First question' (starter) ở panel Starter, 'Second
    // question' (mover) ở panel Mover.
    setup()
    await screen.findByText('First question')
    expect(screen.getByText('Second question')).toBeInTheDocument()
    // Lọc độ khó trong panel Starter: chỉ còn câu 'easy' (First question) trong panel đó;
    // chọn 'hard' sẽ ẩn First question khỏi panel Starter.
    fireEvent.change(screen.getByLabelText('Lọc độ khó Starter'), { target: { value: 'hard' } })
    expect(screen.queryByText('First question')).not.toBeInTheDocument()
    // Panel Mover không bị ảnh hưởng bởi bộ lọc của panel Starter.
    expect(screen.getByText('Second question')).toBeInTheDocument()
    // Lọc văn bản trong panel Mover ẩn nốt Second question.
    fireEvent.change(screen.getByLabelText('Lọc câu hỏi Mover'), { target: { value: 'zzz' } })
    expect(screen.queryByText('Second question')).not.toBeInTheDocument()
    // Xóa bộ lọc (đặt lại select/input) khôi phục danh sách hiển thị của mỗi panel.
    fireEvent.change(screen.getByLabelText('Lọc độ khó Starter'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Lọc câu hỏi Mover'), { target: { value: '' } })
    expect(screen.getByText('First question')).toBeInTheDocument()
    expect(screen.getByText('Second question')).toBeInTheDocument()
  })
  it('prevents invalid edits and lets the user cancel without a PATCH', async () => {
    const fetchMock = setup()
    await screen.findByText('First question')
    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]!)
    fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Hủy sửa' }))
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument()
  })
  it('shows parser errors instead of sending truncated duplicate headers', async () => {
    const fetchMock = setup()
    await screen.findByText('First question')
    upload(
      IMPORT_COLUMNS.join(',').replace('source_reference', 'explanation') +
        '\n' +
        'x,'.repeat(9) +
        'x',
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('trùng')
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/import'))).toBe(false)
  })
  it('renders backend row/field errors after parsing a valid CSV', async () => {
    setup(true)
    await screen.findByText('First question')
    upload(IMPORT_COLUMNS.join(',') + '\nstarter,reading,fill_blank,easy,Question,,answer,0,,')
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Dòng dữ liệu 1 / points: Wrong points'),
    )
  })
})
