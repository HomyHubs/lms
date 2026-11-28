import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from './rbac.js'

/**
 * slice-1 (ADR 0021): `requirePermission` tra cuu ma tran role -> quyen thay vi nhan danh sach role.
 * Test o day kiem dung ba thu ma test theo feature khong chung minh duoc:
 *  - 401 khi chua dang nhap / phien chet;
 *  - 403 khi thieu quyen, va 200 khi co;
 *  - superadmin di qua moi quyen ma khong can liet ke.
 */

const USER_ID = '10000000-0000-4000-8000-000000000001'

function makeFakeAuthStore(sessionUser: UserRecord | null): AuthStore {
  return {
    async findUserByPhone() {
      return undefined
    },
    async findUserById(id) {
      return sessionUser && sessionUser.id === id ? sessionUser : undefined
    },
    async createSession() {},
    async findSession() {
      if (!sessionUser) return undefined
      return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) }
    },
    async deleteSession() {},
  }
}

function userWith(role: UserRecord['role']): UserRecord {
  return { id: USER_ID, phone_number: '0900000001', password_hash: 'x', role }
}

const COOKIE = { cookie: `${SESSION_COOKIE}=any-token` }

async function buildApp(role: UserRecord['role'] | null): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  const rbac = makeRbac(makeFakeAuthStore(role ? userWith(role) : null))
  app.get('/needs-permission', { preHandler: rbac.requirePermission('report.export') }, async () => ({
    ok: true,
  }))
  app.get('/needs-login', { preHandler: rbac.requireRole() }, async () => ({ ok: true }))
  await app.ready()
  return app
}

describe('rbac.requirePermission', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('returns 401 without a session cookie', async () => {
    app = await buildApp('superadmin')
    const res = await app.inject({ method: 'GET', url: '/needs-permission' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when the session does not resolve', async () => {
    app = await buildApp(null)
    const res = await app.inject({ method: 'GET', url: '/needs-permission', headers: COOKIE })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 when the role lacks the permission', async () => {
    app = await buildApp('admin') // admin KHONG duoc export danh sach hoc vien
    const res = await app.inject({ method: 'GET', url: '/needs-permission', headers: COOKIE })
    expect(res.statusCode).toBe(403)
  })

  it('lets superadmin through a permission only superadmin has', async () => {
    app = await buildApp('superadmin')
    const res = await app.inject({ method: 'GET', url: '/needs-permission', headers: COOKIE })
    expect(res.statusCode).toBe(200)
  })

  it('still allows any logged-in user when no role list is given', async () => {
    app = await buildApp('student')
    const res = await app.inject({ method: 'GET', url: '/needs-login', headers: COOKIE })
    expect(res.statusCode).toBe(200)
  })
})
