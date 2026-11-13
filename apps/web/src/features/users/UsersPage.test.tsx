import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_QUESTION_EDIT_PERMISSIONS } from '@lms/shared'
import { UsersPage } from './UsersPage'

/**
 * Fetch gia lap: GET /users + GET/PUT /settings/question-edit-permissions (slice-19).
 * Tra ve ban ghi `perms` hien tai; PUT merge body vao `perms` va tra lai de UI cap nhat.
 */
function stubUsersFetch(): { perms: Record<string, boolean>; putCalls: number } {
  const state = {
    perms: { ...DEFAULT_QUESTION_EDIT_PERMISSIONS } as Record<string, boolean>,
    putCalls: 0,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/settings/question-edit-permissions')) {
        if (init?.method === 'PUT') {
          state.putCalls += 1
          state.perms = { ...state.perms, ...JSON.parse(String(init.body)) }
        }
        return { ok: true, status: 200, json: async () => state.perms }
      }
      if (url.includes('/users')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            users: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                phoneNumber: '0901234567',
                email: 'admin@example.com',
                role: 'admin',
                lastName: null,
                firstName: null,
                birthYear: null,
                gender: null,
                address: null,
                parentPhone: null,
                age: null,
                createdAt: '2026-09-16T00:00:00.000Z',
              },
            ],
          }),
        }
      }
      throw new Error(`unexpected fetch: ${url}`)
    }),
  )
  return state
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UsersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the heading and lists users', async () => {
    stubUsersFetch()
    renderPage()
    expect(screen.getByRole('heading', { name: /Quản lý người dùng/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('0901234567')).toBeInTheDocument())
  })

  // slice-19 (ADR 0015): bang cau hinh quyen sua cau hoi theo role.
  it('shows question-edit permission toggles reflecting the current config', async () => {
    stubUsersFetch()
    renderPage()
    const teacher = await screen.findByRole('checkbox', {
      name: /Cho phép Giáo viên .* sửa câu hỏi/,
    })
    const admin = await screen.findByRole('checkbox', {
      name: /Cho phép Quản trị \(admin\) sửa câu hỏi/,
    })
    // Mac dinh: teacher KHONG duoc sua, admin duoc sua.
    await waitFor(() => expect(teacher).not.toBeChecked())
    expect(admin).toBeChecked()
  })

  it('persists a permission change via PUT when a role is toggled', async () => {
    const state = stubUsersFetch()
    renderPage()
    const teacher = await screen.findByRole('checkbox', {
      name: /Cho phép Giáo viên .* sửa câu hỏi/,
    })
    await waitFor(() => expect(teacher).not.toBeChecked())
    fireEvent.click(teacher)
    await waitFor(() => expect(state.putCalls).toBe(1))
    expect(state.perms.teacher).toBe(true)
    await waitFor(() => expect(teacher).toBeChecked())
  })
})
