import type { FastifyInstance, FastifyReply } from 'fastify'
import { LoginRequest, type LoginResponse, type MeResponse } from '@lms/shared'
import type { AppConfig } from '../../platform/config.js'
import type { AuthStore } from './service.js'
import { login, logout, resolveSession } from './service.js'

/** Ten cookie chua token phien opaque. */
export const SESSION_COOKIE = 'lms_session'

interface AuthRoutesDeps {
  store: AuthStore
  config: AppConfig
}

function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // secure chi bat o production (dev chay HTTP localhost).
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function authRoutes(app: FastifyInstance, deps: AuthRoutesDeps): Promise<void> {
  const { store, config } = deps

  // POST /auth/login — rate limit chat hon (chong do vet mat khau).
  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const parsed = LoginRequest.safeParse(request.body)
      if (!parsed.success) {
        reply.code(400)
        return { error: 'Du lieu dang nhap khong hop le' }
      }

      const result = await login(store, {
        phoneNumber: parsed.data.phoneNumber,
        password: parsed.data.password,
        ttlSeconds: config.SESSION_TTL_SECONDS,
      })

      if (!result) {
        reply.code(401)
        return { error: 'So dien thoai hoac mat khau khong dung' }
      }

      setSessionCookie(reply, result.token, result.expiresAt)
      const body: LoginResponse = { user: result.user }
      return body
    },
  )

  // POST /auth/logout — xoa phien hien tai (neu co).
  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) {
      await logout(store, token)
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    reply.code(204)
    return null
  })

  // GET /auth/me — thong tin phien hien tai.
  app.get('/auth/me', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (!token) {
      reply.code(401)
      return { error: 'Chua dang nhap' }
    }
    const user = await resolveSession(store, token)
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      reply.code(401)
      return { error: 'Phien khong hop le hoac da het han' }
    }
    const body: MeResponse = { user }
    return body
  })
}
