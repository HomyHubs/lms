import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type { DateRange, ExamHistoryStore } from './service.js'

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
      ])
    if (from) q = q.where('a.started_at', '>=', localDayStart(from))
    if (to) q = q.where('a.started_at', '<', localDayEnd(to))
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
      return q.orderBy('a.started_at', 'desc').orderBy('a.id', 'desc').limit(limit).execute()
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

    async listScopedAttempts({ branchIds, classId, examId, from, to }) {
      let students = db
        .selectFrom('enrollments as e')
        .innerJoin('classes as c', 'c.id', 'e.class_id')
        .select('e.student_id')
        .where('c.branch_id', 'in', branchIds)
      if (classId) students = students.where('c.id', '=', classId)
      let q = selectAttempts({ from, to }).where('a.student_id', 'in', students)
      if (examId) q = q.where('a.exam_id', '=', examId)
      return q.orderBy('a.started_at', 'desc').orderBy('a.id', 'desc').limit(REPORT_ROW_LIMIT).execute()
    },
  }
}
