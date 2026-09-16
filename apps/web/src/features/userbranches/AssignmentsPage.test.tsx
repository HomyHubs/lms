import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssignmentsPage } from './AssignmentsPage'

/** Fetch gia lap: danh sach nguoi dung + co so (khong chon user nen khong goi assigned). */
function stubFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
      if (url.includes('/branches')) {
        return body({
          branches: [
            {
              id: '20000000-0000-0000-0000-000000000001',
              centerId: '60000000-0000-0000-0000-000000000001',
              name: 'Cơ sở 1',
              address: null,
              createdAt: '2026-09-16T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/users')) {
        return body({
          users: [
            {
              id: '30000000-0000-0000-0000-000000000001',
              phoneNumber: '0900000009',
              email: null,
              role: 'teacher',
              createdAt: '2026-09-16T00:00:00.000Z',
            },
          ],
        })
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
        <AssignmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AssignmentsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the heading and the user options', async () => {
    stubFetch()
    renderPage()
    expect(screen.getByRole('heading', { name: /Gán cơ sở/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/0900000009/)).toBeInTheDocument())
  })
})
