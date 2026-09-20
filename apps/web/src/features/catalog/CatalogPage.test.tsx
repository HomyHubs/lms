import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogPage } from './CatalogPage'

const LEVEL = '10000000-0000-0000-0000-000000000001'
const COURSE = '40000000-0000-0000-0000-000000000001'
const BRANCH = '20000000-0000-0000-0000-000000000001'
const CLASS = '50000000-0000-0000-0000-000000000001'
const CENTER = '60000000-0000-0000-0000-000000000001'

/** Fetch gia lap tra ve du du lieu cho cac query cua trang. */
function stubFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
      if (url.includes('/enrollments')) return body({ enrollments: [] })
      if (url.includes('/classes')) {
        return body({
          classes: [
            {
              id: CLASS,
              courseId: COURSE,
              branchId: BRANCH,
              name: 'Lop 1',
              createdAt: '2026-09-16T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/courses')) {
        return body({
          courses: [
            { id: COURSE, levelId: LEVEL, name: 'KH1', createdAt: '2026-09-16T00:00:00.000Z' },
          ],
        })
      }
      if (url.includes('/levels')) {
        return body({ levels: [{ id: LEVEL, code: 'starter', name: 'Starter' }] })
      }
      if (url.includes('/branches')) {
        return body({
          branches: [
            {
              id: BRANCH,
              centerId: CENTER,
              name: 'CS1',
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
              role: 'student',
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
        <CatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CatalogPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the heading and lists a course and a class', async () => {
    stubFetch()
    renderPage()
    expect(screen.getByRole('heading', { name: /Quản lý chương trình học/ })).toBeInTheDocument()
    // Ten khoa hoc/lop xuat hien ca o bang lan o dropdown -> dung getAllByText.
    await waitFor(() => expect(screen.getAllByText('KH1').length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getAllByText('Lop 1').length).toBeGreaterThan(0))
  })
})
