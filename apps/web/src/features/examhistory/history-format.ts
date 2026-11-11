import { ATTEMPT_STATUS_LABELS, SUBMIT_REASON_LABELS, type ExamHistoryRow } from '@lms/shared'

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })

export const formatDateTime = (iso: string | null): string => (iso ? DATE_TIME.format(new Date(iso)) : '—')

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes} phút ${seconds % 60} giây` : `${seconds} giây`
}

export const formatPercent = (value: number | null): string => (value === null ? '—' : `${value}%`)

export function formatScore(row: ExamHistoryRow): string {
  return row.score === null || row.maxScore === null ? '—' : `${row.score}/${row.maxScore} (${formatPercent(row.percent)})`
}

export function resultLabel(row: ExamHistoryRow): string {
  if (row.passed === null) return ATTEMPT_STATUS_LABELS[row.status]
  return row.passed ? 'Đạt' : 'Không đạt'
}

export const submitReasonLabel = (row: ExamHistoryRow): string =>
  row.submitReason ? SUBMIT_REASON_LABELS[row.submitReason] : '—'

/** Ho ten hoc vien (lastName + firstName); fallback SDT khi chua co ten. */
export function studentName(s: { studentFirstName?: string | null; studentLastName?: string | null; studentPhone: string }): string {
  const full = [s.studentLastName, s.studentFirstName].filter(Boolean).join(' ').trim()
  return full === '' ? s.studentPhone : full
}
