import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UsersPage } from './UsersPage'

/** Fetch gia lap tra ve danh sach nguoi dung cho GET /users. */
function stubUsersFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
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
                createdAt: '2026-09-16T00:00:00.000Z',
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
})
