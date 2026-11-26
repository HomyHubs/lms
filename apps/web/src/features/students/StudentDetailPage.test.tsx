import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentDetailPage } from './StudentDetailPage'

const STUDENT_1 = '30000000-0000-0000-0000-000000000001'

/** Ho so day du: co ma hoc vien + ca 4 panel (slice-30). */
const FULL_PROFILE = {
  id: STUDENT_1,
  studentCode: 'HV0001',
  fullName: 'Nguyễn Văn A',
  phoneNumber: '0912345678',
  branchName: 'Cơ sở 1',
  levelCode: 'starter',
  exam: { attempts: 4, passed: 3, failed: 1, avgScorePct: 82.5 },
  attendance: { present: 9, absent: 1, late: 1, excused: 1, ratePct: 83.3 },
  study: { sessionsAttended: 10, studyMinutes: 900 },
  classification: { finalScore: 82.5, label: 'good' },
}

/** Ho so hoc vien moi: chua co du lieu nao -> cac panel null. */
const EMPTY_PROFILE = {
  id: STUDENT_1,
  studentCode: null,
  fullName: null,
  phoneNumber: '0912345678',
  branchName: null,
  levelCode: null,
  exam: null,
  attendance: null,
  study: null,
  classification: null,
}

function stubProfile(profile: unknown, status = 200) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes(`/students/${STUDENT_1}/profile`)) {
      return {
        ok: status === 200,
        status,
        json: async () => (status === 200 ? { student: profile } : { error: 'Khong tim thay hoc vien' }),
      }
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(id = STUDENT_1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/students/${id}`]}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StudentDetailPage (slice-30)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hiển thị mã học viên, cơ sở, cấp độ và các panel tổng hợp', async () => {
    stubProfile(FULL_PROFILE)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Nguyễn Văn A' })).toBeInTheDocument()
    // Mo ta duoi tieu de: ma hoc vien · co so · cap do.
    expect(screen.getByText('HV0001 · Cơ sở 1 · starter')).toBeInTheDocument()

    // Panel thi.
    expect(screen.getByText('Kết quả thi')).toBeInTheDocument()
    expect(screen.getByText('82.5%')).toBeInTheDocument()

    // Panel chuyen can.
    expect(screen.getByText('Tỷ lệ đi học:')).toBeInTheDocument()
    expect(screen.getByText('83.3%')).toBeInTheDocument()

    // Panel thoi gian hoc: 10 buoi, 900 phut -> 15 gio.
    expect(screen.getByText('Thời gian học')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('15 giờ')).toBeInTheDocument()

    // Panel xep loai.
    expect(screen.getByText('Khá')).toBeInTheDocument()
    expect(screen.getByText('Điểm tổng: 82.5')).toBeInTheDocument()
  })

  it('hồ sơ mới chưa có dữ liệu: hiển thị trạng thái trống thay vì số 0', async () => {
    stubProfile(EMPTY_PROFILE)
    renderPage()

    expect(await screen.findByRole('heading', { name: '0912345678' })).toBeInTheDocument()
    expect(screen.getByText('Chưa có lượt thi nào được chấm.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có dữ liệu điểm danh.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có buổi học nào được điểm danh.')).toBeInTheDocument()
    expect(screen.getByText('Chưa đủ dữ liệu xếp loại.')).toBeInTheDocument()
  })

  it('báo không tìm thấy khi hồ sơ ngoài phạm vi cơ sở (404)', async () => {
    stubProfile(EMPTY_PROFILE, 404)
    renderPage()

    expect(
      await screen.findByText('Không tìm thấy học viên hoặc bạn không có quyền xem.'),
    ).toBeInTheDocument()
  })
})
