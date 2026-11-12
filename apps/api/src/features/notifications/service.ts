import type { AppNotification, NotificationKind, RunRemindersResult } from '@lms/shared'

/** Automatic reminders (slice-9b, ADR 0010): scan -> enqueue (deduped) -> deliver (outbox). */

export const REMINDER_TIME_ZONE = 'Asia/Ho_Chi_Minh'
export const SESSION_REMINDER_WINDOW_MS = 24 * 60 * 60_000
export const MAX_DELIVERY_ATTEMPTS = 3
export const NOTIFICATIONS_PAGE_SIZE = 20
const DELIVERY_BATCH = 100

export type DeliveryChannel = 'console' | 'whatsapp' | 'telegram'

export interface NotificationSender {
  channel: DeliveryChannel
  send(args: { phoneNumber: string; text: string }): Promise<void>
}

/** Latest failed attempt of a student that may be retaken now (cooldown over, exam still open). */
export interface RetakeCandidateRow {
  attempt_id: string
  student_id: string
  exam_title: string
  attempt_number: number
  max_attempts: number
  closes_at: Date
}

/** A non-cancelled session starting inside the window, one row per teacher to remind. */
export interface SessionCandidateRow {
  session_id: string
  teacher_id: string
  class_name: string
  session_date: string
  starts_at: string
}

export interface NewNotification {
  userId: string
  kind: NotificationKind
  title: string
  body: string
  dedupeKey: string
}

export interface PendingDeliveryRow {
  id: string
  phone_number: string
  title: string
  body: string
  delivery_attempts: number
}

export interface NotificationRow {
  id: string
  kind: string
  title: string
  body: string
  created_at: Date
  read_at: Date | null
}

export interface NotificationsStore {
  listRetakeCandidates(now: Date): Promise<RetakeCandidateRow[]>
  listSessionCandidates(from: Date, to: Date): Promise<SessionCandidateRow[]>
  /** Inserts new rows, skipping dedupe keys that already exist; returns how many were inserted. */
  enqueue(items: NewNotification[], channel: DeliveryChannel): Promise<number>
  listPendingDeliveries(limit: number): Promise<PendingDeliveryRow[]>
  markSent(id: string): Promise<void>
  markDeliveryFailed(id: string, error: string, giveUp: boolean): Promise<void>
  listForUser(userId: string, limit: number): Promise<NotificationRow[]>
  countUnread(userId: string): Promise<number>
  markRead(userId: string, id: string): Promise<boolean>
  markAllRead(userId: string): Promise<void>
}

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: REMINDER_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function localDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function retakeReminder(row: RetakeCandidateRow): NewNotification {
  return {
    userId: row.student_id,
    kind: 'retake_reminder',
    title: `Được thi lại: ${row.exam_title}`,
    body: `Bạn có thể thi lại lần ${row.attempt_number + 1}/${row.max_attempts}. Hạn chót: ${DATE_TIME.format(row.closes_at)}.`,
    dedupeKey: `retake:${row.attempt_id}`,
  }
}

export function sessionReminder(row: SessionCandidateRow): NewNotification {
  return {
    userId: row.teacher_id,
    kind: 'session_reminder',
    title: `Lịch dạy: ${row.class_name}`,
    body: `Buổi học lúc ${row.starts_at} ngày ${localDate(row.session_date)}.`,
    dedupeKey: `session:${row.session_id}:${row.teacher_id}`,
  }
}

/** Vietnamese local numbers (0xxxxxxxxx) to the digits-only E.164 form WhatsApp expects. */
export function toE164(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '')
  return digits.startsWith('0') ? `84${digits.slice(1)}` : digits
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function deliverPending(
  store: NotificationsStore,
  sender: NotificationSender,
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (const row of await store.listPendingDeliveries(DELIVERY_BATCH)) {
    try {
      await sender.send({ phoneNumber: row.phone_number, text: `${row.title}\n${row.body}` })
      await store.markSent(row.id)
      sent += 1
    } catch (err) {
      await store.markDeliveryFailed(row.id, errorMessage(err), row.delivery_attempts + 1 >= MAX_DELIVERY_ATTEMPTS)
      failed += 1
    }
  }
  return { sent, failed }
}

export async function runReminders(
  store: NotificationsStore,
  sender: NotificationSender,
  now: Date,
): Promise<RunRemindersResult> {
  const [retakes, sessions] = await Promise.all([
    store.listRetakeCandidates(now),
    store.listSessionCandidates(now, new Date(now.getTime() + SESSION_REMINDER_WINDOW_MS)),
  ])
  const created = await store.enqueue([...retakes.map(retakeReminder), ...sessions.map(sessionReminder)], sender.channel)
  return { created, ...(await deliverPending(store, sender)) }
}

/** One run at a time per process: the scheduler and the admin button share this runner. */
export function makeReminderRunner(store: NotificationsStore, sender: NotificationSender) {
  let inFlight: Promise<RunRemindersResult> | null = null
  return {
    run(now: Date): Promise<RunRemindersResult> {
      inFlight ??= runReminders(store, sender, now).finally(() => {
        inFlight = null
      })
      return inFlight
    },
  }
}
export type ReminderRunner = ReturnType<typeof makeReminderRunner>

export function toNotificationDto(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
  }
}
