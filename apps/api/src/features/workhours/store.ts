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

// slice-1 (ADR 0021): `as const` de giu kieu `UserRole` — truoc day mang `string[]` lot qua duoc vi
// `users.role` bi khai bao la `string`.
const WORKER_ROLES = ['staff', 'teacher'] as const

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

/** Kysely implementation of WorkHoursStore on a real Postgres (no mocks). */
export function makeWorkHoursStore(db: AppDb): WorkHoursStore {
  const shiftById = (id: string): Promise<ShiftRow> =>
    db.selectFrom('staff_shifts').select(SHIFT_COLUMNS).where('id', '=', id).executeTakeFirstOrThrow()

  return {
    async checkIn(userId, recordedBy = userId, branchId) {
      try {
        const id = await db.transaction().execute(async (trx) => {
          const shift = await trx.insertInto('staff_shifts')
            .values({ user_id: userId })
            .returning(['id', 'check_in_at'])
            .executeTakeFirstOrThrow()
          await trx.insertInto('shift_events').values({
            shift_id: shift.id, user_id: userId, event_type: 'check_in',
            occurred_at: sql<string>`now()`, recorded_by: recordedBy, branch_id: branchId ?? null,
          }).execute()
          return shift.id
        })
        return shiftById(id)
      } catch (err) {
        if (isUniqueViolation(err)) return undefined
        throw err
      }
    },
    async checkOut(userId, recordedBy = userId, branchId) {
      const id = await db.transaction().execute(async (trx) => {
        const shift = await trx.updateTable('staff_shifts')
          .set({ check_out_at: sql<string>`now()` })
          .where('user_id', '=', userId)
          .where('check_out_at', 'is', null)
          .returning(['id', 'check_out_at'])
          .executeTakeFirst()
        if (!shift || !shift.check_out_at) return undefined
        await trx.insertInto('shift_events').values({
          shift_id: shift.id, user_id: userId, event_type: 'check_out',
          occurred_at: sql<string>`now()`, recorded_by: recordedBy, branch_id: branchId ?? null,
        }).execute()
        return shift.id
      })
      return id ? shiftById(id) : undefined
    },
    async listShiftEvents(userId, { from, to }) {
      const localDate = sql<string>`(occurred_at at time zone ${sql.lit(WORK_TIME_ZONE)})::date`
      return db.selectFrom('shift_events')
        .select(['shift_id', 'event_type', 'occurred_at', 'recorded_by', 'branch_id'])
        .where('user_id', '=', userId)
        .where(localDate, '>=', from).where(localDate, '<', to)
        .orderBy('occurred_at', 'desc').orderBy('id', 'desc').execute()
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
              eb.selectFrom('session_teacher_events').select('session_id').where('teacher_id', '=', teacherId),
            ),
          ]),
        )
      }
      const sessions = await query
        .orderBy('class_sessions.session_date', 'asc')
        .orderBy('class_sessions.starts_at', 'asc')
        .execute()
      if (sessions.length === 0) return []

      const events = await db
        .selectFrom('session_teacher_events')
        .select(['session_id', 'teacher_id'])
        .where('session_id', 'in', sessions.map((s) => s.id))
        .orderBy('id', 'desc')
        .execute()
      const taughtBy = new Map<string, string>()
      for (const event of events) {
        if (!taughtBy.has(event.session_id)) taughtBy.set(event.session_id, event.teacher_id)
      }
      return sessions
        .map((s): WorkSessionRow => ({ ...s, taught_by: taughtBy.get(s.id) ?? null }))
        .filter((s) => !teacherId || s.planned_teacher_id === teacherId || s.taught_by === teacherId)
    },

    async listUsers(userIds) {
      if (userIds.length === 0) return []
      return db
        .selectFrom('users')
        .select(['id', 'phone_number', 'first_name', 'last_name', 'role'])
        .where('id', 'in', userIds)
        .execute()
    },
    async listBranchWorkers(branchIds) {
      if (branchIds.length === 0) return []
      return db
        .selectFrom('users')
        .select(['users.id', 'users.phone_number', 'users.first_name', 'users.last_name', 'users.role'])
        .where('users.role', 'in', WORKER_ROLES)
        .where('users.id', 'in', (eb) =>
          eb.selectFrom('user_branches').select('user_id').where('branch_id', 'in', branchIds),
        )
        .orderBy('users.phone_number', 'asc')
        .execute()
    },
  }
}
