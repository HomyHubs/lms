import { sql } from 'kysely'
import { STUDENT_CODE_SEPARATOR, type ClassificationPolicy } from '@lms/shared'
import type { AppDb } from '../../platform/db.js'
import type {
  StudentAggregateRow,
  StudentIdentityRow,
  StudentSearchRow,
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
      // slice-23-c (ADR 0022): ma hoc vien co dau phan cach (`HN-0001`), nhung nguoi dung go lai ma
      // theo tri nho hoac dan tu file cu se khong co dau. So khop theo MA thi bo qua dau phan cach o
      // CA HAI phia; cac truong khac (ten, SDT) van so nguyen ven. Dung hang so tu `@lms/shared` de
      // dinh dang khong bi chep lai lan thu hai trong SQL.
      const codeNeedle = q.toLowerCase().split(STUDENT_CODE_SEPARATOR).join('')
      // Go moi dau phan cach ('-') thi sau khi bo dau con chuoi rong, va `%%` khop TAT CA hoc vien.
      // Roi ve mau goc trong truong hop do: no khong khop ma nao, dung y nguoi dung.
      const codeLike = codeNeedle === '' ? like : `%${codeNeedle}%`
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
            eb(
              sql<string>`replace(lower(coalesce(u.student_code, '')), ${STUDENT_CODE_SEPARATOR}, '')`,
              'like',
              codeLike,
            ),
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

    async loadAggregates(studentId) {
      // slice-30: MOT truy van cho ca 3 panel (truoc day la 3 lenh rieng cho moi ho so).
      // Cac subselect cung chay tren dong `users` cua hoc viên nen khong phu thuoc thu tu join.
      const row = await db
        .selectFrom('users as u')
        .where('u.id', '=', studentId)
        .select([
          // Thi: dem moi luot da cham; diem = trung binh diem CAO NHAT cua tung de (ADR 0006).
          sql<number>`(select count(*)::int from exam_attempts a
            where a.student_id = u.id and a.graded_at is not null)`.as('exam_attempts'),
          sql<number>`(select count(*) filter (where a.passed is true)::int from exam_attempts a
            where a.student_id = u.id and a.graded_at is not null)`.as('exam_passed'),
          sql<number>`(select count(*) filter (where a.passed is false)::int from exam_attempts a
            where a.student_id = u.id and a.graded_at is not null)`.as('exam_failed'),
          sql<number | null>`(select avg(best_pct) from (
              select max(case when a2.max_score > 0 then a2.score::numeric / a2.max_score * 100 end) as best_pct
              from exam_attempts a2
              where a2.student_id = u.id and a2.graded_at is not null
              group by a2.exam_id
            ) b)`.as('avg_score_pct'),
          // Chuyen can: dem theo tung trang thai.
          sql<number>`(select count(*) filter (where r.status = 'present')::int
            from attendance_records r where r.student_id = u.id)`.as('att_present'),
          sql<number>`(select count(*) filter (where r.status = 'absent')::int
            from attendance_records r where r.student_id = u.id)`.as('att_absent'),
          sql<number>`(select count(*) filter (where r.status = 'late')::int
            from attendance_records r where r.student_id = u.id)`.as('att_late'),
          sql<number>`(select count(*) filter (where r.status = 'excused')::int
            from attendance_records r where r.student_id = u.id)`.as('att_excused'),
          // Thoi gian hoc: chi buoi co mat / di muon; phut = thoi luong buoi hoc that.
          sql<number>`(select count(*)::int from attendance_records r
            join class_sessions s on s.id = r.session_id
            where r.student_id = u.id and r.status in ('present','late'))`.as('sessions_attended'),
          sql<number>`(select coalesce(sum(s.duration_minutes), 0)::int from attendance_records r
            join class_sessions s on s.id = r.session_id
            where r.student_id = u.id and r.status in ('present','late'))`.as('study_minutes'),
        ])
        .executeTakeFirst()

      // Hoc viên bi xoa giua 2 truy van: tra so 0, service se doi thanh panel null.
      if (!row) {
        return {
          exam: { attempts: 0, passed: 0, failed: 0, avg_score_pct: null },
          attendance: { present: 0, absent: 0, late: 0, excused: 0 },
          study: { sessions_attended: 0, study_minutes: 0 },
        } satisfies StudentAggregateRow
      }
      return {
        exam: {
          attempts: Number(row.exam_attempts),
          passed: Number(row.exam_passed),
          failed: Number(row.exam_failed),
          avg_score_pct: row.avg_score_pct === null ? null : Number(row.avg_score_pct),
        },
        attendance: {
          present: Number(row.att_present),
          absent: Number(row.att_absent),
          late: Number(row.att_late),
          excused: Number(row.att_excused),
        },
        study: {
          sessions_attended: Number(row.sessions_attended),
          study_minutes: Number(row.study_minutes),
        },
      } satisfies StudentAggregateRow
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
