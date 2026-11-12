import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type { AttendanceStore, SessionRow } from './service.js'

// Postgres `date`/`time` are formatted in SQL so no JS timezone conversion can shift the day.
const SESSION_DATE = sql<string>`to_char(class_sessions.session_date, 'YYYY-MM-DD')`
const SESSION_TIME = sql<string>`to_char(class_sessions.starts_at, 'HH24:MI')`

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

/** Kysely implementation of AttendanceStore on a real Postgres (no mocks). */
export function makeAttendanceStore(db: AppDb): AttendanceStore {
  const sessionQuery = () =>
    db
      .selectFrom('class_sessions')
      .select([
        'class_sessions.id',
        'class_sessions.class_id',
        SESSION_DATE.as('session_date'),
        SESSION_TIME.as('starts_at'),
        'class_sessions.topic',
        'class_sessions.created_at',
        'class_sessions.duration_minutes',
        'class_sessions.makeup_for_session_id',
        'class_sessions.cancelled_at',
      ])

  return {
    async findClass(classId) {
      return db
        .selectFrom('classes')
        .select(['id', 'course_id', 'branch_id', 'name'])
        .where('id', '=', classId)
        .executeTakeFirst()
    },
    async findUserRole(userId) {
      const row = await db.selectFrom('users').select('role').where('id', '=', userId).executeTakeFirst()
      return row?.role
    },

    async listClassTeachers(classId) {
      return db
        .selectFrom('class_teachers')
        .innerJoin('users', 'users.id', 'class_teachers.teacher_id')
        .select(['class_teachers.class_id', 'class_teachers.teacher_id', 'users.phone_number'])
        .where('class_teachers.class_id', '=', classId)
        .orderBy('users.phone_number', 'asc')
        .execute()
    },
    async isClassTeacher(classId, teacherId) {
      const row = await db
        .selectFrom('class_teachers')
        .select('teacher_id')
        .where('class_id', '=', classId)
        .where('teacher_id', '=', teacherId)
        .executeTakeFirst()
      return row !== undefined
    },
    async addClassTeacher(classId, teacherId) {
      const res = await db
        .insertInto('class_teachers')
        .values({ class_id: classId, teacher_id: teacherId })
        .onConflict((oc) => oc.columns(['class_id', 'teacher_id']).doNothing())
        .executeTakeFirst()
      return (res.numInsertedOrUpdatedRows ?? 0n) > 0n
    },
    async removeClassTeacher(classId, teacherId) {
      const res = await db
        .deleteFrom('class_teachers')
        .where('class_id', '=', classId)
        .where('teacher_id', '=', teacherId)
        .executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },
    async listTeachingClasses(teacherId) {
      return db
        .selectFrom('classes')
        .innerJoin('class_teachers', 'class_teachers.class_id', 'classes.id')
        .select(['classes.id', 'classes.course_id', 'classes.branch_id', 'classes.name'])
        .where('class_teachers.teacher_id', '=', teacherId)
        .orderBy('classes.name', 'asc')
        .execute()
    },

    async listSessions(classId) {
      return sessionQuery()
        .where('class_sessions.class_id', '=', classId)
        .orderBy('class_sessions.session_date', 'desc')
        .orderBy('class_sessions.starts_at', 'desc')
        .execute()
    },
    async findSession(sessionId) {
      return sessionQuery().where('class_sessions.id', '=', sessionId).executeTakeFirst()
    },
    async createSession({
      classId,
      sessionDate,
      startsAt,
      topic,
      createdBy,
      durationMinutes,
      makeupForSessionId,
    }) {
      try {
        const inserted = await db
          .insertInto('class_sessions')
          .values({
            class_id: classId,
            session_date: sessionDate,
            starts_at: startsAt,
            topic,
            created_by: createdBy,
            planned_teacher_id: createdBy,
            duration_minutes: durationMinutes,
            makeup_for_session_id: makeupForSessionId,
          })
          .returning('id')
          .executeTakeFirstOrThrow()
        const row: SessionRow | undefined = await sessionQuery()
          .where('class_sessions.id', '=', inserted.id)
          .executeTakeFirst()
        return row
      } catch (err) {
        if (isUniqueViolation(err)) return undefined
        throw err
      }
    },
    async cancelSession(sessionId) {
      const res = await db
        .updateTable('class_sessions')
        .set({ cancelled_at: sql<string>`now()`, updated_at: sql<string>`now()` })
        .where('id', '=', sessionId)
        .where('cancelled_at', 'is', null)
        .where(({ not, exists, selectFrom }) =>
          not(
            exists(
              selectFrom('attendance_records')
                .select('attendance_records.session_id')
                .whereRef('attendance_records.session_id', '=', 'class_sessions.id'),
            ),
          ),
        )
        .executeTakeFirst()
      return (res.numUpdatedRows ?? 0n) > 0n
    },

    async listRoster(classId) {
      return db
        .selectFrom('enrollments')
        .innerJoin('users', 'users.id', 'enrollments.student_id')
        .select(['enrollments.student_id', 'users.phone_number', 'users.first_name', 'users.last_name'])
        .where('enrollments.class_id', '=', classId)
        .orderBy('users.last_name', 'asc')
        .orderBy('users.first_name', 'asc')
        .orderBy('users.phone_number', 'asc')
        .execute()
    },
    async listRecords(sessionId) {
      return db
        .selectFrom('attendance_records')
        .select(['session_id', 'student_id', 'status', 'note'])
        .where('session_id', '=', sessionId)
        .execute()
    },
    async upsertRecords(sessionId, recordedBy, records) {
      if (records.length === 0) return
      const now = new Date().toISOString()
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto('attendance_records')
          .values(
            records.map((r) => ({
              session_id: sessionId,
              student_id: r.studentId,
              status: r.status,
              note: r.note,
              recorded_by: recordedBy,
              recorded_at: now,
            })),
          )
          .onConflict((oc) =>
            oc.columns(['session_id', 'student_id']).doUpdateSet((eb) => ({
              status: eb.ref('excluded.status'),
              note: eb.ref('excluded.note'),
              recorded_by: eb.ref('excluded.recorded_by'),
              recorded_at: eb.ref('excluded.recorded_at'),
            })),
          )
          .execute()
        await trx
          .updateTable('class_sessions')
          .set({ updated_at: now })
          .where('id', '=', sessionId)
          .execute()
      })
    },

    async listStudentHistory(studentId, branchIds) {
      if (branchIds && branchIds.length === 0) return []
      let query = db
        .selectFrom('attendance_records')
        .innerJoin('class_sessions', 'class_sessions.id', 'attendance_records.session_id')
        .innerJoin('classes', 'classes.id', 'class_sessions.class_id')
        .select([
          'attendance_records.session_id',
          'class_sessions.class_id',
          'classes.name as class_name',
          SESSION_DATE.as('session_date'),
          SESSION_TIME.as('starts_at'),
          'class_sessions.topic',
          'attendance_records.status',
          'attendance_records.note',
        ])
        .where('attendance_records.student_id', '=', studentId)
      if (branchIds) query = query.where('classes.branch_id', 'in', branchIds)
      return query
        .orderBy('class_sessions.session_date', 'desc')
        .orderBy('class_sessions.starts_at', 'desc')
        .execute()
    },
    async listScopedRecords({ classId, courseId, studentId, branchIds }) {
      if (branchIds.length === 0) return []
      let query = db
        .selectFrom('attendance_records')
        .innerJoin('class_sessions', 'class_sessions.id', 'attendance_records.session_id')
        .innerJoin('classes', 'classes.id', 'class_sessions.class_id')
        .innerJoin('users', 'users.id', 'attendance_records.student_id')
        .select([
          'attendance_records.student_id',
          'users.phone_number',
          'users.first_name',
          'users.last_name',
          'attendance_records.status',
        ])
        .where('classes.branch_id', 'in', branchIds)
      if (classId) query = query.where('classes.id', '=', classId)
      if (courseId) query = query.where('classes.course_id', '=', courseId)
      if (studentId) query = query.where('attendance_records.student_id', '=', studentId)
      return query.execute()
    },
    async listSessionsOnDate(branchIds, dateIso) {
      if (branchIds.length === 0) return []
      const rows = await db
        .selectFrom('class_sessions')
        .innerJoin('classes', 'classes.id', 'class_sessions.class_id')
        .leftJoin('enrollments', 'enrollments.class_id', 'classes.id')
        .select([
          'classes.id as class_id',
          'classes.name as class_name',
          'class_sessions.id as session_id',
          SESSION_TIME.as('starts_at'),
          db.fn.count('enrollments.student_id').as('enrolled_count'),
        ])
        .where('classes.branch_id', 'in', branchIds)
        .where('class_sessions.cancelled_at', 'is', null)
        .where(
          sql<boolean>`to_char(class_sessions.session_date, 'YYYY-MM-DD') = to_char(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`,
        )
        .groupBy(['classes.id', 'classes.name', 'class_sessions.id', 'class_sessions.starts_at'])
        .orderBy('class_sessions.starts_at', 'asc')
        .execute()
      return rows.map((r) => ({ ...r, enrolled_count: Number(r.enrolled_count) }))
    },
  }
}
