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
  makeEmailSender,
  makeOtpDispatcher,
  makePasswordResetStore,
  makeTelegramSender,
  makeWhatsAppSender,
} from './features/auth/index.js'
import { healthRoutes } from './features/health/index.js'
import { makeUsersStore, usersRoutes } from './features/users/index.js'
import { makeRbac } from './features/access/index.js'
import { centersRoutes, makeCentersStore } from './features/centers/index.js'
import { catalogRoutes, makeCatalogStore } from './features/catalog/index.js'
import { makeUserBranchesStore, userBranchesRoutes } from './features/userbranches/index.js'

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
  // RBAC guard that dung chung cho cac feature quan tri (slice-1 Task 2+).
  const rbac = makeRbac(authStore)

  // Slice-2: bo dieu phoi OTP da kenh (provider-agnostic). Moi sender doc secret tu env;
  // thieu cau hinh se fallback (email -> console) hoac nem loi ro rang (whatsapp/telegram).
  const otpDispatcher = makeOtpDispatcher(
    makeEmailSender(app.log),
    makeWhatsAppSender(app.log),
    makeTelegramSender(app.log),
    app.log,
  )

  await healthRoutes(app, db)
  await authRoutes(app, {
    store: authStore,
    config,
    resetStore: makePasswordResetStore(db),
    otpDispatcher,
  })
  // slice-1 Task 1: quan ly nguoi dung + RBAC theo role (chi Admin CRUD user).
  await usersRoutes(app, { authStore, usersStore: makeUsersStore(db) })
  // slice-1 Task 2: quan ly Center + Branch (chi Admin).
  await centersRoutes(app, { rbac, centersStore: makeCentersStore(db) })
  // slice-1 Task 4: gan Branch cho User; cung dong vai tro "pham vi Branch" (branch-scoped)
  // cho cac feature du lieu theo Branch (vi du: Class trong catalog).
  const userBranchesStore = makeUserBranchesStore(db)
  // slice-1 Task 3: chuong trinh hoc — Level/Course/Class/Enrollment; Class + Enrollment
  // duoc loc theo Branch da gan cho nguoi goi (slice-1 Task 4).
  await catalogRoutes(app, {
    rbac,
    catalogStore: makeCatalogStore(db),
    branchScope: userBranchesStore,
  })
  // slice-1 Task 4: Admin gan/thay tap Branch cua tung User.
  await userBranchesRoutes(app, { rbac, userBranchesStore })

  return app
}
