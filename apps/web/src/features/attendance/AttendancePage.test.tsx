import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttendancePage } from './AttendancePage'

const CLASS_ID = '50000000-0000-0000-0000-000000000001'
const SESSION_ID = '90000000-0000-0000-0000-000000000001'
const STUDENT_ID = '80000000-0000-0000-0000-000000000001'

const session = {
  id: SESSION_ID,
  classId: CLASS_ID,
  sessionDate: '2026-11-05',
  startsAt: '18:00',
  topic: 'Unit 1',
  createdAt: '2026-11-05T00:00:00.000Z',
  durationMinutes: 90,
  makeupForSessionId: null,
  cancelledAt: null,
}
const summary = { present: 0, late: 0, absent: 0, excused: 0, total: 0, ratePercent: null }

function json(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

/** Teacher session with one assigned class, one session and one enrolled student. */
function stubTeacherFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/auth/me')) {
      return json({ user: { id: '70000000-0000-0000-0000-000000000001', phoneNumber: '0900000011', role: 'teacher' } })
    }
    if (url.endsWith('/api/attendance/classes')) {
      return json({ classes: [{ id: CLASS_ID, courseId: CLASS_ID, branchId: CLASS_ID, name: 'Starter A' }] })
    }
    if (url.endsWith(`/api/classes/${CLASS_ID}/sessions`)) return json({ sessions: [session] })
    if (url.includes('/api/attendance/rates')) return json({ overall: summary, students: [] })
    if (url.endsWith(`/api/sessions/${SESSION_ID}/attendance`)) {
      const status = init?.method === 'PUT' ? 'absent' : null
      return json({
        session,
        roster: [
          { studentId: STUDENT_ID, phoneNumber: '0900000021', firstName: 'An', lastName: 'Nguyễn Minh', status, note: null },
        ],
      })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('AttendancePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lets a teacher mark a session of an assigned class and sends the chosen statuses', async () => {
    const fetchMock = stubTeacherFetch()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AttendancePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByRole('option', { name: 'Starter A' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Chọn lớp'), { target: { value: CLASS_ID } })
    fireEvent.click(await screen.findByRole('button', { name: /2026-11-05 18:00/ }))
    // Roster hien ho ten (lastName + firstName); SDT la dong phu.
    expect(await screen.findByText('Nguyễn Minh An')).toBeInTheDocument()
    fireEvent.change(await screen.findByLabelText('Trạng thái 0900000021'), { target: { value: 'absent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điểm danh' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã lưu điểm danh.'))
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ records: [{ studentId: STUDENT_ID, status: 'absent' }] })
  })
})
