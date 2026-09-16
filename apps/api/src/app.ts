import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyInstance } from 'fastify'
import type { AppConfig } from './platform/config.js'
import type { AppDb } from './platform/db.js'
import {
  authRoutes,
  makeAuthStore,
  makeConsoleEmailSender,
  makePasswordResetStore,
} from './features/auth/index.js'
import { healthRoutes } from './features/health/index.js'
import { makeUsersStore, usersRoutes } from './features/users/index.js'

export interface BuildAppDeps {
  config: AppConfig
  db: AppDb
}

/**
 * Dung Fastify app voi bao mat HTTP co ban (helmet, cors, rate-limit) theo webapp-template.
 * Dang ky cac feature route. Health-check noi thong FE-BE-DB thuc.
 */
export async function buildApp({ config, db }: BuildAppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  })

  await app.register(helmet)
  await app.register(cors, { origin: true, credentials: true })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await app.register(cookie)

  // Auth store dung chung cho authRoutes (dang nhap) va usersRoutes (RBAC guard).
  const authStore = makeAuthStore(db)

  await healthRoutes(app, db)
  await authRoutes(app, {
    store: authStore,
    config,
    resetStore: makePasswordResetStore(db),
    emailSender: makeConsoleEmailSender(app.log),
  })
  // slice-1 Task 1: quan ly nguoi dung + RBAC theo role (chi Admin CRUD user).
  await usersRoutes(app, { authStore, usersStore: makeUsersStore(db) })

  return app
}
