import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AppConfig } from '../../platform/config.js'
import { authRoutes, SESSION_COOKIE } from './routes.js'
import { hashPassword } from './service.js'
import type { AuthStore, UserRecord } from './service.js'

function makeFakeStore(users: UserRecord[]): AuthStore {
  const sessions = new Map<string, { userId: string; expiresAt: Date }>()
  return {
    async findUserByPhone(phone) {
      return users.find((u) => u.phone_number === phone)
    },
    async findUserById(id) {
      return users.find((u) => u.id === id)
    },
    async createSession({ tokenHash, userId, expiresAt }) {
      sessions.set(tokenHash, { userId, expiresAt })
    },
    async findSession(tokenHash) {
      return sessions.get(tokenHash)
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash)
    },
  }
}

const config = { SESSION_TTL_SECONDS: 3600 } as AppConfig

async function buildTestApp(store: AuthStore): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await authRoutes(app, { store, config })
  await app.ready()
  return app
}

function sessionCookieFrom(setCookie: string | string[] | undefined): string {
  const raw = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie ?? '')
  const match = /lms_session=([^;]+)/.exec(raw)
  return match ? `${SESSION_COOKIE}=${match[1]}` : ''
}

describe('auth routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    const user: UserRecord = {
      id: '11111111-1111-1111-1111-111111111111',
      phone_number: '0901234567',
      password_hash: await hashPassword('secret12'),
      role: 'admin',
    }
    app = await buildTestApp(makeFakeStore([user]))
  })

  afterEach(async () => {
    await app.close()
  })

  it('POST /auth/login sets a session cookie and returns the user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { phoneNumber: '0901234567', password: 'secret12' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.phoneNumber).toBe('0901234567')
    const setCookie = res.headers['set-cookie']
    expect(String(setCookie)).toContain('lms_session=')
    expect(String(setCookie)).toContain('HttpOnly')
  })

  it('POST /auth/login returns 401 for wrong credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { phoneNumber: '0901234567', password: 'wrong-pass' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /auth/login returns 400 for a malformed body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { phoneNumber: 'nope', password: 'x' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /auth/me returns 401 without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /auth/me returns the user with a valid session cookie', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { phoneNumber: '0901234567', password: 'secret12' },
    })
    const cookieHeader = sessionCookieFrom(loginRes.headers['set-cookie'])
    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookieHeader },
    })
    expect(meRes.statusCode).toBe(200)
    expect(meRes.json().user.phoneNumber).toBe('0901234567')
  })

  it('POST /auth/logout clears the session so /auth/me is 401 again', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { phoneNumber: '0901234567', password: 'secret12' },
    })
    const cookieHeader = sessionCookieFrom(loginRes.headers['set-cookie'])

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: cookieHeader },
    })
    expect(logoutRes.statusCode).toBe(204)

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookieHeader },
    })
    expect(meRes.statusCode).toBe(401)
  })
})
