import { render, screen } from '@testing-library/react'
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

vi.mock('@/features/catalog/useCatalog', () => ({
  useClasses: () => ({
    isLoading: false,
    data: [{ id: 'c1', courseId: 'co1', branchId: 'b1', name: 'Lớp Starters 1', createdAt: '2026-09-16T00:00:00.000Z' }],
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
}))

import { DashboardCharts } from './DashboardCharts'

describe('DashboardCharts', () => {
  it('renders the chart titles', () => {
    render(<DashboardCharts />)
    expect(screen.getByText('Học viên theo khóa học')).toBeInTheDocument()
    expect(screen.getByText('Học viên theo cơ sở')).toBeInTheDocument()
    expect(screen.getByText('Tỉ lệ học viên theo cơ sở')).toBeInTheDocument()
    expect(screen.getByText('Tỉ lệ hoàn thành bài')).toBeInTheDocument()
    expect(screen.getByText('Tỉ lệ điểm danh')).toBeInTheDocument()
    // Một chart gom theo cơ sở: tiêu đề + chú thích màu theo cơ sở (kèm tổng sĩ số).
    expect(screen.getByText('Sĩ số từng lớp theo cơ sở')).toBeInTheDocument()
    expect(screen.getByText('Cơ sở Quận 1 (12)')).toBeInTheDocument()
    expect(screen.getByText('Cơ sở Quận 3 (8)')).toBeInTheDocument()
  })
})
