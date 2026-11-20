import { z } from 'zod'
import { SessionDate } from './attendance.js'
import { LevelCode } from './catalog.js'
import { ExamMode } from './exams.js'
import { QuestionSkill } from './questions.js'

/**
 * Exam history + exam attempt report contract (slice-13, ADR 0012).
 * Timestamps are ISO UTC from the server; `from`/`to` are calendar days in Asia/Ho_Chi_Minh.
 */

export const SubmitReason = z.enum(['manual', 'deadline_auto'])
export type SubmitReason = z.infer<typeof SubmitReason>

export const SUBMIT_REASON_LABELS: Record<SubmitReason, string> = {
  manual: 'Tự nộp',
  deadline_auto: 'Hết giờ, tự nộp',
}

export const AttemptStatus = z.enum(['in_progress', 'awaiting_grading', 'graded'])
export type AttemptStatus = z.infer<typeof AttemptStatus>

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  in_progress: 'Đang làm',
  awaiting_grading: 'Chờ chấm',
  graded: 'Đã chấm',
}

export const HISTORY_PAGE_SIZE = 50

export const ExamHistoryQuery = z.object({
  from: SessionDate.optional(),
  to: SessionDate.optional(),
  examId: z.string().uuid().optional(),
  level: LevelCode.optional(),
  passed: z.enum(['true', 'false']).optional(),
  cursor: z.string().max(100).optional(),
})
export type ExamHistoryQuery = z.infer<typeof ExamHistoryQuery>

export const ExamHistoryRow = z.object({
  attemptId: z.string().uuid(),
  examId: z.string().uuid(),
  examTitle: z.string(),
  levelCode: LevelCode,
  skill: QuestionSkill,
  mode: ExamMode,
  examSetTitle: z.string().nullable(),
  attemptNumber: z.number().int(),
  startedAt: z.string(),
  submittedAt: z.string().nullable(),
  durationSeconds: z.number().int().nullable(),
  submitReason: SubmitReason.nullable(),
  score: z.number().nullable(),
  maxScore: z.number().nullable(),
  percent: z.number().nullable(),
  passed: z.boolean().nullable(),
  status: AttemptStatus,
})
export type ExamHistoryRow = z.infer<typeof ExamHistoryRow>

export const ExamHistoryPage = z.object({
  attempts: z.array(ExamHistoryRow),
  nextCursor: z.string().nullable(),
})
export type ExamHistoryPage = z.infer<typeof ExamHistoryPage>

export const ExamAttemptReportQuery = z.object({
  from: SessionDate.optional(),
  to: SessionDate.optional(),
  branchId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  examId: z.string().uuid().optional(),
  // Cursor phân trang phần chi tiết lượt thi (`<started_at>~<id>`) — slice-24.
  cursor: z.string().max(100).optional(),
})
export type ExamAttemptReportQuery = z.infer<typeof ExamAttemptReportQuery>

/** Per exam: rates are over distinct students, percents over graded attempts. */
export const ExamAttemptSummary = z.object({
  examId: z.string().uuid(),
  examTitle: z.string(),
  levelCode: LevelCode,
  students: z.number().int(),
  attempts: z.number().int(),
  retakes: z.number().int(),
  firstAttemptPassRate: z.number().nullable(),
  finalPassRate: z.number().nullable(),
  averagePercent: z.number().nullable(),
  bestPercent: z.number().nullable(),
})
export type ExamAttemptSummary = z.infer<typeof ExamAttemptSummary>

export const ExamAttemptDetail = ExamHistoryRow.extend({
  studentId: z.string().uuid(),
  studentPhone: z.string(),
  // Ten hoc vien (co the trong voi du lieu cu) de hien thi/xuat thay cho SDT.
  studentFirstName: z.string().nullable().default(null),
  studentLastName: z.string().nullable().default(null),
})
export type ExamAttemptDetail = z.infer<typeof ExamAttemptDetail>

/** Tỉ lệ đạt/không đạt theo một nhóm (cơ sở / lớp / cấp độ) — số lượt đạt, không đạt, tổng và % đạt. */
export const ExamPassFailGroup = z.object({
  key: z.string(),
  label: z.string(),
  passed: z.number().int(),
  failed: z.number().int(),
  total: z.number().int(),
  /** % đạt trên tổng lượt đã chấm (đạt + không đạt); null khi chưa có lượt nào. */
  passRate: z.number().nullable(),
})
export type ExamPassFailGroup = z.infer<typeof ExamPassFailGroup>

export const ExamAttemptReport = z.object({
  byExam: z.array(ExamAttemptSummary),
  /** Pass/fail theo Cơ sở, theo lớp (trung tâm) và theo Cấp độ — tính trên toàn bộ lượt trong phạm vi lọc (slice-24). */
  byBranch: z.array(ExamPassFailGroup),
  byClass: z.array(ExamPassFailGroup),
  byLevel: z.array(ExamPassFailGroup),
  /** Chi tiết lượt thi, phân trang 50 dòng/trang bằng cursor `<started_at>~<id>` (slice-24). */
  attempts: z.array(ExamAttemptDetail),
  /** Cursor trang kế tiếp cho `attempts`; null khi hết trang. */
  nextCursor: z.string().nullable(),
})
export type ExamAttemptReport = z.infer<typeof ExamAttemptReport>
