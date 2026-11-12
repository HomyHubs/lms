import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { NotificationList, RunRemindersResult } from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import {
  NOTIFICATIONS_PAGE_SIZE,
  toNotificationDto,
  type NotificationsStore,
  type ReminderRunner,
} from './service.js'

interface NotificationsRoutesDeps {
  rbac: Rbac
  notificationsStore: NotificationsStore
  reminderRunner: ReminderRunner
  now?: () => Date
}

const NotificationParams = z.object({ id: z.string().uuid() })

/**
 * In-app bell + reminder trigger (slice-9b, ADR 0010).
 * - Every signed-in user reads and marks their own notifications.
 * - Admin can run the reminder scan now (the scheduler runs it on an interval too).
 */
export async function notificationsRoutes(app: FastifyInstance, deps: NotificationsRoutesDeps): Promise<void> {
  const { rbac, notificationsStore: store, reminderRunner } = deps
  const now = deps.now ?? (() => new Date())
  const requireUser = rbac.requireRole('admin', 'teacher', 'staff', 'student')
  const requireAdmin = rbac.requireRole('admin')

  app.get('/notifications', { preHandler: requireUser }, async (request) => {
    const userId = getSessionUser(request).id
    const [rows, unreadCount] = await Promise.all([
      store.listForUser(userId, NOTIFICATIONS_PAGE_SIZE),
      store.countUnread(userId),
    ])
    const body: NotificationList = { notifications: rows.map(toNotificationDto), unreadCount }
    return body
  })

  app.post('/notifications/:id/read', { preHandler: requireUser }, async (request, reply) => {
    const params = NotificationParams.safeParse(request.params)
    const found = params.success && (await store.markRead(getSessionUser(request).id, params.data.id))
    if (!found) {
      reply.code(404)
      return { error: 'Khong tim thay thong bao' }
    }
    reply.code(204)
    return null
  })

  app.post('/notifications/read-all', { preHandler: requireUser }, async (request, reply) => {
    await store.markAllRead(getSessionUser(request).id)
    reply.code(204)
    return null
  })

  app.post('/notifications/run', { preHandler: requireAdmin }, async () => {
    const body: RunRemindersResult = await reminderRunner.run(now())
    return body
  })
}
