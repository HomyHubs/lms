import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AppConfig } from '../../platform/config.js'
import { authRoutes, SESSION_COOKIE } from './routes.js'
import { hashPassword } from './service.js'
import type { AuthStore, UserRecord } from './service.js'
import { type OtpEmailSender, type OtpRecord, type PasswordResetStore } from './password-reset.js'

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

const config = {
  SESSION_TTL_SECONDS: 3600,
  PASSWORD_RESET_OTP_TTL_SECONDS: 600,
} as AppConfig

/**
 * Store + sender gia lap cho luong quen mat khau (Task 3). Mac dinh: user
 * 'admin@example.com'. Cho phep truy cap `otps`/`sent` de kiem tra.
 */
function makeFakeResetHarness(): {
  store: PasswordResetStore
  sender: OtpEmailSender
  otps: OtpRecord[]
  sent: { email: string; otp: string; expiresAt: Date }[]
} {
  const email = 'admin@example.com'
  const userId = '11111111-1111-1111-1111-111111111111'
  const otps: OtpRecord[] = []
  const sent: { email: string; otp: string; expiresAt: Date }[] = []
  const store: PasswordResetStore = {
    async findUserByEmail(e) {
      return e === email ? { id: userId } : undefined
    },
    async createOtp({ userId: uid, otpHash, expiresAt }) {
      otps.push({
        id: `otp-${otps.length + 1}`,
        userId: uid,
        otpHash,
        attempts: 0,
        consumedAt: null,
        expiresAt,
      })
    },
    async findActiveOtpByEmail(e) {
      if (e !== email) return undefined
      for (let i = otps.length - 1; i >= 0; i--) {
        const rec = otps[i]
        if (rec && rec.consumedAt === null) return rec
      }
      return undefined
    },
    async incrementOtpAttempts(id) {
      const rec = otps.find((o) => o.id === id)
      if (rec) rec.attempts += 1
    },
    async markOtpConsumed(id) {
      const rec = otps.find((o) => o.id === id)
      if (rec) rec.consumedAt = new Date()
    },
    async updateUserPassword() {
      // Khong can kiem tra o tang route (da co unit test service).
    },
  }
  const sender: OtpEmailSender = {
    async sendOtp(input) {
      sent.push(input)
    },
  }
  return { store, sender, otps, sent }
}

async function buildTestApp(
  store: AuthStore,
  reset = makeFakeResetHarness(),
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await authRoutes(app, {
    store,
    config,
    resetStore: reset.store,
    emailSender: reset.sender,
  })
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

describe('password reset routes (Task 3)', () => {
  let user: UserRecord

  beforeEach(async () => {
    user = {
      id: '11111111-1111-1111-1111-111111111111',
      phone_number: '0901234567',
      password_hash: await hashPassword('secret12'),
      role: 'admin',
    }
  })

  it('POST /auth/forgot-password returns ok:true and sends an OTP for a known email', async () => {
    const reset = makeFakeResetHarness()
    const app = await buildTestApp(makeFakeStore([user]), reset)
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'admin@example.com' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().ok).toBe(true)
      expect(reset.sent).toHaveLength(1)
    } finally {
      await app.close()
    }
  })

  it('POST /auth/forgot-password returns ok:true for an unknown email (no enumeration)', async () => {
    const reset = makeFakeResetHarness()
    const app = await buildTestApp(makeFakeStore([user]), reset)
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'nobody@example.com' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().ok).toBe(true)
      expect(reset.sent).toHaveLength(0)
    } finally {
      await app.close()
    }
  })

  it('POST /auth/forgot-password returns 400 for a malformed email', async () => {
    const app = await buildTestApp(makeFakeStore([user]))
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'not-an-email' },
      })
      expect(res.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })

  it('POST /auth/reset-password succeeds with the issued OTP', async () => {
    const reset = makeFakeResetHarness()
    const app = await buildTestApp(makeFakeStore([user]), reset)
    try {
      await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'admin@example.com' },
      })
      const otp = reset.sent.at(-1)!.otp
      const res = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { email: 'admin@example.com', otp, newPassword: 'brandnew8' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().ok).toBe(true)
    } finally {
      await app.close()
    }
  })

  it('POST /auth/reset-password returns 400 for a wrong OTP', async () => {
    const reset = makeFakeResetHarness()
    const app = await buildTestApp(makeFakeStore([user]), reset)
    try {
      await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'admin@example.com' },
      })
      const otp = reset.sent.at(-1)!.otp
      const wrong = otp === '000000' ? '111111' : '000000'
      const res = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { email: 'admin@example.com', otp: wrong, newPassword: 'brandnew8' },
      })
      expect(res.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })

  it('POST /auth/reset-password returns 400 for a malformed body', async () => {
    const app = await buildTestApp(makeFakeStore([user]))
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { email: 'admin@example.com', otp: 'abc', newPassword: 'x' },
      })
      expect(res.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })
})
