import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { NotificationList } from '@lms/shared'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import { notificationsRoutes } from './routes.js'
import type { NotificationRow, NotificationsStore, ReminderRunner } from './service.js'

const ADMIN: UserRecord = { id: '60000000-0000-0000-0000-000000000001', phone_number: '0901234567', password_hash: 'x', role: 'admin' }
const STUDENT: UserRecord = { id: '80000000-0000-0000-0000-000000000001', phone_number: '0933000001', password_hash: 'x', role: 'student' }
const TEACHER: UserRecord = { id: '70000000-0000-0000-0000-000000000001', phone_number: '0911000001', password_hash: 'x', role: 'teacher' }
const NOTE_ID = 'a0000000-0000-0000-0000-000000000001'
const OTHER_ID = 'a0000000-0000-0000-0000-000000000002'
const COOKIE = { cookie: `${SESSION_COOKIE}=any-token` }

function makeFakeAuthStore(sessionUser: UserRecord): AuthStore {
  return {
    async findUserByPhone() {
      return undefined
    },
    async findUserById(id) {
      return sessionUser.id === id ? sessionUser : undefined
    },
    async createSession() {},
    async findSession() {
      return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) }
    },
    async deleteSession() {},
  }
}

/** The student owns one unread notification; read state is per row. */
function makeFakeStore(): NotificationsStore {
  const row: NotificationRow & { user_id: string } = {
    id: NOTE_ID,
    user_id: STUDENT.id,
    kind: 'retake_reminder',
    title: 'Được thi lại: Starter Reading',
    body: 'Bạn có thể thi lại lần 2/3.',
    created_at: new Date('2026-11-11T03:00:00Z'),
    read_at: null,
  }
  const unused = async (): Promise<never> => {
    throw new Error('not used by routes')
  }
  return {
    listRetakeCandidates: unused,
    listSessionCandidates: unused,
    enqueue: unused,
    listPendingDeliveries: unused,
    markSent: unused,
    markDeliveryFailed: unused,
    async listForUser(userId) {
      return row.user_id === userId ? [row] : []
    },
    async countUnread(userId) {
      return row.user_id === userId && !row.read_at ? 1 : 0
    },
    async markRead(userId, id) {
      if (row.user_id !== userId || row.id !== id) return false
      row.read_at = new Date('2026-11-11T04:00:00Z')
      return true
    },
    async markAllRead() {},
  }
}

const runner: ReminderRunner = {
  async run() {
    return { created: 2, sent: 2, failed: 0 }
  },
}

describe('notifications routes', () => {
  const apps: FastifyInstance[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((a) => a.close()))
  })

  async function client(sessionUser: UserRecord, store: NotificationsStore) {
    const app = Fastify({ logger: false })
    await app.register(cookie)
    await notificationsRoutes(app, { rbac: makeRbac(makeFakeAuthStore(sessionUser)), notificationsStore: store, reminderRunner: runner })
    await app.ready()
    apps.push(app)
    return (method: 'GET' | 'POST', url: string) => app.inject({ method, url, headers: COOKIE })
  }

  it('lists only the caller notifications and marks one read', async () => {
    const store = makeFakeStore()
    const student = await client(STUDENT, store)
    const before = (await student('GET', '/notifications')).json<NotificationList>()
    expect(before).toEqual({
      notifications: [expect.objectContaining({ id: NOTE_ID, kind: 'retake_reminder', readAt: null })],
      unreadCount: 1,
    })
    expect((await student('POST', `/notifications/${NOTE_ID}/read`)).statusCode).toBe(204)
    const after = (await student('GET', '/notifications')).json<NotificationList>()
    expect(after.unreadCount).toBe(0)
    expect(after.notifications[0]?.readAt).toBe('2026-11-11T04:00:00.000Z')
    expect((await student('POST', `/notifications/${OTHER_ID}/read`)).statusCode).toBe(404)
    expect((await student('POST', '/notifications/not-a-uuid/read')).statusCode).toBe(404)

    const teacher = await client(TEACHER, store)
    expect((await teacher('GET', '/notifications')).json<NotificationList>()).toEqual({ notifications: [], unreadCount: 0 })
    expect((await teacher('POST', `/notifications/${NOTE_ID}/read`)).statusCode).toBe(404)
  })

  it('lets only admins run the reminder scan', async () => {
    const store = makeFakeStore()
    expect((await (await client(TEACHER, store))('POST', '/notifications/run')).statusCode).toBe(403)
    const res = await (await client(ADMIN, store))('POST', '/notifications/run')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ created: 2, sent: 2, failed: 0 })
  })
})
