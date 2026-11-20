import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type { DateRange, ExamHistoryStore, HistoryCursor, ReportScope } from './service.js'

// PERF(slice-24): aggregation (byExam/byBranch/byClass/byLevel) is computed over at most this many
// scoped rows; the detail table pages past it via listScopedAttemptsPage. Revisit when data > 5000.
const REPORT_ROW_LIMIT = 5000

const localDayStart = (day: string) => sql<Date>`(${day}::date)::timestamp at time zone 'Asia/Ho_Chi_Minh'`
const localDayEnd = (day: string) => sql<Date>`(${day}::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'`

/** Kysely implementation of ExamHistoryStore on a real Postgres (no mocks). */
export function makeExamHistoryStore(db: AppDb): ExamHistoryStore {
  function selectAttempts({ from, to }: DateRange) {
    let q = db
      .selectFrom('exam_attempts as a')
      .innerJoin('exams as x', 'x.id', 'a.exam_id')
      .innerJoin('levels as l', 'l.id', 'x.level_id')
      .innerJoin('users as u', 'u.id', 'a.student_id')
      .leftJoin('exam_sets as s', 's.id', 'a.exam_set_id')
      .select([
        'a.id',
        'a.exam_id',
        'x.title as exam_title',
        'l.code as level_code',
        'x.skill',
        'x.mode',
        's.title as exam_set_title',
        'a.attempt_number',
        'a.started_at',
        'a.submitted_at',
        'a.deadline_at',
        'a.submit_reason',
        'a.score',
        'a.max_score',
        'a.passed',
        'a.graded_at',
        'a.student_id',
        'u.phone_number as student_phone',
        'u.first_name as student_first_name',
        'u.last_name as student_last_name',
      ])
    if (from) q = q.where('a.started_at', '>=', localDayStart(from))
    if (to) q = q.where('a.started_at', '<', localDayEnd(to))
    return q
  }

  /**
   * Scoped attempts joined to the enrolling class + branch (slice-24). A student may be enrolled in
   * several classes; we pick ONE class per attempt within scope (DISTINCT ON a.id, lowest class id)
   * so byExam/attempts counts are not inflated by the join.
   */
  function selectScopedAttempts({ branchIds, classId, examId, from, to }: ReportScope) {
    let q = selectAttempts({ from, to })
      .innerJoin('enrollments as e', 'e.student_id', 'a.student_id')
      .innerJoin('classes as c', 'c.id', 'e.class_id')
      .innerJoin('branches as b', 'b.id', 'c.branch_id')
      .where('c.branch_id', 'in', branchIds)
      .select(['b.id as branch_id', 'b.name as branch_name', 'c.id as class_id', 'c.name as class_name'])
      .distinctOn('a.id')
      .orderBy('a.id')
      .orderBy('c.id')
    if (classId) q = q.where('c.id', '=', classId)
    if (examId) q = q.where('a.exam_id', '=', examId)
    return q
  }

  return {
    async listStudentAttempts(studentId, filter, limit) {
      let q = selectAttempts(filter).where('a.student_id', '=', studentId)
      if (filter.examId) q = q.where('a.exam_id', '=', filter.examId)
      if (filter.level) q = q.where('l.code', '=', filter.level)
      if (filter.passed !== undefined) q = q.where('a.passed', '=', filter.passed)
      const before = filter.before
      if (before) q = q.where(sql<boolean>`(a.started_at, a.id) < (${before.startedAt}::timestamptz, ${before.id}::uuid)`)
      // listStudentAttempts is single-student history (no class join); fill class/branch as empty for typing.
      const rows = await q.orderBy('a.started_at', 'desc').orderBy('a.id', 'desc').limit(limit).execute()
      return rows.map((r) => ({ ...r, branch_id: '', branch_name: '', class_id: '', class_name: '' }))
    },

    async isStudentInBranches(studentId, branchIds) {
      if (branchIds.length === 0) return false
      const row = await db
        .selectFrom('enrollments as e')
        .innerJoin('classes as c', 'c.id', 'e.class_id')
        .select('e.student_id')
        .where('e.student_id', '=', studentId)
        .where('c.branch_id', 'in', branchIds)
        .executeTakeFirst()
      return row !== undefined
    },

    async listScopedAttempts(scope) {
      if (scope.branchIds.length === 0) return []
      // Re-sort the DISTINCT ON result newest-first (DISTINCT ON forces ordering by a.id first).
      const rows = await selectScopedAttempts(scope).limit(REPORT_ROW_LIMIT).execute()
      return rows.sort(
        (x, y) => y.started_at.getTime() - x.started_at.getTime() || (x.id < y.id ? 1 : x.id > y.id ? -1 : 0),
      )
    },

    async listScopedAttemptsPage(scope, before, limit) {
      if (scope.branchIds.length === 0) return []
      // Page over the distinct-on subquery so the (started_at,id) cursor compares de-duplicated rows.
      let q = db
        .selectFrom(selectScopedAttempts(scope).as('p'))
        .selectAll()
      if (before) {
        q = q.where(sql<boolean>`(p.started_at, p.id) < (${before.startedAt}::timestamptz, ${before.id}::uuid)`)
      }
      return q.orderBy('p.started_at', 'desc').orderBy('p.id', 'desc').limit(limit).execute()
    },
  }
}

export type { HistoryCursor }
