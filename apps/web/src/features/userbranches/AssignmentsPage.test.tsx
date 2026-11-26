import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssignmentsPage } from './AssignmentsPage'

const ADMIN = '30000000-0000-4000-8000-00000000000a'
const TEACHER = '30000000-0000-4000-8000-00000000000b'
const STUDENT = '30000000-0000-4000-8000-00000000000c'
const BRANCH = '20000000-0000-4000-8000-000000000001'
const CLASS = '50000000-0000-4000-8000-000000000001'

function user(id: string, phoneNumber: string, role: string, firstName: string | null, lastName: string | null) {
  return {
    id,
    phoneNumber,
    email: null,
    role,
    lastName,
    firstName,
    birthYear: null,
    gender: null,
    address: null,
    parentPhone: null,
    age: null,
    createdAt: '2026-09-16T00:00:00.000Z',
  }
}

/** Fetch gia lap: users/branches/classes + enrollments/teachers cua lop. */
function stubFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const ok = (data: unknown, status = 200) => ({ ok: true, status, json: async () => data })

    if (init?.method === 'POST' && url.endsWith('/api/enrollments')) {
      return ok({ enrollment: { id: 'enr-1', classId: CLASS, studentId: STUDENT, createdAt: '2026-09-16T00:00:00.000Z' } }, 201)
    }
    if (init?.method === 'PUT' && url.includes('/branches')) {
      return ok({
        branches: [{ id: BRANCH, centerId: '60000000-0000-4000-8000-000000000001', name: 'Cơ sở 1', address: null, createdAt: '2026-09-16T00:00:00.000Z' }],
      })
    }
    if (url.includes('/enrollments')) return ok({ enrollments: [] })
    if (url.includes('/teachers')) return ok({ teachers: [] })
    if (url.includes('/classes')) {
      return ok({ classes: [{ id: CLASS, courseId: '40000000-0000-4000-8000-000000000001', branchId: BRANCH, name: 'Lớp A', createdAt: '2026-09-16T00:00:00.000Z' }] })
    }
    // Co so dang gan cho 1 user: ban dau rong de test tick moi.
    if (url.startsWith('/api/users/') && url.endsWith('/branches')) return ok({ branches: [] })
    if (url.includes('/branches')) {
      return ok({ branches: [{ id: BRANCH, centerId: '60000000-0000-4000-8000-000000000001', name: 'Cơ sở 1', address: null, createdAt: '2026-09-16T00:00:00.000Z' }] })
    }
    if (url.includes('/users')) {
      return ok({
        users: [
          user(ADMIN, '0900000001', 'admin', 'Quản', 'Nguyễn'),
          user(TEACHER, '0900000002', 'teacher', 'Minh', 'Nguyễn'),
          user(STUDENT, '0900000003', 'student', 'An', 'Trần'),
        ],
      })
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
        <AssignmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AssignmentsPage (Ghi danh & Quản lý)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the new heading and only lists admin/staff accounts in the branch panel', async () => {
    stubFetch()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Ghi danh & Quản lý' })).toBeInTheDocument()

    const managerSelect = screen.getByLabelText('Tài khoản quản lý')
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Nguyễn Quản \(admin\)/ })).toBeInTheDocument(),
    )
    const options = Array.from(managerSelect.querySelectorAll('option')).map((o) => o.textContent ?? '')
    expect(options.some((t) => t.includes('teacher'))).toBe(false)
    expect(options.some((t) => t.includes('student'))).toBe(false)
  })

  it('enrolls a student into the chosen class (POST /api/enrollments)', async () => {
    const fetchMock = stubFetch()
    renderPage()
    await waitFor(() => expect(screen.getByRole('option', { name: 'Lớp A' })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Lớp'), { target: { value: CLASS } })
    await waitFor(() => expect(screen.getByText('Lớp chưa có học viên.')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Học viên để ghi danh'), { target: { value: STUDENT } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi danh' }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u) === '/api/enrollments')).toBe(true))
    const post = fetchMock.mock.calls.find(([u, init]) => String(u) === '/api/enrollments' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ classId: CLASS, studentId: STUDENT })
  })

  it('saves the branch scope of a manager (PUT /api/users/:id/branches)', async () => {
    const fetchMock = stubFetch()
    renderPage()
    await waitFor(() => expect(screen.getByRole('option', { name: /Nguyễn Quản \(admin\)/ })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Tài khoản quản lý'), { target: { value: ADMIN } })
    const checkbox = await screen.findByLabelText('Cơ sở 1')
    // Cho query "co so da gan" tai xong truoc khi tick (tranh effect ghi de lua chon).
    await waitFor(() => expect(screen.queryByText('Đang tải…')).not.toBeInTheDocument())
    fireEvent.click(checkbox)
    expect((checkbox as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Lưu/ }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true))
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(String(put?.[0])).toBe(`/api/users/${ADMIN}/branches`)
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ branchIds: [BRANCH] })
  })
})
