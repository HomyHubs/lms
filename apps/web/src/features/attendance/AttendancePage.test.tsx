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

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

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

  it('shows a bar+pie chart of today attendance by status and follows the branch filter', async () => {
    const branchA = '20000000-0000-0000-0000-00000000000a'
    const branchB = '20000000-0000-0000-0000-00000000000b'
    const rosterA = [
      { studentId: '80000000-0000-0000-0000-000000000001', phoneNumber: '0900000001', firstName: null, lastName: null, status: 'present', note: null },
      { studentId: '80000000-0000-0000-0000-000000000002', phoneNumber: '0900000002', firstName: null, lastName: null, status: 'late', note: null },
      { studentId: '80000000-0000-0000-0000-000000000003', phoneNumber: '0900000003', firstName: null, lastName: null, status: 'absent', note: null },
    ]
    const rosterB = [
      { studentId: '80000000-0000-0000-0000-000000000004', phoneNumber: '0900000004', firstName: null, lastName: null, status: 'excused', note: null },
      { studentId: '80000000-0000-0000-0000-000000000005', phoneNumber: '0900000005', firstName: null, lastName: null, status: null, note: null },
    ]
    const fetchMock = vi.fn(async () =>
      json({
        sessions: [
          { className: 'Lớp A', branchId: branchA, branchName: 'Cơ sở A', teachers: [], attendance: { session, roster: rosterA } },
          {
            className: 'Lớp B',
            branchId: branchB,
            branchName: 'Cơ sở B',
            teachers: [],
            attendance: { session: { ...session, id: '90000000-0000-0000-0000-000000000002' }, roster: rosterB },
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TodayAttendanceBoard />
      </QueryClientProvider>,
    )

    const chart = await screen.findByRole('region', { name: 'Biểu đồ điểm danh các lớp hôm nay' })
    expect(chart.textContent).toContain('Có mặt: 1 lượt')
    expect(chart.textContent).toContain('Đi muộn: 1 lượt')
    expect(chart.textContent).toContain('Có phép: 1 lượt')
    expect(chart.textContent).toContain('Chưa điểm danh: 1 lượt')

    // Doi bo loc co so -> bieu do tinh lai theo du lieu dang hien thi.
    fireEvent.change(screen.getByLabelText('Cơ sở'), { target: { value: branchA } })
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Biểu đồ điểm danh các lớp hôm nay' }).textContent).toContain(
        'Có phép: 0 lượt',
      ),
    )
    expect(screen.getByRole('region', { name: 'Biểu đồ điểm danh các lớp hôm nay' }).textContent).toContain(
      'Chưa điểm danh: 0 lượt',
    )
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

  it('admin picks a date from the calendar → today-summary is fetched with ?date and "Hôm nay" clears it', async () => {
    // Pin the clock so the calendar opens on November 2026 (day 10 is present) and
    // the default "today" matches the stub. Only Date is faked so async still runs.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-21T03:00:00.000Z') })
    const todaySummary = (date: string | null) => ({
      date: date ?? '2026-11-21',
      classes: [
        {
          classId: CLASS_ID,
          className: 'Starter A',
          startsAt: '18:00',
          branchId: CLASS_ID,
          branchName: 'Cơ sở A',
          present: 1,
          late: 0,
          absent: 0,
          excused: 0,
          notMarked: 0,
          total: 1,
          ratePercent: 100,
        },
      ],
    })
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me')) {
        return json({ user: { id: '70000000-0000-0000-0000-0000000000aa', phoneNumber: '0900000099', role: 'admin' } })
      }
      if (url.endsWith('/api/attendance/classes')) {
        return json({ classes: [{ id: CLASS_ID, courseId: CLASS_ID, branchId: CLASS_ID, name: 'Starter A' }] })
      }
      if (url.includes('/api/attendance/today-summary')) {
        const match = /[?&]date=(\d{4}-\d{2}-\d{2})/.exec(url)
        return json(todaySummary(match?.[1] ?? null))
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AttendancePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Default load (no date): "Hôm nay".
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/api/attendance/today-summary'))).toBe(true),
    )

    // Open the in-house calendar popover and pick 2026-11-10.
    fireEvent.click(screen.getByLabelText('Chọn ngày điểm danh'))
    fireEvent.click(await screen.findByLabelText('2026-11-10'))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([u]) => String(u).includes('/api/attendance/today-summary?date=2026-11-10')),
      ).toBe(true),
    )
    expect(await screen.findByText(/Điểm danh theo ngày — 2026-11-10/)).toBeInTheDocument()

    // slice-dashboard-movements (mục 3): biểu đồ thanh + tròn theo ngày đang chọn.
    const chart = screen.getByRole('region', { name: 'Biểu đồ điểm danh theo ngày' })
    expect(chart.textContent).toContain('Có mặt: 1 lượt')

    // The dated fetch used the ?date= query param (no client-supplied "today").
    const datedCall = fetchMock.mock.calls.find(([u]) => String(u).includes('today-summary?date='))
    expect(String(datedCall?.[0])).toContain('date=2026-11-10')

    // "Hôm nay" clears the selected date → back to the server-decided default day.
    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    expect(await screen.findByText(/Điểm danh theo ngày — 2026-11-21/)).toBeInTheDocument()
    // No new dated request is issued once the date is cleared.
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('today-summary?date=')).length).toBe(1)

    vi.useRealTimers()
  })
})
