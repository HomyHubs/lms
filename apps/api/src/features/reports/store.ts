import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type { ReportsStore } from './service.js'

/** Kysely implementation of ReportsStore on a real Postgres (no mocks). */
export function makeReportsStore(db: AppDb): ReportsStore {
  return {
    async listPolicies() {
      // A level created after the migration gets its row here, so the column defaults stay the
      // single source of the default policy and no level's students drop out of the report.
      await sql`insert into student_grading_policies (level_id) select id from levels on conflict (level_id) do nothing`.execute(db)
      return db
        .selectFrom('student_grading_policies as p')
        .innerJoin('levels as l', 'l.id', 'p.level_id')
        .select([
          'p.level_id',
          'l.code as level_code',
          'l.name as level_name',
          'p.exam_weight',
          'p.attendance_weight',
          'p.excellent_min',
          'p.good_min',
          'p.average_min',
          'p.pass_min',
        ])
        .orderBy('l.code')
        .execute()
    },

    async levelExists(levelId) {
      const row = await db.selectFrom('levels').select('id').where('id', '=', levelId).executeTakeFirst()
      return row !== undefined
    },

    async upsertPolicy(levelId, p) {
      const values = {
        exam_weight: p.examWeight,
        attendance_weight: p.attendanceWeight,
        excellent_min: p.excellentMin,
        good_min: p.goodMin,
        average_min: p.averageMin,
        pass_min: p.passMin,
      }
      await db
        .insertInto('student_grading_policies')
        .values({ level_id: levelId, ...values })
        .onConflict((oc) => oc.column('level_id').doUpdateSet({ ...values, updated_at: sql`now()` }))
        .execute()
    },

    async listEnrollments({ branchIds, levelId, classId }) {
      if (branchIds.length === 0) return []
      let q = db
        .selectFrom('enrollments as e')
        .innerJoin('classes as c', 'c.id', 'e.class_id')
        .innerJoin('branches as b', 'b.id', 'c.branch_id')
        .innerJoin('courses as co', 'co.id', 'c.course_id')
        .innerJoin('levels as l', 'l.id', 'co.level_id')
        .innerJoin('users as u', 'u.id', 'e.student_id')
        .select([
          'e.class_id',
          'c.name as class_name',
          'c.branch_id',
          'b.name as branch_name',
          'l.id as level_id',
          'l.code as level_code',
          'e.student_id',
          'u.phone_number',
          sql<string | null>`nullif(trim(concat_ws(' ', u.last_name, u.first_name)), '')`.as('student_name'),
        ])
        .where('c.branch_id', 'in', branchIds)
      if (levelId) q = q.where('l.id', '=', levelId)
      if (classId) q = q.where('c.id', '=', classId)
      return q.orderBy('c.name').orderBy('u.phone_number').execute()
    },

    async listGradedAttempts(studentIds, levelIds, { from, to }) {
      if (studentIds.length === 0 || levelIds.length === 0) return []
      let q = db
        .selectFrom('exam_attempts as a')
        .innerJoin('exams as x', 'x.id', 'a.exam_id')
        .select([
          'a.id',
          'a.student_id',
          'a.exam_id',
          'x.level_id',
          'a.attempt_number',
          sql<number>`a.score`.as('score'),
          sql<number>`a.max_score`.as('max_score'),
          sql<boolean>`a.passed`.as('passed'),
          'x.max_attempts',
          sql<string>`to_char(a.graded_at, 'YYYY-MM')`.as('graded_month'),
        ])
        .where('a.graded_at', 'is not', null)
        .where('a.passed', 'is not', null)
        .where('a.student_id', 'in', studentIds)
        .where('x.level_id', 'in', levelIds)
      if (from) q = q.where(sql<boolean>`a.graded_at >= ${from}::date`)
      if (to) q = q.where(sql<boolean>`a.graded_at < ${to}::date + 1`)
      return q.execute()
    },

    async listAttendanceStatuses(classIds, { from, to }) {
      if (classIds.length === 0) return []
      let q = db
        .selectFrom('attendance_records as r')
        .innerJoin('class_sessions as s', 's.id', 'r.session_id')
        .select(['s.class_id', 'r.student_id', 'r.status'])
        .where('s.class_id', 'in', classIds)
      if (from) q = q.where(sql<boolean>`s.session_date >= ${from}::date`)
      if (to) q = q.where(sql<boolean>`s.session_date <= ${to}::date`)
      return q.execute()
    },
  }
}
