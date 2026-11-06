import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type { ReportsStore } from './service.js'

/** Kysely implementation of ReportsStore on a real Postgres (no mocks). */
export function makeReportsStore(db: AppDb): ReportsStore {
  return {
    async listMovementBranches(branchIds) {
      if (branchIds.length === 0) return []
      return db.selectFrom('branches').select(['id', 'name']).where('id', 'in', branchIds).orderBy('name').execute()
    },
    async listMovements(branchIds, from, to) {
      if (branchIds.length === 0) return []
      return db.selectFrom('enrollment_events as e')
        .innerJoin('branches as b', 'b.id', 'e.branch_id')
        .leftJoin('classes as c', 'c.id', 'e.class_id')
        .leftJoin('users as u', 'u.id', 'e.student_id')
        .select([
          sql<string>`e.id::text`.as('id'), 'b.id as branch_id', 'b.name as branch_name',
          'c.name as class_name', 'u.phone_number', 'e.event_type', 'e.occurred_at',
        ])
        .where('e.branch_id', 'in', branchIds)
        .where(sql<boolean>`e.occurred_at >= (${from}::date::timestamp at time zone 'Asia/Ho_Chi_Minh')`)
        .where(sql<boolean>`e.occurred_at < ((${to}::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')`)
        .orderBy('e.occurred_at', 'desc').orderBy('e.id', 'desc').execute()
    },
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
      // undefined = superadmin xem toan bo (khong loc co so); [] = khong co co so nao.
      if (branchIds && branchIds.length === 0) return []
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
      if (branchIds) q = q.where('c.branch_id', 'in', branchIds)
      q = q.where('e.ended_at', 'is', null)
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
