import type { FastifyInstance } from 'fastify'
import { SetUserBranchesRequest, type UserBranchesResponse } from '@lms/shared'
import type { Rbac } from '../access/index.js'
import type { UserBranchesStore } from './service.js'
import { getUserBranches, setUserBranches } from './service.js'

interface UserBranchesRoutesDeps {
  rbac: Rbac
  userBranchesStore: UserBranchesStore
}

/**
 * Route gan Branch cho User (slice-1 Task 4). Chi Admin duoc xem/sua (RBAC that).
 * GET  /users/:id/branches  — Branch dang gan cho User.
 * PUT  /users/:id/branches  — dat lai tap Branch (thay the).
 */
export async function userBranchesRoutes(
  app: FastifyInstance,
  deps: UserBranchesRoutesDeps,
): Promise<void> {
  const { rbac, userBranchesStore } = deps
  const requireAdmin = rbac.requireRole('admin')

  app.get('/users/:id/branches', { preHandler: requireAdmin }, async (request) => {
    const { id } = request.params as { id: string }
    const body: UserBranchesResponse = { branches: await getUserBranches(userBranchesStore, id) }
    return body
  })

  app.put('/users/:id/branches', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = SetUserBranchesRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Danh sach co so khong hop le' }
    }
    const outcome = await setUserBranches(userBranchesStore, id, parsed.data.branchIds)
    if (!outcome.ok) {
      reply.code(outcome.reason === 'user_not_found' ? 404 : 400)
      return {
        error: outcome.reason === 'user_not_found' ? 'Khong tim thay nguoi dung' : 'Co so khong ton tai',
      }
    }
    const body: UserBranchesResponse = { branches: outcome.branches }
    return body
  })
}
