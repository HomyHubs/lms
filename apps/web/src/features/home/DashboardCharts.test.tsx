import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

// recharts needs a sized container; in jsdom width is 0 so charts don't paint.
// Replace ResponsiveContainer with a plain sized div so children render.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 400, height: 260 }}>{children}</div>
    ),
  }
})

vi.mock('./useDashboardStats', () => ({
  useDashboardStats: () => ({
    studentsByCourse: [
      { name: 'Starters', value: 12 },
      { name: 'Movers', value: 8 },
    ],
    studentsByBranch: [
      { name: 'Cơ sở Quận 1', value: 12 },
      { name: 'Cơ sở Quận 3', value: 8 },
    ],
    classesByBranch: [
      {
        branchId: 'b1',
        branchName: 'Cơ sở Quận 1',
        classes: [
          { classId: 'c1', className: 'Lớp Starters 1', size: 7 },
          { classId: 'c2', className: 'Lớp Movers 1', size: 5 },
        ],
        total: 12,
      },
      {
        branchId: 'b2',
        branchName: 'Cơ sở Quận 3',
        classes: [{ classId: 'c3', className: 'Lớp Starters 2', size: 8 }],
        total: 8,
      },
    ],
    classBars: [
      { classId: 'c1', className: 'Lớp Starters 1', size: 7, branchId: 'b1', branchName: 'Cơ sở Quận 1', branchIndex: 0 },
      { classId: 'c2', className: 'Lớp Movers 1', size: 5, branchId: 'b1', branchName: 'Cơ sở Quận 1', branchIndex: 0 },
      { classId: 'c3', className: 'Lớp Starters 2', size: 8, branchId: 'b2', branchName: 'Cơ sở Quận 3', branchIndex: 1 },
    ],
    totalStudents: 20,
    isLoading: false,
    isEmpty: false,
  }),
}))

vi.mock('@/features/reports/useReports', () => ({
  useStudentReport: () => ({
    isLoading: false,
    data: { totals: { passed: 15, failed: 5 } },
  }),
}))

// slice-16: thẻ "Tỉ lệ điểm danh" nay liệt kê các cơ sở (useBranches) thay cho bộ chọn lớp.
vi.mock('@/features/centers/useCenters', () => ({
  useBranches: () => ({
    isLoading: false,
    data: [
      { id: 'b1', centerId: 'c1', name: 'Cơ sở A', address: null, createdAt: '' },
      { id: 'b2', centerId: 'c1', name: 'Cơ sở B', address: null, createdAt: '' },
    ],
  }),
}))

vi.mock('@/features/attendance/useAttendance', () => ({
  useClassRates: () => ({
    isLoading: false,
    data: {
      overall: { present: 20, late: 3, absent: 2, excused: 1, total: 26, ratePercent: 77 },
      students: [],
    },
  }),
  useBranchRates: () => ({ isLoading: false, data: { branchId: 'b1', overall: { present: 0, late: 0, absent: 0, excused: 0, total: 0, ratePercent: null }, classes: [] } }),
}))

import { DashboardCharts } from './DashboardCharts'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardCharts />
    </MemoryRouter>,
  )
}

describe('DashboardCharts', () => {
  it('renders the chart titles', () => {
    renderDashboard()
    expect(screen.getByText('Tổng số học viên theo khóa học')).toBeInTheDocument()
    expect(screen.getByText('Tổng số học viên theo cơ sở')).toBeInTheDocument()
    expect(screen.getByText('Tỉ lệ học viên theo cơ sở')).toBeInTheDocument()
    expect(screen.getByText('Tỉ lệ hoàn thành bài')).toBeInTheDocument()
    expect(screen.getByText('Tỉ lệ điểm danh')).toBeInTheDocument()
    // Một chart gom theo cơ sở: tiêu đề + chú thích màu theo cơ sở (kèm tổng sĩ số).
    expect(screen.getByText('Sĩ số từng lớp theo cơ sở')).toBeInTheDocument()
    expect(screen.getByText('Cơ sở Quận 1 (12)')).toBeInTheDocument()
    expect(screen.getByText('Cơ sở Quận 3 (8)')).toBeInTheDocument()
  })

  it('renders the renamed "Tổng số" bar titles (slice-16)', () => {
    renderDashboard()
    expect(screen.getByText('Tổng số học viên theo khóa học')).toBeInTheDocument()
    expect(screen.getByText('Tổng số học viên theo cơ sở')).toBeInTheDocument()
  })

  it('lists all branches in the attendance card and links to the branch detail page (slice-16)', () => {
    renderDashboard()
    expect(screen.getByText('Tỉ lệ điểm danh')).toBeInTheDocument()
    // Mỗi cơ sở là một link điều hướng tới /attendance/branch/:branchId.
    const linkA = screen.getByRole('link', { name: /Cơ sở A/ })
    const linkB = screen.getByRole('link', { name: /Cơ sở B/ })
    expect(linkA.getAttribute('href')).toContain('/attendance/branch/b1')
    expect(linkB.getAttribute('href')).toContain('/attendance/branch/b2')
  })
})
