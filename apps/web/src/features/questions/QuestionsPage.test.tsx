import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicUser, UserRole } from '@lms/shared'
import { DEFAULT_QUESTION_EDIT_PERMISSIONS } from '@lms/shared'
import { QuestionsPage } from './QuestionsPage'

// slice-19: dieu khien phien (role) qua mock useSession de kiem tra gating.
const sessionUser = vi.hoisted(() => ({ current: null as PublicUser | null }))
vi.mock('@/features/auth/useAuth', () => ({
  useSession: () => ({ user: sessionUser.current, isLoading: false }),
}))

function setRole(role: UserRole): void {
  sessionUser.current = {
    id: '99999999-9999-4999-8999-999999999999',
    phoneNumber: '0900000000',
    role,
  } as PublicUser
}

/** Fetch gia lap: GET /questions + GET /settings/question-edit-permissions (defaults). */
function stubQuestionsFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/settings/question-edit-permissions')) {
        return { ok: true, status: 200, json: async () => DEFAULT_QUESTION_EDIT_PERMISSIONS }
      }
      if (url.endsWith('/media')) return Response.json({ media: [] })
      if (url.includes('/questions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            questions: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                levelId: '22222222-2222-2222-2222-222222222222',
                levelCode: 'starter',
                skill: 'reading',
                questionType: 'multiple_choice',
                difficulty: 'easy',
                questionText: 'What color is the sky?',
                options: ['blue', 'green'],
                correctAnswer: 'blue',
                points: 1,
                explanation: null,
                sourceReference: null,
                createdAt: '2026-09-21T00:00:00.000Z',
              },
            ],
          }),
        }
      }
      throw new Error(`unexpected fetch: ${url}`)
    }),
  )
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <QuestionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuestionsPage', () => {
  beforeEach(() => {
    // Mac dinh: admin (duoc sua) de cac test hien huu giu nguyen hanh vi editor.
    setRole('admin')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the heading and lists questions', async () => {
    stubQuestionsFetch()
    renderPage()
    expect(screen.getByRole('heading', { name: /Ngân hàng câu hỏi/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('What color is the sky?')).toBeInTheDocument(),
    )
  })

  it('offers image upload for the question being edited', async () => {
    stubQuestionsFetch()
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
    expect(await screen.findByLabelText('Chọn ảnh cho Hình câu đang sửa')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Lựa chọn b' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hủy sửa' }))
    expect(screen.queryByLabelText('Chọn ảnh cho Hình câu đang sửa')).not.toBeInTheDocument()
  })

  // slice-19 (ADR 0015): role bi tu choi (teacher mac dinh) -> an form/import, khoa nut Sửa/Xoá.
  it('hides edit UI and disables row actions for a role without edit permission', async () => {
    setRole('teacher')
    stubQuestionsFetch()
    renderPage()
    // Danh sach van xem duoc.
    await waitFor(() => expect(screen.getByText('What color is the sky?')).toBeInTheDocument())
    // Form "Thêm câu hỏi" va khu Import bi an.
    expect(screen.queryByRole('heading', { name: /Thêm câu hỏi/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Import từ CSV/ })).not.toBeInTheDocument()
    expect(screen.getByText(/chỉ được xem ngân hàng câu hỏi/)).toBeInTheDocument()
    // Nut Sửa/Xoá bi vo hieu hoa.
    expect(screen.getByRole('button', { name: 'Sửa' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Xoá/ })).toBeDisabled()
  })

  it('allows editing for superadmin regardless of the stored config', async () => {
    setRole('superadmin')
    stubQuestionsFetch()
    renderPage()
    expect(await screen.findByRole('heading', { name: /Thêm câu hỏi/ })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Sửa' })).toBeEnabled()
  })
})
