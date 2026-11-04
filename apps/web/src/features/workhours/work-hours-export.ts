import { WORK_SESSION_STATUS_LABELS, type WorkHoursReport } from '@lms/shared'
import type { XlsxSheet } from '@/lib/xlsx-export'

/** Decimal hours for payroll, rounded to 2 places (e.g. 270 minutes -> 4.5). */
export function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

/** Flattens the monthly work-hours report into worksheets for payroll (ADR 0007). */
export function workHoursToSheets(report: WorkHoursReport): XlsxSheet[] {
  return [
    {
      name: 'Giao vien',
      rows: [
        ['Tháng', 'SĐT giáo viên', 'Buổi theo lịch', 'Buổi thực dạy', 'Buổi nghỉ', 'Dạy bù', 'Dạy thay', 'Giờ dạy'],
        ...report.teachers.map((t) => [
          report.month,
          t.phoneNumber,
          t.planned,
          t.held,
          t.missed,
          t.makeup,
          t.substitute,
          toHours(t.taughtMinutes),
        ]),
      ],
    },
    {
      name: 'Nhan vien',
      rows: [
        ['Tháng', 'SĐT', 'Vai trò', 'Ngày công', 'Giờ công', 'Ca chưa check-out'],
        ...report.staff.map((s) => [report.month, s.phoneNumber, s.role, s.workDays, toHours(s.workedMinutes), s.openShifts]),
      ],
    },
    {
      name: 'Chi tiet buoi',
      rows: [
        ['Ngày', 'Giờ', 'Lớp', 'Thời lượng (phút)', 'GV theo lịch', 'GV dạy thực tế', 'Trạng thái', 'Dạy bù', 'Dạy thay'],
        ...report.sessions.map((s) => [
          s.sessionDate,
          s.startsAt,
          s.className,
          s.durationMinutes,
          s.plannedTeacherPhone ?? '',
          s.taughtByPhone ?? '',
          WORK_SESSION_STATUS_LABELS[s.status],
          s.isMakeup ? 'Có' : '',
          s.isSubstitute ? 'Có' : '',
        ]),
      ],
    },
  ]
}
