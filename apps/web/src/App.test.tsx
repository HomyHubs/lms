import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRole } from '@lms/shared'
import { App } from './App'

const NOTIFICATION_ID = '79000000-0000-4000-8000-000000000001'

/** Fetch gia lap dinh tuyen theo URL: /auth/me va /health; other endpoints fail (dashboards show —). */
function stubFetch(options: { authed: boolean; role?: UserRole }): void {
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
              role: options.role ?? 'admin',
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
      if (url.endsWith('/notifications/run')) {
        return { ok: true, status: 200, json: async () => ({ created: 2, sent: 1, failed: 1 }) }
      }
      if (url.includes('/notifications/')) return { ok: true, status: 204, json: async () => ({}) }
      if (url.endsWith('/notifications')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            unreadCount: 1,
            notifications: [
              {
                id: NOTIFICATION_ID,
                kind: 'retake_reminder',
                title: 'Bạn có thể thi lại: Reading 1',
                body: 'Bạn có thể thi lại lần 2/3.',
                createdAt: '2026-11-11T03:00:00.000Z',
                readAt: null,
              },
            ],
          }),
        }
      }
      return { ok: false, status: 503, json: async () => ({ error: 'stub' }) }
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

  it('shows unread reminders in the header bell, marks one read and lets an admin run reminders', async () => {
    stubFetch({ authed: true })
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo (1 chưa đọc)' }))
    fireEvent.click(screen.getByRole('button', { name: /Reading 1/ }))
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(`/api/notifications/${NOTIFICATION_ID}/read`, expect.objectContaining({ method: 'POST' })),
    )
    fireEvent.click(screen.getByRole('button', { name: /Gửi nhắc nhở ngay/ }))
    expect(await screen.findByText('Tạo mới 2 · đã gửi 1 · lỗi 1')).toBeInTheDocument()
  })
})

const SHELL_CASES: { role: UserRole; visible: string[]; hidden: string[]; dashboard: string }[] = [
  { role: 'admin', visible: ['Người dùng', 'Báo cáo & xếp loại', 'Điểm danh'], hidden: ['Bài thi của tôi'], dashboard: 'Lớp học' },
  { role: 'teacher', visible: ['Điểm danh', 'Ngân hàng câu hỏi', 'Ngày công & giờ dạy'], hidden: ['Người dùng', 'Báo cáo & xếp loại'], dashboard: 'Lớp phụ trách' },
  { role: 'staff', visible: ['Ngày công & giờ dạy'], hidden: ['Điểm danh', 'Người dùng', 'Ngân hàng câu hỏi'], dashboard: 'Ngày công (tháng)' },
  { role: 'student', visible: ['Bài thi của tôi', 'Điểm danh'], hidden: ['Ngày công & giờ dạy', 'Người dùng'], dashboard: 'Tỷ lệ chuyên cần' },
]

describe('AppShell navigation by role', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(SHELL_CASES)('shows only $role links and the $role dashboard', async ({ role, visible, hidden, dashboard }) => {
    stubFetch({ authed: true, role })
    renderAt('/')
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' })
    for (const label of visible) expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    for (const label of hidden) expect(within(nav).queryByRole('link', { name: label })).not.toBeInTheDocument()
    expect(screen.getByText(dashboard)).toBeInTheDocument()
  })

  it('sends a role away from a page outside its navigation', async () => {
    stubFetch({ authed: true, role: 'student' })
    renderAt('/users')
    expect(await screen.findByText('Tỷ lệ chuyên cần')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Quản lý người dùng/ })).not.toBeInTheDocument()
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
