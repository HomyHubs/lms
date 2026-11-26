import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentsPage } from './StudentsPage'

const STUDENT_1 = '30000000-0000-0000-0000-000000000001'
const STUDENT_2 = '30000000-0000-0000-0000-000000000002'

/** Fetch gia lap cho GET /students?q= — hai hoc vien, mot ban ghi cu chua co ma. */
function stubFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/students?q=')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            {
              id: STUDENT_1,
              studentCode: 'HV0001',
              fullName: 'Nguyễn Văn A',
              phoneNumber: '0912345678',
              branchName: 'Cơ sở 1',
              levelCode: 'starter',
            },
            {
              id: STUDENT_2,
              studentCode: null,
              fullName: 'Trần Thị B',
              phoneNumber: '0987654321',
              branchName: null,
              levelCode: null,
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
      <MemoryRouter initialEntries={['/students']}>
        <Routes>
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<p>Trang hồ sơ</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function search(keyword: string) {
  fireEvent.change(screen.getByPlaceholderText(/Nhập tên hoặc số điện thoại/), {
    target: { value: keyword },
  })
  fireEvent.click(screen.getByRole('button', { name: /Tìm/ }))
}

describe('StudentsPage (slice-30)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tìm học viên theo tên và hiển thị mã học viên (— khi dữ liệu cũ chưa có mã)', async () => {
    stubFetch()
    renderPage()

    // Chưa tìm thì chưa có bảng.
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await search('Nguyễn')

    const rowA = await screen.findByRole('row', { name: /Nguyễn Văn A/ })
    expect(rowA).toHaveTextContent('HV0001')
    expect(rowA).toHaveTextContent('0912345678')
    expect(rowA).toHaveTextContent('Cơ sở 1')

    const rowB = screen.getByRole('row', { name: /Trần Thị B/ })
    expect(rowB).toHaveTextContent('—')
    expect(rowB).toHaveTextContent('0987654321')
  })

  it('gửi từ khoá đã trim lên API và mở hồ sơ khi bấm vào dòng', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await search('  Nguyễn  ')
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('q=Nguy%E1%BB%85n'))).toBe(true),
    )

    const rowA = await screen.findByRole('row', { name: /Nguyễn Văn A/ })
    fireEvent.click(rowA)
    expect(await screen.findByText('Trang hồ sơ')).toBeInTheDocument()
  })

  it('báo lỗi khi tìm kiếm thất bại', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })),
    )
    renderPage()

    await search('Nguyễn')
    expect(await screen.findByText(/Tìm kiếm thất bại, thử lại sau/)).toBeInTheDocument()
  })
})
