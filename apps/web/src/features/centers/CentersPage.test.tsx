import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CentersPage } from './CentersPage'

const CENTER_ID = '11111111-1111-1111-1111-111111111111'
const BRANCH_ID = '22222222-2222-2222-2222-222222222222'

/** Fetch gia lap tra ve mot trung tam va mot co so. */
function stubFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/branches')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          branches: [
            {
              id: BRANCH_ID,
              centerId: CENTER_ID,
              name: 'Cơ sở Quận 1',
              address: '1 Lê Lợi',
              createdAt: '2026-09-16T00:00:00.000Z',
            },
          ],
          branch: {
            id: BRANCH_ID,
            centerId: CENTER_ID,
            name: 'Cơ sở Quận 3',
            address: '99 Võ Văn Tần',
            createdAt: '2026-09-16T00:00:00.000Z',
          },
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
              id: CENTER_ID,
              name: 'Trung tâm Anh ngữ',
              createdAt: '2026-09-16T00:00:00.000Z',
            },
          ],
        }),
      }
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
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

  it('edits a branch name and address inline and sends PATCH /api/branches/:id', async () => {
    const fetchMock = stubFetch()
    renderPage()
    await screen.findByText('Cơ sở Quận 1')

    fireEvent.click(screen.getByLabelText('Sửa Cơ sở Quận 1'))
    fireEvent.change(screen.getByLabelText('Tên cơ sở mới'), { target: { value: 'Cơ sở Quận 3' } })
    fireEvent.change(screen.getByLabelText('Địa chỉ mới'), { target: { value: '99 Võ Văn Tần' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true))
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(String(patch?.[0])).toBe(`/api/branches/${BRANCH_ID}`)
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ name: 'Cơ sở Quận 3', address: '99 Võ Văn Tần' })
    // Sau khi luu, form dong lai va danh sach duoc lam moi tu API.
    await waitFor(() => expect(screen.queryByLabelText('Tên cơ sở mới')).not.toBeInTheDocument())
  })

  it('cancels a branch edit without sending any request', async () => {
    const fetchMock = stubFetch()
    renderPage()
    await screen.findByText('Cơ sở Quận 1')

    fireEvent.click(screen.getByLabelText('Sửa Cơ sở Quận 1'))
    fireEvent.change(screen.getByLabelText('Tên cơ sở mới'), { target: { value: 'Không lưu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

    expect(screen.queryByLabelText('Tên cơ sở mới')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })
})
