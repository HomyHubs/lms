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
function stubUsersFetch(): {
  perms: Record<string, boolean>
  putCalls: number
  /** Body của các lần POST /users — dùng để kiểm form gửi gì lên API. */
  postBodies: Record<string, unknown>[]
} {
  const state = {
    perms: { ...DEFAULT_QUESTION_EDIT_PERMISSIONS } as Record<string, boolean>,
    putCalls: 0,
    postBodies: [] as Record<string, unknown>[],
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
      if (url.includes('/users') && init?.method === 'POST') {
        // slice-26 (ADR 0018): ghi lại body để test khẳng định form gửi năm sinh / ngày sinh nào.
        const body = JSON.parse(String(init.body)) as Record<string, unknown>
        state.postBodies.push(body)
        // Backend dẫn xuất năm sinh từ ngày sinh khi có.
        const derivedYear = body.birthDate ? Number(String(body.birthDate).slice(0, 4)) : null
        return {
          ok: true,
          status: 201,
          json: async () => ({
            user: {
              id: '55555555-5555-4555-8555-555555555555',
              phoneNumber: body.phoneNumber,
              email: null,
              role: body.role,
              lastName: null,
              firstName: null,
              birthYear: (body.birthYear as number | undefined) ?? derivedYear,
              birthDate: body.birthDate ?? null,
              gender: null,
              address: null,
              parentPhone: null,
              studentCode: 'HV9999',
              age: null,
              createdAt: '2026-09-16T00:00:00.000Z',
            },
          }),
        }
      }
      if (url.includes('/users')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            users: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                phoneNumber: '0901234567',
                email: 'admin@example.com',
                role: 'admin',
                lastName: null,
                firstName: null,
                birthYear: null,
                birthDate: null,
                gender: null,
                address: null,
                parentPhone: null,
                // slice-23: role khac hoc vien khong co ma.
                studentCode: null,
                age: null,
                createdAt: '2026-09-16T00:00:00.000Z',
              },
              {
                // slice-23: hoc vien co ma hoc vien (read-only) de kiem tra cot "Mã học viên".
                id: '22222222-2222-4222-8222-222222222222',
                phoneNumber: '0911111111',
                email: null,
                role: 'student',
                lastName: 'Nguyễn',
                firstName: 'An',
                birthYear: 2015,
                birthDate: null,
                gender: 'male',
                address: null,
                parentPhone: null,
                studentCode: 'HN0001',
                age: null,
                createdAt: '2026-09-16T00:00:00.000Z',
              },
              // slice-26: hoc vien co tuoi; SDT hien nho duoi ho ten.
              {
                id: '22222222-2222-4222-8222-222222222222',
                phoneNumber: '0902222222',
                email: null,
                role: 'student',
                lastName: 'Nguyễn',
                firstName: 'An',
                birthYear: 2015,
                birthDate: null,
                gender: 'male',
                address: null,
                parentPhone: null,
                age: 11,
                createdAt: '2026-09-16T00:00:00.000Z',
              },
              // slice-26: giao vien co birthYear nhung KHONG hien tuoi (age=null tu API).
              {
                id: '33333333-3333-4333-8333-333333333333',
                phoneNumber: '0903333333',
                email: null,
                role: 'teacher',
                lastName: 'Trần',
                firstName: 'Bình',
                birthYear: 1990,
                birthDate: null,
                gender: 'female',
                address: null,
                parentPhone: null,
                age: null,
                createdAt: '2026-09-16T00:00:00.000Z',
              },
              // slice-26 (ADR 0018): hoc vien co NGAY sinh -> tuoi CHINH XAC, khong co dau `~`.
              {
                id: '44444444-4444-4444-8444-444444444444',
                phoneNumber: '0904444444',
                email: null,
                role: 'student',
                lastName: 'Lê',
                firstName: 'Chi',
                birthYear: 2015,
                birthDate: '2015-12-30',
                gender: 'female',
                address: null,
                parentPhone: null,
                age: 10,
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

  // slice-26: bo cot SDT rieng (SDT nho duoi ho ten); cot Tuoi chi cho hoc vien.
  it('removes the phone column, shows phone under the name, and ages only students', async () => {
    stubUsersFetch()
    renderPage()
    // SDT van hien (nay nam duoi ho ten), nhung KHONG con cot "So dien thoai".
    await waitFor(() => expect(screen.getByText('0902222222')).toBeInTheDocument())
    expect(screen.queryByRole('columnheader', { name: 'Số điện thoại' })).toBeNull()
    // ADR 0018: chi biet nam sinh -> tuoi UOC LUONG, danh dau `~` de khong gia vo chinh xac.
    expect(screen.getByText('~11')).toBeInTheDocument()
    // Co ngay sinh -> tuoi chinh xac (30/12 chua toi -> 10, du 2026-2015 = 11).
    expect(screen.getByText('10')).toBeInTheDocument()
    // Giao vien co nam sinh nhung khong hien tuoi.
    expect(screen.queryByText('36')).toBeNull()
    expect(screen.queryByText('~36')).toBeNull()
  })

  // slice-26 (ADR 0018): dữ liệu cũ của trung tâm chỉ có NĂM sinh — form phải cho nhập chỉ năm.
  it('creates a student with only a birth year', async () => {
    const state = stubUsersFetch()
    renderPage()
    await waitFor(() => expect(screen.getByText('0901234567')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0905555555' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret12' } })
    fireEvent.change(screen.getByLabelText('Năm sinh'), { target: { value: '2015' } })
    fireEvent.click(screen.getByRole('button', { name: /Thêm/ }))

    await waitFor(() => expect(state.postBodies).toHaveLength(1))
    expect(state.postBodies[0]).toMatchObject({ birthYear: 2015 })
    // Không gửi `birthDate` -> backend coi là chỉ biết năm, tuổi sẽ là ước lượng.
    expect(state.postBodies[0]).not.toHaveProperty('birthDate')
  })

  it('also sends the full birth date when the admin knows it', async () => {
    const state = stubUsersFetch()
    renderPage()
    await waitFor(() => expect(screen.getByText('0901234567')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0905555556' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret12' } })
    fireEvent.change(screen.getByLabelText('Năm sinh'), { target: { value: '2015' } })
    fireEvent.change(screen.getByLabelText('Ngày sinh đầy đủ (tuỳ chọn)'), {
      target: { value: '2015-12-30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Thêm/ }))

    await waitFor(() => expect(state.postBodies).toHaveLength(1))
    expect(state.postBodies[0]).toMatchObject({ birthYear: 2015, birthDate: '2015-12-30' })
  })

  it('rejects a birth date whose year contradicts the birth year', async () => {
    const state = stubUsersFetch()
    renderPage()
    await waitFor(() => expect(screen.getByText('0901234567')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0905555557' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret12' } })
    fireEvent.change(screen.getByLabelText('Năm sinh'), { target: { value: '1999' } })
    fireEvent.change(screen.getByLabelText('Ngày sinh đầy đủ (tuỳ chọn)'), {
      target: { value: '2015-12-30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Thêm/ }))

    // Contract chặn tại FE: báo lỗi ngay, KHÔNG gửi request nào.
    expect(await screen.findByRole('alert')).toHaveTextContent(/Nam sinh khong khop/i)
    expect(state.postBodies).toHaveLength(0)
  })

  // slice-23: cot "Mã học viên" hien ma cho hoc vien (read-only).
  it('shows the student code column for a student', async () => {
    stubUsersFetch()
    renderPage()
    expect(await screen.findByRole('columnheader', { name: 'Mã học viên' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('HN0001')).toBeInTheDocument())
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
