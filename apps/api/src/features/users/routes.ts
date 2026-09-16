import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  CreateUserRequest,
  UpdateUserRequest,
  type AdminUserList,
  type AdminUserResponse,
} from '@lms/shared'
import type { AuthStore } from '../auth/index.js'
import { resolveSession, SESSION_COOKIE } from '../auth/index.js'
import type { UsersStore } from './service.js'
import { createUser, deleteUser, getUser, listUsers, updateUser } from './service.js'

interface UsersRoutesDeps {
  // Dung chung store voi authRoutes de resolve phien (RBAC guard).
  authStore: AuthStore
  usersStore: UsersStore
}

/**
 * Guard RBAC that: chi cho qua khi phien hop le VA role === 'admin'.
 * - 401 khi chua dang nhap / phien het han.
 * - 403 khi da dang nhap nhung khong du quyen.
 * Khong duoc de mo (AGENTS slice-1: phan quyen phai la thuc).
 */
function makeRequireAdmin(authStore: AuthStore) {
  return async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = request.cookies[SESSION_COOKIE]
    if (!token) {
      return void reply.code(401).send({ error: 'Chua dang nhap' })
    }
    const user = await resolveSession(authStore, token)
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      return void reply.code(401).send({ error: 'Phien khong hop le hoac da het han' })
    }
    if (user.role !== 'admin') {
      return void reply.code(403).send({ error: 'Khong du quyen (chi Admin)' })
    }
  }
}

export async function usersRoutes(app: FastifyInstance, deps: UsersRoutesDeps): Promise<void> {
  const { authStore, usersStore } = deps
  const requireAdmin = makeRequireAdmin(authStore)

  // GET /users — danh sach user (chi Admin).
  app.get('/users', { preHandler: requireAdmin }, async () => {
    const users = await listUsers(usersStore)
    const body: AdminUserList = { users }
    return body
  })

  // POST /users — tao user moi (chi Admin). 201 khi thanh cong, 409 khi trung SDT.
  app.post('/users', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateUserRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu tao user khong hop le' }
    }
    const outcome = await createUser(usersStore, parsed.data)
    if (!outcome.ok) {
      reply.code(409)
      return { error: 'So dien thoai da duoc su dung' }
    }
    reply.code(201)
    const body: AdminUserResponse = { user: outcome.user }
    return body
  })

  // GET /users/:id — mot user (chi Admin).
  app.get('/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await getUser(usersStore, id)
    if (!user) {
      reply.code(404)
      return { error: 'Khong tim thay user' }
    }
    const body: AdminUserResponse = { user }
    return body
  })

  // PATCH /users/:id — cap nhat role/email/password (chi Admin).
  app.patch('/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateUserRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu cap nhat khong hop le' }
    }
    const outcome = await updateUser(usersStore, id, parsed.data)
    if (!outcome.ok) {
      reply.code(404)
      return { error: 'Khong tim thay user' }
    }
    const body: AdminUserResponse = { user: outcome.user }
    return body
  })

  // DELETE /users/:id — xoa user (chi Admin). 204 khi thanh cong.
  app.delete('/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ok = await deleteUser(usersStore, id)
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay user' }
    }
    reply.code(204)
    return null
  })
}
