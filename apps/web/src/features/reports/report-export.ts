import { CLASSIFICATION_LABELS, type StudentReport } from '@lms/shared'
import type { XlsxSheet } from '@/lib/xlsx-export'

/** Flattens a student report into worksheets for the Excel export (ADR 0006). */
export function reportToSheets(report: StudentReport): XlsxSheet[] {
  return [
    {
      name: 'Xep hang',
      rows: [
        ['Hạng', 'SĐT học viên', 'Lớp', 'Cơ sở', 'Cấp độ', 'Điểm thi (%)', 'Chuyên cần (%)', 'Điểm tổng', 'Xếp loại', 'Số đề đã thi', 'Số đề đạt', 'Lượt thi', 'Thi lại', 'Chờ thi lại'],
        ...report.ranking.map((r) => [
          r.rank,
          r.phoneNumber,
          r.className,
          r.branchName,
          r.levelCode,
          r.examScore,
          r.attendanceRate,
          r.finalScore,
          r.classification ? CLASSIFICATION_LABELS[r.classification] : 'Chưa xếp loại',
          r.examsTaken,
          r.examsPassed,
          r.attempts,
          r.retakes,
          r.pendingRetakes,
        ]),
      ],
    },
    {
      name: 'Theo lop',
      rows: [
        ['Lớp', 'Cơ sở', 'Cấp độ', 'Học viên', 'Điểm tổng TB', 'Lượt đạt', 'Lượt trượt'],
        ...report.byClass.map((c) => [c.className, c.branchName, c.levelCode, c.students, c.averageFinal, c.passed, c.failed]),
      ],
    },
    {
      name: 'Theo cap do',
      rows: [
        ['Cấp độ', 'Học viên', 'Điểm tổng TB', 'Lượt đạt', 'Lượt trượt'],
        ...report.byLevel.map((l) => [l.levelCode, l.students, l.averageFinal, l.passed, l.failed]),
      ],
    },
    {
      name: 'Theo thang',
      rows: [['Tháng', 'Lượt đạt', 'Lượt trượt'], ...report.byMonth.map((m) => [m.month, m.passed, m.failed])],
    },
  ]
}
