import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import { WORK_TIME_ZONE, type ShiftRow, type WorkHoursStore, type WorkSessionRow } from './service.js'

const LOCAL_CHECK_IN_DATE = sql<string>`(staff_shifts.check_in_at at time zone ${sql.lit(WORK_TIME_ZONE)})::date`
const WORK_DATE = sql<string>`to_char(staff_shifts.check_in_at at time zone ${sql.lit(WORK_TIME_ZONE)}, 'YYYY-MM-DD')`
const SHIFT_COLUMNS = [
  'staff_shifts.id',
  'staff_shifts.user_id',
  'staff_shifts.check_in_at',
  'staff_shifts.check_out_at',
  WORK_DATE.as('work_date'),
] as const

const WORKER_ROLES = ['staff', 'teacher']

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

/** Kysely implementation of WorkHoursStore on a real Postgres (no mocks). */
export function makeWorkHoursStore(db: AppDb): WorkHoursStore {
  const shiftById = (id: string): Promise<ShiftRow> =>
    db.selectFrom('staff_shifts').select(SHIFT_COLUMNS).where('id', '=', id).executeTakeFirstOrThrow()

  return {
    async checkIn(userId) {
      try {
        const inserted = await db
          .insertInto('staff_shifts')
          .values({ user_id: userId })
          .returning('id')
          .executeTakeFirstOrThrow()
        return shiftById(inserted.id)
      } catch (err) {
        if (isUniqueViolation(err)) return undefined
        throw err
      }
    },
    async checkOut(userId) {
      const updated = await db
        .updateTable('staff_shifts')
        .set({ check_out_at: sql<string>`now()` })
        .where('user_id', '=', userId)
        .where('check_out_at', 'is', null)
        .returning('id')
        .executeTakeFirst()
      return updated ? shiftById(updated.id) : undefined
    },
    async findOpenShift(userId) {
      return db
        .selectFrom('staff_shifts')
        .select(SHIFT_COLUMNS)
        .where('user_id', '=', userId)
        .where('check_out_at', 'is', null)
        .executeTakeFirst()
    },
    async listShifts(userIds, { from, to }) {
      if (userIds.length === 0) return []
      return db
        .selectFrom('staff_shifts')
        .select(SHIFT_COLUMNS)
        .where('user_id', 'in', userIds)
        .where(LOCAL_CHECK_IN_DATE, '>=', from)
        .where(LOCAL_CHECK_IN_DATE, '<', to)
        .orderBy('check_in_at', 'asc')
        .execute()
    },

    async listSessions({ from, to, branchIds, teacherId }) {
      if (branchIds && branchIds.length === 0) return []
      let query = db
        .selectFrom('class_sessions')
        .innerJoin('classes', 'classes.id', 'class_sessions.class_id')
        .select([
          'class_sessions.id',
          'class_sessions.class_id',
          'classes.name as class_name',
          sql<string>`to_char(class_sessions.session_date, 'YYYY-MM-DD')`.as('session_date'),
          sql<string>`to_char(class_sessions.starts_at, 'HH24:MI')`.as('starts_at'),
          'class_sessions.duration_minutes',
          'class_sessions.planned_teacher_id',
          'class_sessions.makeup_for_session_id',
          'class_sessions.cancelled_at',
        ])
        .where('class_sessions.session_date', '>=', from)
        .where('class_sessions.session_date', '<', to)
      if (branchIds) query = query.where('classes.branch_id', 'in', branchIds)
      if (teacherId) {
        query = query.where((eb) =>
          eb.or([
            eb('class_sessions.planned_teacher_id', '=', teacherId),
            eb(
              'class_sessions.id',
              'in',
              eb.selectFrom('attendance_records').select('session_id').where('recorded_by', '=', teacherId),
            ),
          ]),
        )
      }
      const sessions = await query
        .orderBy('class_sessions.session_date', 'asc')
        .orderBy('class_sessions.starts_at', 'asc')
        .execute()
      if (sessions.length === 0) return []

      // Flat second query: the latest recorder of each session is the teacher who taught it.
      const recorders = await db
        .selectFrom('attendance_records')
        .select(['session_id', 'recorded_by', sql<Date>`max(recorded_at)`.as('last_recorded_at')])
        .where(
          'session_id',
          'in',
          sessions.map((s) => s.id),
        )
        .groupBy(['session_id', 'recorded_by'])
        .execute()
      const taughtBy = new Map<string, { teacher: string; at: number }>()
      for (const r of recorders) {
        const at = new Date(r.last_recorded_at).getTime()
        const current = taughtBy.get(r.session_id)
        if (!current || at > current.at) taughtBy.set(r.session_id, { teacher: r.recorded_by, at })
      }
      return sessions.map(
        (s): WorkSessionRow => ({ ...s, taught_by: taughtBy.get(s.id)?.teacher ?? null }),
      )
    },

    async listUsers(userIds) {
      if (userIds.length === 0) return []
      return db
        .selectFrom('users')
        .select(['id', 'phone_number', 'role'])
        .where('id', 'in', userIds)
        .execute()
    },
    async listBranchWorkers(branchIds) {
      if (branchIds.length === 0) return []
      return db
        .selectFrom('users')
        .select(['users.id', 'users.phone_number', 'users.role'])
        .where('users.role', 'in', WORKER_ROLES)
        .where('users.id', 'in', (eb) =>
          eb.selectFrom('user_branches').select('user_id').where('branch_id', 'in', branchIds),
        )
        .orderBy('users.phone_number', 'asc')
        .execute()
    },
  }
}
