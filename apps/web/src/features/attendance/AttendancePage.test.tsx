import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttendancePage } from './AttendancePage'
import { TodayAttendanceBoard } from './TodayAttendanceBoard'

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

afterEach(() => vi.unstubAllGlobals())

it('marks several classes without fabricating arrival, supporting lateness and early-leave notes', async () => {
  const teacherId = '70000000-0000-0000-0000-000000000001'
  const studentB = '80000000-0000-0000-0000-000000000002'
  const studentC = '80000000-0000-0000-0000-000000000003'
  const roster = [STUDENT_ID, studentB, studentC].map((studentId, i) => ({ studentId, phoneNumber: `090000000${i + 1}`, status: null, note: null }))
  const item = { className: 'Lớp A', branchId: CLASS_ID, branchName: 'Cơ sở A', teachers: [{ classId: CLASS_ID, teacherId, phoneNumber: '0900000011' }], attendance: { session, roster } }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/api/attendance/today')) return json({ sessions: [item, { ...item, className: 'Lớp B', attendance: { session: { ...session, id: '90000000-0000-0000-0000-000000000002' }, roster: [] } }] })
    if (init?.method === 'PUT') return json({ session, roster: roster.map((r, i) => ({ ...r, status: i ? 'absent' : 'late' })) })
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TodayAttendanceBoard /></QueryClientProvider>)
  expect(await screen.findByText(/Lớp A ·/)).toBeInTheDocument()
  expect(screen.getByText(/Lớp B ·/)).toBeInTheDocument()
  const row = within(screen.getByText(/Lớp A ·/).closest('section')!)
  fireEvent.change(row.getByLabelText('Giáo viên thực dạy Lớp A'), { target: { value: teacherId } })
  fireEvent.click(row.getByRole('button', { name: 'Chọn tất cả có mặt' }))
  fireEvent.click(row.getByLabelText('Có mặt 0900000002'))
  fireEvent.change(row.getByLabelText('Trạng thái 0900000001'), { target: { value: '10' } })
  fireEvent.change(row.getByLabelText('Giờ đến 0900000001'), { target: { value: '18:10' } })
  fireEvent.change(row.getByLabelText('Ghi chú 0900000001'), { target: { value: 'Về sớm' } })
  fireEvent.click(row.getByRole('button', { name: 'Lưu điểm danh' }))
  await waitFor(() => expect(row.getByRole('status')).toHaveTextContent('Đã lưu'))
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
  expect(JSON.parse(String(put?.[1]?.body))).toEqual({ actualTeacherId: teacherId, records: [
    { studentId: STUDENT_ID, status: 'late', note: 'Về sớm', arrivedAt: '2026-11-05T11:10:00.000Z', lateMinutes: 10 },
    { studentId: studentB, status: 'absent', arrivedAt: null, lateMinutes: null },
    { studentId: studentC, status: 'present', arrivedAt: null, lateMinutes: null },
  ] })
})

describe('AttendancePage', () => {

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
