import type { FastifyReply, FastifyRequest } from 'fastify'
import { can, isAllowed, type Permission, type PublicUser, type UserRole } from '@lms/shared'
import type { AuthStore } from '../auth/index.js'
import { resolveSession, SESSION_COOKIE } from '../auth/index.js'

/**
 * RBAC guard THAT (slice-1) — dung chung cho moi feature quan tri.
 * Resolve phien tu cookie, chan 401/403, va gan `request.sessionUser` de handler dung lai
 * (vi du: loc du lieu theo Branch cua user o Task 4).
 * slice-1 "Khong duoc stub": phan quyen theo role phai la thuc.
 *
 * slice-1 huong toi thieu: quyen KHONG con la danh sach role viet tai tung route. `requirePermission`
 * tra cuu ma tran role -> quyen o `@lms/shared` (mot cho duy nhat); `requireRole` giu lai cho cac route
 * chi yeu cau dang nhap. Luat "superadmin vuot moi guard" nam trong `isAllowed`/`can`.
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
  /**
   * preHandler: yeu cau dang nhap VA co quyen (tra cuu `ROLE_PERMISSIONS`).
   * Dung cai nay thay cho `requireRole('admin','teacher')` — danh sach role chi con o `@lms/shared`.
   */
  requirePermission: (
    ...permissions: Permission[]
  ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
}

export function makeRbac(authStore: AuthStore): Rbac {
  /** Resolve phien + gan `request.sessionUser`; tra null khi da tra loi 401. */
  async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<PublicUser | null> {
    const token = request.cookies[SESSION_COOKIE]
    if (!token) {
      void reply.code(401).send({ error: 'Chua dang nhap' })
      return null
    }
    const user = await resolveSession(authStore, token)
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      void reply.code(401).send({ error: 'Phien khong hop le hoac da het han' })
      return null
    }
    request.sessionUser = user
    return user
  }

  function requireRole(...roles: UserRole[]) {
    return async function guard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const user = await authenticate(request, reply)
      if (!user) return
      // Luat superadmin vuot guard nam trong `isAllowed`, khong lap lai o day.
      if (!isAllowed(user.role, roles)) {
        return void reply.code(403).send({ error: 'Khong du quyen' })
      }
    }
  }

  function requirePermission(...permissions: Permission[]) {
    return async function guard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const user = await authenticate(request, reply)
      if (!user) return
      // Tat ca quyen yeu cau deu phai co (mac dinh AND) — dung y do khi mot route can 2 dieu kien.
      if (!permissions.every((p) => can(user.role, p))) {
        return void reply.code(403).send({ error: 'Khong du quyen' })
      }
    }
  }

  return { requireRole, requirePermission }
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
