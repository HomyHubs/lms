import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  type LoginResponse,
  type MeResponse,
  type OkResponse,
} from '@lms/shared'
import type { AppConfig } from '../../platform/config.js'
import type { AuthStore } from './service.js'
import { login, logout, resolveSession } from './service.js'
import type { PasswordResetStore } from './password-reset.js'
import { requestPasswordReset, resetPassword } from './password-reset.js'
import type { OtpDispatcher } from './channels.js'

/** Ten cookie chua token phien opaque. */
export const SESSION_COOKIE = 'lms_session'

interface AuthRoutesDeps {
  store: AuthStore
  config: AppConfig
  // Task 3 + Slice-2: cong DB + bo dieu phoi OTP da kenh (email/whatsapp/telegram).
  resetStore: PasswordResetStore
  otpDispatcher: OtpDispatcher
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
  const { store, config, resetStore, otpDispatcher } = deps

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

  // POST /auth/forgot-password — gui OTP qua kenh da chon (email/whatsapp/telegram).
  // Rate limit chat (chong spam gui OTP). Luon tra 200 ok:true du email co ton tai
  // hay khong (chong liet ke tai khoan).
  app.post(
    '/auth/forgot-password',
    {
      config: {
        rateLimit: { max: 3, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const parsed = ForgotPasswordRequest.safeParse(request.body)
      if (!parsed.success) {
        reply.code(400)
        return { error: 'Du lieu yeu cau OTP khong hop le' }
      }

      await requestPasswordReset(resetStore, otpDispatcher, {
        email: parsed.data.email,
        channel: parsed.data.channel,
        recipient: parsed.data.recipient,
        ttlSeconds: config.PASSWORD_RESET_OTP_TTL_SECONDS,
      })

      const body: OkResponse = { ok: true }
      return body
    },
  )

  // POST /auth/reset-password — dat lai mat khau bang email + OTP + mat khau moi.
  // Rate limit chat (chong do vet OTP song song voi gioi han so lan nhap sai o service).
  app.post(
    '/auth/reset-password',
    {
      config: {
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const parsed = ResetPasswordRequest.safeParse(request.body)
      if (!parsed.success) {
        reply.code(400)
        return { error: 'Du lieu dat lai mat khau khong hop le' }
      }

      const outcome = await resetPassword(resetStore, {
        email: parsed.data.email,
        otp: parsed.data.otp,
        newPassword: parsed.data.newPassword,
      })

      if (!outcome.ok) {
        reply.code(400)
        const message =
          outcome.reason === 'expired'
            ? 'Ma OTP da het han, vui long yeu cau ma moi'
            : outcome.reason === 'too_many_attempts'
              ? 'Nhap sai qua nhieu lan, vui long yeu cau ma moi'
              : 'Ma OTP khong dung'
        return { error: message }
      }

      const body: OkResponse = { ok: true }
      return body
    },
  )
}
