import {
  HISTORY_PAGE_SIZE,
  type AttemptStatus,
  type ExamAttemptReport,
  type ExamAttemptSummary,
  type ExamHistoryPage,
  type ExamHistoryQuery,
  type ExamHistoryRow,
  type ExamMode,
  type LevelCode,
  type QuestionSkill,
  type SubmitReason,
} from '@lms/shared'

/** One attempt joined with its exam, level, optional exam set and student (slice-13, ADR 0012). */
export interface HistoryAttemptRow {
  id: string
  exam_id: string
  exam_title: string
  level_code: string
  skill: string
  mode: string
  exam_set_title: string | null
  attempt_number: number
  started_at: Date
  submitted_at: Date | null
  deadline_at: Date
  submit_reason: string | null
  score: number | null
  max_score: number | null
  passed: boolean | null
  graded_at: Date | null
  student_id: string
  student_phone: string
}

/** Calendar days (YYYY-MM-DD, Asia/Ho_Chi_Minh) bounding `started_at`. */
export interface DateRange {
  from?: string
  to?: string
}

export interface HistoryCursor {
  startedAt: string
  id: string
}

export interface HistoryFilter extends DateRange {
  examId?: string
  level?: LevelCode
  passed?: boolean
  before?: HistoryCursor
}

export interface ReportScope extends DateRange {
  branchIds: string[]
  classId?: string
  examId?: string
}

export interface ExamHistoryStore {
  /** Newest first by (started_at, id). */
  listStudentAttempts: (studentId: string, filter: HistoryFilter, limit: number) => Promise<HistoryAttemptRow[]>
  isStudentInBranches: (studentId: string, branchIds: string[]) => Promise<boolean>
  /** Attempts of students enrolled in a class of the scope. */
  listScopedAttempts: (scope: ReportScope) => Promise<HistoryAttemptRow[]>
}

const round1 = (value: number): number => Math.round(value * 10) / 10

function percentOf(row: HistoryAttemptRow): number | null {
  if (row.graded_at === null || row.score === null || !row.max_score) return null
  return round1((row.score / row.max_score) * 100)
}

function statusOf(row: HistoryAttemptRow, now: Date): AttemptStatus {
  if (row.graded_at !== null) return 'graded'
  if (row.submitted_at !== null || now.getTime() >= row.deadline_at.getTime()) return 'awaiting_grading'
  return 'in_progress'
}

export function toHistoryRow(row: HistoryAttemptRow, now: Date): ExamHistoryRow {
  const graded = row.graded_at !== null
  return {
    attemptId: row.id,
    examId: row.exam_id,
    examTitle: row.exam_title,
    levelCode: row.level_code as LevelCode,
    skill: row.skill as QuestionSkill,
    mode: row.mode as ExamMode,
    examSetTitle: row.exam_set_title,
    attemptNumber: row.attempt_number,
    startedAt: row.started_at.toISOString(),
    submittedAt: row.submitted_at?.toISOString() ?? null,
    durationSeconds: row.submitted_at
      ? Math.max(0, Math.round((row.submitted_at.getTime() - row.started_at.getTime()) / 1000))
      : null,
    submitReason: row.submit_reason as SubmitReason | null,
    score: graded ? row.score : null,
    maxScore: graded ? row.max_score : null,
    percent: percentOf(row),
    passed: graded ? row.passed : null,
    status: statusOf(row, now),
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const encodeCursor = (row: HistoryAttemptRow): string => `${row.started_at.toISOString()}~${row.id}`

export function decodeCursor(cursor: string): HistoryCursor | null {
  const [startedAt, id] = cursor.split('~')
  if (!startedAt || !id || !UUID.test(id) || Number.isNaN(Date.parse(startedAt))) return null
  return { startedAt, id }
}

export type HistoryPageOutcome = { ok: true; page: ExamHistoryPage } | { ok: false; reason: 'bad_cursor' }

export async function listStudentHistory(
  store: ExamHistoryStore,
  studentId: string,
  query: ExamHistoryQuery,
  now: Date,
): Promise<HistoryPageOutcome> {
  const before = query.cursor === undefined ? undefined : decodeCursor(query.cursor)
  if (before === null) return { ok: false, reason: 'bad_cursor' }
  const filter: HistoryFilter = {
    from: query.from,
    to: query.to,
    examId: query.examId,
    level: query.level,
    passed: query.passed === undefined ? undefined : query.passed === 'true',
    before,
  }
  const rows = await store.listStudentAttempts(studentId, filter, HISTORY_PAGE_SIZE + 1)
  const page = rows.slice(0, HISTORY_PAGE_SIZE)
  const last = page.at(-1)
  return {
    ok: true,
    page: {
      attempts: page.map((row) => toHistoryRow(row, now)),
      nextCursor: rows.length > HISTORY_PAGE_SIZE && last ? encodeCursor(last) : null,
    },
  }
}

const rateOf = (count: number, total: number): number | null => (total === 0 ? null : round1((count / total) * 100))

/** Per-exam totals; rates are over distinct students, percents over graded attempts. */
export function summarizeByExam(rows: readonly HistoryAttemptRow[]): ExamAttemptSummary[] {
  const byExam = new Map<string, HistoryAttemptRow[]>()
  for (const row of rows) byExam.set(row.exam_id, [...(byExam.get(row.exam_id) ?? []), row])
  return [...byExam.values()]
    .map((attempts) => {
      const first = attempts[0] as HistoryAttemptRow
      const students = new Set(attempts.map((a) => a.student_id))
      const passedFirst = new Set(attempts.filter((a) => a.attempt_number === 1 && a.passed).map((a) => a.student_id))
      const passedAny = new Set(attempts.filter((a) => a.passed).map((a) => a.student_id))
      const percents = attempts.map(percentOf).filter((p): p is number => p !== null)
      return {
        examId: first.exam_id,
        examTitle: first.exam_title,
        levelCode: first.level_code as LevelCode,
        students: students.size,
        attempts: attempts.length,
        retakes: attempts.filter((a) => a.attempt_number > 1).length,
        firstAttemptPassRate: rateOf(passedFirst.size, students.size),
        finalPassRate: rateOf(passedAny.size, students.size),
        averagePercent: percents.length ? round1(percents.reduce((s, p) => s + p, 0) / percents.length) : null,
        bestPercent: percents.length ? Math.max(...percents) : null,
      }
    })
    .sort((a, b) => a.examTitle.localeCompare(b.examTitle, 'vi'))
}

export async function loadExamAttemptReport(
  store: ExamHistoryStore,
  scope: ReportScope,
  now: Date,
): Promise<ExamAttemptReport> {
  const rows = scope.branchIds.length === 0 ? [] : await store.listScopedAttempts(scope)
  return {
    byExam: summarizeByExam(rows),
    attempts: rows.map((row) => ({ ...toHistoryRow(row, now), studentId: row.student_id, studentPhone: row.student_phone })),
  }
}
