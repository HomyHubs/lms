import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CentersPage } from './CentersPage'

/** Fetch gia lap tra ve mot trung tam va mot co so. */
function stubFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/branches')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            branches: [
              {
                id: '22222222-2222-2222-2222-222222222222',
                centerId: '11111111-1111-1111-1111-111111111111',
                name: 'Cơ sở Quận 1',
                address: '1 Lê Lợi',
                createdAt: '2026-09-16T00:00:00.000Z',
              },
            ],
          }),
        }
      }
      if (url.includes('/centers')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            centers: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Trung tâm Anh ngữ',
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
        <CentersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CentersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the heading and lists a center and a branch', async () => {
    stubFetch()
    renderPage()
    expect(screen.getByRole('heading', { name: /Quản lý trung tâm/ })).toBeInTheDocument()
    // Ten trung tam xuat hien ca o danh sach lan o dropdown chon trung tam cho co so.
    await waitFor(() => expect(screen.getAllByText('Trung tâm Anh ngữ').length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByText('Cơ sở Quận 1')).toBeInTheDocument())
  })
})
