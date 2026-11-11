import type { ExamAttemptReport } from '@lms/shared'
import type { XlsxSheet } from '@/lib/xlsx-export'
import { formatDateTime, formatDuration, resultLabel, studentName, submitReasonLabel } from './history-format'

export function examReportToSheets(report: ExamAttemptReport): XlsxSheet[] {
  return [
    {
      name: 'Tong hop de thi',
      rows: [
        ['Đề thi', 'Cấp độ', 'Học viên', 'Lượt thi', 'Thi lại', 'Đạt lần đầu (%)', 'Đạt cuối cùng (%)', 'Điểm TB (%)', 'Cao nhất (%)'],
        ...report.byExam.map((e) => [
          e.examTitle,
          e.levelCode,
          e.students,
          e.attempts,
          e.retakes,
          e.firstAttemptPassRate,
          e.finalPassRate,
          e.averagePercent,
          e.bestPercent,
        ]),
      ],
    },
    {
      name: 'Chi tiet luot thi',
      rows: [
        ['Học viên', 'SĐT', 'Đề thi', 'Lần', 'Bắt đầu', 'Nộp bài', 'Thời gian làm', 'Cách nộp', 'Điểm', 'Tối đa', '%', 'Kết quả'],
        ...report.attempts.map((a) => [
          studentName(a),
          a.studentPhone,
          a.examTitle,
          a.attemptNumber,
          formatDateTime(a.startedAt),
          formatDateTime(a.submittedAt),
          formatDuration(a.durationSeconds),
          submitReasonLabel(a),
          a.score,
          a.maxScore,
          a.percent,
          resultLabel(a),
        ]),
      ],
    },
  ]
}
