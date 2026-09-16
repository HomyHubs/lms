import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

/** Fetch gia lap dinh tuyen theo URL: /auth/me va /health. */
function stubFetch(options: { authed: boolean }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me')) {
        if (!options.authed) {
          return { ok: false, status: 401, json: async () => ({ error: 'Chua dang nhap' }) }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            user: {
              id: '11111111-1111-1111-1111-111111111111',
              phoneNumber: '0901234567',
              role: 'admin',
            },
          }),
        }
      }
      if (url.includes('/health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            db: { status: 'up', latencyMs: 2 },
            timestamp: '2026-09-14T00:00:00.000Z',
          }),
        }
      }
      throw new Error(`unexpected fetch: ${url}`)
    }),
  )
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App routing + auth guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects to the login page when not authenticated', async () => {
    stubFetch({ authed: false })
    renderAt('/')
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Đăng nhập LMS/ })).toBeInTheDocument(),
    )
  })

  it('shows the DB connected status on home when authenticated', async () => {
    stubFetch({ authed: true })
    renderAt('/')
    await waitFor(() => expect(screen.getByText(/Đã kết nối/)).toBeInTheDocument())
  })
})

describe('LoginPage validation', () => {
  beforeEach(() => stubFetch({ authed: false }))
  afterEach(() => vi.unstubAllGlobals())

  it('renders the login form fields', async () => {
    renderAt('/login')
    expect(screen.getByLabelText(/Số điện thoại/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mật khẩu/)).toBeInTheDocument()
  })
})
