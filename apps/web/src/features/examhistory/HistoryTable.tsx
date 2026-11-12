import type { ExamHistoryRow } from '@lms/shared'
import { Badge } from '@/components/ui/card'
import { formatDateTime, formatDuration, formatScore, resultLabel, submitReasonLabel } from './history-format'

export function ResultBadge({ row }: { row: ExamHistoryRow }): React.ReactElement {
  const tone = row.passed === null ? 'neutral' : row.passed ? 'success' : 'danger'
  return <Badge tone={tone}>{resultLabel(row)}</Badge>
}

/** Rows of one student's attempts (student page and the manager drill-down). */
export function HistoryTable({ rows }: { rows: readonly ExamHistoryRow[] }): React.ReactElement {
  if (rows.length === 0) return <p className="text-sm text-slate-500">Chưa có lượt thi trong khoảng đã chọn.</p>
  return (
    <table className="c-table">
      <thead>
        <tr>
          <th>Đề thi</th>
          <th>Lần</th>
          <th>Bắt đầu</th>
          <th>Nộp bài</th>
          <th>Thời gian làm</th>
          <th>Cách nộp</th>
          <th>Điểm</th>
          <th>Kết quả</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.attemptId}>
            <td>
              {row.examTitle}
              <span className="ml-1 text-xs text-slate-500">
                {row.levelCode}
                {row.examSetTitle && ` · ${row.examSetTitle}`}
              </span>
            </td>
            <td>Lần {row.attemptNumber}</td>
            <td>{formatDateTime(row.startedAt)}</td>
            <td>{formatDateTime(row.submittedAt)}</td>
            <td>{formatDuration(row.durationSeconds)}</td>
            <td>{submitReasonLabel(row)}</td>
            <td>{formatScore(row)}</td>
            <td>
              <ResultBadge row={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
