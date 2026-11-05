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
})
export type ExamAttemptDetail = z.infer<typeof ExamAttemptDetail>

export const ExamAttemptReport = z.object({
  byExam: z.array(ExamAttemptSummary),
  attempts: z.array(ExamAttemptDetail),
})
export type ExamAttemptReport = z.infer<typeof ExamAttemptReport>
