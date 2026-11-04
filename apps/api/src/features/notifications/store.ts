import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import {
  REMINDER_TIME_ZONE,
  type NotificationsStore,
  type RetakeCandidateRow,
  type SessionCandidateRow,
} from './service.js'

const TZ = sql.lit(REMINDER_TIME_ZONE)

/** Kysely implementation of NotificationsStore on a real Postgres (no mocks). */
export function makeNotificationsStore(db: AppDb): NotificationsStore {
  return {
    async listRetakeCandidates(now) {
      // Only the latest attempt per exam+student counts: a started retake hides the reminder.
      const result = await sql<RetakeCandidateRow>`
        select attempt_id, student_id, exam_title, attempt_number, max_attempts, closes_at
        from (
          select distinct on (a.exam_id, a.student_id)
            a.id as attempt_id, a.student_id, e.title as exam_title, a.attempt_number,
            e.max_attempts, e.closes_at, a.passed,
            coalesce(a.submitted_at, a.deadline_at) + make_interval(mins => e.retake_cooldown_minutes) as available_at
          from exam_attempts a
          join exams e on e.id = a.exam_id
          where e.closes_at > ${now.toISOString()}::timestamptz
          order by a.exam_id, a.student_id, a.attempt_number desc
        ) latest
        where passed = false
          and attempt_number < max_attempts
          and available_at <= ${now.toISOString()}::timestamptz
          and available_at <= closes_at
      `.execute(db)
      return result.rows
    },

    async listSessionCandidates(from, to) {
      const fromTs = sql`${from.toISOString()}::timestamptz`
      const toTs = sql`${to.toISOString()}::timestamptz`
      // The planned teacher is reminded; a session without one reminds every assigned class teacher.
      const result = await sql<SessionCandidateRow>`
        select s.id as session_id,
          coalesce(s.planned_teacher_id, ct.teacher_id) as teacher_id,
          c.name as class_name,
          to_char(s.session_date, 'YYYY-MM-DD') as session_date,
          to_char(s.starts_at, 'HH24:MI') as starts_at
        from class_sessions s
        join classes c on c.id = s.class_id
        left join class_teachers ct on ct.class_id = s.class_id and s.planned_teacher_id is null
        where s.cancelled_at is null
          and coalesce(s.planned_teacher_id, ct.teacher_id) is not null
          and s.session_date between (${fromTs} at time zone ${TZ})::date and (${toTs} at time zone ${TZ})::date
          and (s.session_date + s.starts_at) at time zone ${TZ} >= ${fromTs}
          and (s.session_date + s.starts_at) at time zone ${TZ} < ${toTs}
        order by s.session_date, s.starts_at
      `.execute(db)
      return result.rows
    },

    async enqueue(items, channel) {
      if (items.length === 0) return 0
      const inserted = await db
        .insertInto('notifications')
        .values(
          items.map((n) => ({
            user_id: n.userId,
            kind: n.kind,
            title: n.title,
            body: n.body,
            dedupe_key: n.dedupeKey,
            channel,
          })),
        )
        .onConflict((oc) => oc.column('dedupe_key').doNothing())
        .returning('id')
        .execute()
      return inserted.length
    },

    async listPendingDeliveries(limit) {
      return db
        .selectFrom('notifications')
        .innerJoin('users', 'users.id', 'notifications.user_id')
        .select([
          'notifications.id',
          'users.phone_number',
          'notifications.title',
          'notifications.body',
          'notifications.delivery_attempts',
        ])
        .where('notifications.delivery_status', '=', 'pending')
        .orderBy('notifications.created_at', 'asc')
        .limit(limit)
        .execute()
    },

    async markSent(id) {
      await db
        .updateTable('notifications')
        .set((eb) => ({
          delivery_status: 'sent',
          sent_at: sql<string>`now()`,
          delivery_attempts: eb('delivery_attempts', '+', 1),
          last_error: null,
        }))
        .where('id', '=', id)
        .execute()
    },

    async markDeliveryFailed(id, error, giveUp) {
      await db
        .updateTable('notifications')
        .set((eb) => ({
          delivery_status: giveUp ? 'failed' : 'pending',
          delivery_attempts: eb('delivery_attempts', '+', 1),
          last_error: error.slice(0, 500),
        }))
        .where('id', '=', id)
        .execute()
    },

    async listForUser(userId, limit) {
      return db
        .selectFrom('notifications')
        .select(['id', 'kind', 'title', 'body', 'created_at', 'read_at'])
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute()
    },

    async countUnread(userId) {
      const row = await db
        .selectFrom('notifications')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('user_id', '=', userId)
        .where('read_at', 'is', null)
        .executeTakeFirstOrThrow()
      return Number(row.count)
    },

    async markRead(userId, id) {
      const updated = await db
        .updateTable('notifications')
        .set({ read_at: sql<string>`coalesce(read_at, now())` })
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .returning('id')
        .executeTakeFirst()
      return updated !== undefined
    },

    async markAllRead(userId) {
      await db
        .updateTable('notifications')
        .set({ read_at: sql<string>`now()` })
        .where('user_id', '=', userId)
        .where('read_at', 'is', null)
        .execute()
    },
  }
}
