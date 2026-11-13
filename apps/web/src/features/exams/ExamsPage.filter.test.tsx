import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExamsPage } from './ExamsPage'

// slice-20: xem ca manager (admin) de co bo loc + xem truoc + nut tai mau.
vi.mock('@/features/auth/useAuth', () => ({ useSession: () => ({ user: { role: 'admin' } }) }))

const SET_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const LEVEL_ID = '33333333-3333-3333-3333-333333333333'
const USER_ID = '44444444-4444-4444-4444-444444444444'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function exam(id: string, title: string, levelCode: string, skill: string, mode: 'random' | 'fixed_set', extra: Record<string, unknown> = {}) {
  return {
    id, title, levelId: LEVEL_ID, levelCode, skill,
    questionCount: 10, durationMinutes: 30, passPercent: 60, maxAttempts: 2, retakeCooldownMinutes: 0,
    opensAt: '2026-09-27T00:00:00.000Z', closesAt: '2026-09-28T00:00:00.000Z',
    mode, examSetIds: mode === 'fixed_set' ? [SET_ID] : [], classIds: [],
    shuffleQuestions: false, shuffleOptions: false, retakeStrategy: 'same_set_shuffled',
    createdBy: USER_ID, createdAt: '2026-09-27T00:00:00.000Z', ...extra,
  }
}

const EXAMS = [
  exam('11111111-1111-1111-1111-111111111111', 'Starter Reading', 'starter', 'reading', 'random'),
  exam('22222222-2222-2222-2222-222222222222', 'Mover Listening', 'mover', 'listening', 'fixed_set'),
]

const EXAM_SET_DETAIL = {
  id: SET_ID, title: 'Bộ đề Mover 1', levelId: LEVEL_ID, levelCode: 'mover', skill: 'listening',
  description: null, status: 'published', itemCount: 12, createdBy: USER_ID,
  createdAt: '2026-09-27T00:00:00.000Z', updatedAt: '2026-09-27T00:00:00.000Z', publishedAt: '2026-09-27T00:00:00.000Z',
  items: [],
}

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/api/exams')) return response({ exams: EXAMS })
    if (url.includes(`/api/exam-sets/${SET_ID}`)) return response({ examSet: EXAM_SET_DETAIL })
    if (url.includes('/api/exam-sets')) return response({ examSets: [] })
    if (url.endsWith('/api/levels')) return response({ levels: [] })
    if (url.endsWith('/api/courses')) return response({ courses: [] })
    if (url.endsWith('/api/classes')) return response({ classes: [] })
    return response({}, 404)
  }))
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

describe('ExamsPage — slice-20 filter & preview', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loc theo cap do thu hep danh sach va cap nhat so dem', async () => {
    stubFetch()
    renderPage()
    await screen.findByText('Starter Reading')
    // Thanh loc nam trong vung role="search" — scope de khong dung voi select cua form Tao de.
    const toolbar = within(screen.getByRole('search', { name: 'Lọc danh sách đề' }))
    expect(screen.getByText('Mover Listening')).toBeInTheDocument()
    expect(screen.getByText('Hiển thị 2/2 đề')).toBeInTheDocument()

    fireEvent.change(toolbar.getByLabelText('Cấp độ'), { target: { value: 'starter' } })

    expect(screen.getByText('Starter Reading')).toBeInTheDocument()
    expect(screen.queryByText('Mover Listening')).not.toBeInTheDocument()
    expect(screen.getByText('Hiển thị 1/2 đề')).toBeInTheDocument()
  })

  it('tim theo ten + loc khong khop hien trang thai rong', async () => {
    stubFetch()
    renderPage()
    await screen.findByText('Starter Reading')
    const toolbar = within(screen.getByRole('search', { name: 'Lọc danh sách đề' }))

    fireEvent.change(toolbar.getByLabelText('Tìm theo tên đề'), { target: { value: 'khong-ton-tai' } })
    expect(screen.getByText('Không có đề nào khớp bộ lọc.')).toBeInTheDocument()
    expect(screen.getByText('Hiển thị 0/2 đề')).toBeInTheDocument()
  })

  it('loc theo che do fixed_set', async () => {
    stubFetch()
    renderPage()
    await screen.findByText('Mover Listening')
    const toolbar = within(screen.getByRole('search', { name: 'Lọc danh sách đề' }))
    fireEvent.change(toolbar.getByLabelText('Cách ra đề'), { target: { value: 'fixed_set' } })
    expect(screen.getByText('Mover Listening')).toBeInTheDocument()
    expect(screen.queryByText('Starter Reading')).not.toBeInTheDocument()
  })

  it('xem truoc de fixed_set hien metadata + bo de lien ket, khong lo nut vao thi', async () => {
    stubFetch()
    renderPage()
    await screen.findByText('Mover Listening')

    fireEvent.click(screen.getByRole('button', { name: 'Xem trước đề Mover Listening' }))

    const dialog = await screen.findByRole('dialog', { name: /Xem trước đề: Mover Listening/ })
    expect(within(dialog).getByText('Bộ đề cố định')).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByText(/Bộ đề Mover 1/)).toBeInTheDocument())
    expect(within(dialog).getByText(/12 câu/)).toBeInTheDocument()
    // Khong lo luong vao thi / dap an trong panel xem truoc.
    expect(within(dialog).queryByText('Vào thi')).not.toBeInTheDocument()
  })

  it('co nut tai mau Excel cho manager', async () => {
    stubFetch()
    renderPage()
    await screen.findByText('Starter Reading')
    expect(screen.getByRole('button', { name: /Tải mẫu Excel/ })).toBeInTheDocument()
  })
})
