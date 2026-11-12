import { z } from 'zod'

/**
 * In-app notifications + automatic reminders contract (slice-9b, ADR 0010).
 * Every reminder is shown in the bell; the external channel (WhatsApp/Telegram/console) is best effort.
 */

export const NOTIFICATION_KINDS = ['retake_reminder', 'session_reminder'] as const
export const NotificationKind = z.enum(NOTIFICATION_KINDS)
export type NotificationKind = z.infer<typeof NotificationKind>

export const AppNotification = z.object({
  id: z.string().uuid(),
  kind: NotificationKind,
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
})
export type AppNotification = z.infer<typeof AppNotification>

export const NotificationList = z.object({
  notifications: z.array(AppNotification),
  unreadCount: z.number().int().nonnegative(),
})
export type NotificationList = z.infer<typeof NotificationList>

export const RunRemindersResult = z.object({
  created: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
})
export type RunRemindersResult = z.infer<typeof RunRemindersResult>
