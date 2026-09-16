import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PublicUser, UserRole } from '@lms/shared'
import type { AuthStore } from '../auth/index.js'
import { resolveSession, SESSION_COOKIE } from '../auth/index.js'

/**
 * RBAC guard THAT (slice-1) — dung chung cho moi feature quan tri.
 * Resolve phien tu cookie, chan 401/403, va gan `request.sessionUser` de handler dung lai
 * (vi du: loc du lieu theo Branch cua user o Task 4).
 * slice-1 "Khong duoc stub": phan quyen theo role phai la thuc.
 */

// Mo rong FastifyRequest de mang user cua phien qua preHandler -> handler.
declare module 'fastify' {
  interface FastifyRequest {
    sessionUser?: PublicUser
  }
}

export interface Rbac {
  /**
   * preHandler: yeu cau da dang nhap; neu truyen `roles` thi user phai thuoc 1 trong cac role do.
   * - 401 khi chua dang nhap / phien het han.
   * - 403 khi da dang nhap nhung khong du quyen.
   */
  requireRole: (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
}

export function makeRbac(authStore: AuthStore): Rbac {
  function requireRole(...roles: UserRole[]) {
    return async function guard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const token = request.cookies[SESSION_COOKIE]
      if (!token) {
        return void reply.code(401).send({ error: 'Chua dang nhap' })
      }
      const user = await resolveSession(authStore, token)
      if (!user) {
        reply.clearCookie(SESSION_COOKIE, { path: '/' })
        return void reply.code(401).send({ error: 'Phien khong hop le hoac da het han' })
      }
      if (roles.length > 0 && !roles.includes(user.role)) {
        return void reply.code(403).send({ error: 'Khong du quyen' })
      }
      request.sessionUser = user
    }
  }
  return { requireRole }
}

/**
 * Lay user cua phien da duoc guard gan. Chi goi sau `requireRole` nen luon co gia tri;
 * neu thieu (loi lap trinh: quen preHandler) thi nem loi ro rang thay vi tra du lieu sai quyen.
 */
export function getSessionUser(request: FastifyRequest): PublicUser {
  if (!request.sessionUser) {
    throw new Error('getSessionUser duoc goi khi chua qua requireRole guard')
  }
  return request.sessionUser
}
