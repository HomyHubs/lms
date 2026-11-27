import { sql } from 'kysely'
import type { ClassificationPolicy } from '@lms/shared'
import type { AppDb } from '../../platform/db.js'
import type {
  StudentAttendanceAggRow,
  StudentExamAggRow,
  StudentIdentityRow,
  StudentSearchRow,
  StudentStudyAggRow,
  StudentsStore,
} from './service.js'

/**
 * Kysely implementation cua StudentsStore tren Postgres THUC (khong mock).
 * Tai dung mo hinh join cua reports (enrollments -> classes -> branches/levels -> users)
 * de xac dinh co so/cap do + pham vi theo co so cua hoc vien.
 */
export function makeStudentsStore(db: AppDb): StudentsStore {
  /** Ho ten ghep an toan (null khi chua co ho so). */
  const fullName = sql<string | null>`nullif(trim(concat_ws(' ', u.last_name, u.first_name)), '')`

  return {
    async searchStudents(q, branchIds) {
      // undefined = superadmin (khong loc co so); [] = khong co co so nao -> rong.
      if (branchIds && branchIds.length === 0) return []
      const like = `%${q.toLowerCase()}%`
      let query = db
        .selectFrom('users as u')
        .leftJoin('enrollments as e', 'e.student_id', 'u.id')
        .leftJoin('classes as c', 'c.id', 'e.class_id')
        .leftJoin('branches as b', 'b.id', 'c.branch_id')
        .leftJoin('courses as co', 'co.id', 'c.course_id')
        .leftJoin('levels as l', 'l.id', 'co.level_id')
        .where('u.role', '=', 'student')
        .where((eb) =>
          eb.or([
            eb(sql<string>`lower(coalesce(u.last_name, ''))`, 'like', like),
            eb(sql<string>`lower(coalesce(u.first_name, ''))`, 'like', like),
            eb(sql<string>`lower(coalesce(concat_ws(' ', u.last_name, u.first_name), ''))`, 'like', like),
            eb(sql<string>`lower(coalesce(u.student_code, ''))`, 'like', like),
            eb('u.phone_number', 'like', `%${q}%`),
          ]),
        )
        .select([
          'u.id',
          'u.phone_number',
          'u.student_code',
          fullName.as('full_name'),
          'b.name as branch_name',
          'l.code as level_code',
        ])
        .distinctOn('u.id')
      // Loc theo co so (qua lop hoc vien ghi danh) khi khong phai superadmin.
      if (branchIds) query = query.where('c.branch_id', 'in', branchIds)
      const rows = await query.orderBy('u.id').limit(50).execute()
      return rows as StudentSearchRow[]
    },

    async findStudentIdentity(id, branchIds) {
      if (branchIds && branchIds.length === 0) return undefined
      let query = db
        .selectFrom('users as u')
        .leftJoin('enrollments as e', 'e.student_id', 'u.id')
        .leftJoin('classes as c', 'c.id', 'e.class_id')
        .leftJoin('branches as b', 'b.id', 'c.branch_id')
        .leftJoin('courses as co', 'co.id', 'c.course_id')
        .leftJoin('levels as l', 'l.id', 'co.level_id')
        .where('u.id', '=', id)
        .where('u.role', '=', 'student')
        .select([
          'u.id',
          'u.phone_number',
          'u.student_code',
          fullName.as('full_name'),
          'b.name as branch_name',
          'l.code as level_code',
          'l.id as level_id',
        ])
        .distinctOn('u.id')
      if (branchIds) query = query.where('c.branch_id', 'in', branchIds)
      const row = await query.orderBy('u.id').executeTakeFirst()
      return row as StudentIdentityRow | undefined
    },

    async loadExamAgg(studentId) {
      // ADR 0006: diem thi = trung binh diem CAO NHAT cua tung de (khong phai moi luot thi).
      // Dem luot thi van tinh moi luot da cham; chi phan diem la lay max theo de.
      const row = await db
        .selectFrom('exam_attempts as a')
        .where('a.student_id', '=', studentId)
        .where('a.graded_at', 'is not', null)
        .select([
          sql<number>`count(*)::int`.as('attempts'),
          sql<number>`count(*) filter (where a.passed is true)::int`.as('passed'),
          sql<number>`count(*) filter (where a.passed is false)::int`.as('failed'),
          sql<number | null>`(
            select avg(best_pct) from (
              select max(case when a2.max_score > 0 then a2.score::numeric / a2.max_score * 100 end) as best_pct
              from exam_attempts a2
              where a2.student_id = ${studentId}
                and a2.graded_at is not null
              group by a2.exam_id
            ) b
          )`.as('avg_score_pct'),
        ])
        .executeTakeFirstOrThrow()
      return {
        attempts: Number(row.attempts),
        passed: Number(row.passed),
        failed: Number(row.failed),
        avg_score_pct: row.avg_score_pct === null ? null : Number(row.avg_score_pct),
      } satisfies StudentExamAggRow
    },

    async loadAttendanceAgg(studentId) {
      const row = await db
        .selectFrom('attendance_records as r')
        .where('r.student_id', '=', studentId)
        .select([
          sql<number>`count(*) filter (where r.status = 'present')::int`.as('present'),
          sql<number>`count(*) filter (where r.status = 'absent')::int`.as('absent'),
          sql<number>`count(*) filter (where r.status = 'late')::int`.as('late'),
          sql<number>`count(*) filter (where r.status = 'excused')::int`.as('excused'),
        ])
        .executeTakeFirstOrThrow()
      return {
        present: Number(row.present),
        absent: Number(row.absent),
        late: Number(row.late),
        excused: Number(row.excused),
      } satisfies StudentAttendanceAggRow
    },

    async loadStudyAgg(studentId) {
      // Chi tinh buoi hoc vien duoc ghi nhan co mat / di muon; phut = thoi luong buoi hoc that.
      const row = await db
        .selectFrom('attendance_records as r')
        .innerJoin('class_sessions as s', 's.id', 'r.session_id')
        .where('r.student_id', '=', studentId)
        .where('r.status', 'in', ['present', 'late'])
        .select([
          sql<number>`count(*)::int`.as('sessions_attended'),
          sql<number>`coalesce(sum(s.duration_minutes), 0)::int`.as('study_minutes'),
        ])
        .executeTakeFirstOrThrow()
      return {
        sessions_attended: Number(row.sessions_attended),
        study_minutes: Number(row.study_minutes),
      } satisfies StudentStudyAggRow
    },

    async loadPolicy(levelId) {
      // Policy xep loai theo cap do (ADR 0006) — cung bang ma man bao cao dang dung.
      const row = await db
        .selectFrom('student_grading_policies as p')
        .innerJoin('levels as l', 'l.id', 'p.level_id')
        .where('p.level_id', '=', levelId)
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
        .executeTakeFirst()
      if (!row) return null
      return {
        levelId: row.level_id,
        levelCode: row.level_code,
        levelName: row.level_name,
        examWeight: row.exam_weight,
        attendanceWeight: row.attendance_weight,
        excellentMin: row.excellent_min,
        goodMin: row.good_min,
        averageMin: row.average_min,
        passMin: row.pass_min,
      } satisfies ClassificationPolicy
    },
  }
}
