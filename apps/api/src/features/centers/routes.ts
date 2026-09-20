import type { FastifyInstance } from 'fastify'
import {
  CreateBranchRequest,
  CreateCenterRequest,
  UpdateBranchRequest,
  UpdateCenterRequest,
  type BranchList,
  type BranchResponse,
  type CenterList,
  type CenterResponse,
} from '@lms/shared'
import type { Rbac } from '../access/index.js'
import type { CentersStore } from './service.js'
import {
  createBranch,
  createCenter,
  deleteBranch,
  deleteCenter,
  listBranches,
  listCenters,
  updateBranch,
  updateCenter,
} from './service.js'

interface CentersRoutesDeps {
  rbac: Rbac
  centersStore: CentersStore
}

/**
 * Route quan ly Center + Branch (slice-1 Task 2). Chi Admin duoc CRUD (RBAC that).
 * Branch-scoped access (loc theo Branch cua user) duoc bo sung o Task 4.
 */
export async function centersRoutes(app: FastifyInstance, deps: CentersRoutesDeps): Promise<void> {
  const { rbac, centersStore } = deps
  const requireAdmin = rbac.requireRole('admin')

  // ----- Centers (chi Admin) -----

  app.get('/centers', { preHandler: requireAdmin }, async () => {
    const centers = await listCenters(centersStore)
    const body: CenterList = { centers }
    return body
  })

  app.post('/centers', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateCenterRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu tao trung tam khong hop le' }
    }
    reply.code(201)
    const body: CenterResponse = { center: await createCenter(centersStore, parsed.data) }
    return body
  })

  app.patch('/centers/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateCenterRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu cap nhat khong hop le' }
    }
    const outcome = await updateCenter(centersStore, id, parsed.data)
    if (!outcome.ok) {
      reply.code(404)
      return { error: 'Khong tim thay trung tam' }
    }
    const body: CenterResponse = { center: outcome.center }
    return body
  })

  app.delete('/centers/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ok = await deleteCenter(centersStore, id)
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay trung tam' }
    }
    reply.code(204)
    return null
  })

  // ----- Branches (chi Admin) -----

  app.get('/branches', { preHandler: requireAdmin }, async () => {
    const branches = await listBranches(centersStore)
    const body: BranchList = { branches }
    return body
  })

  app.post('/branches', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateBranchRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu tao co so khong hop le' }
    }
    const outcome = await createBranch(centersStore, parsed.data)
    if (!outcome.ok) {
      reply.code(400)
      return { error: 'Trung tam khong ton tai' }
    }
    reply.code(201)
    const body: BranchResponse = { branch: outcome.branch }
    return body
  })

  app.patch('/branches/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateBranchRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu cap nhat khong hop le' }
    }
    const outcome = await updateBranch(centersStore, id, parsed.data)
    if (!outcome.ok) {
      reply.code(404)
      return { error: 'Khong tim thay co so' }
    }
    const body: BranchResponse = { branch: outcome.branch }
    return body
  })

  app.delete('/branches/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ok = await deleteBranch(centersStore, id)
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay co so' }
    }
    reply.code(204)
    return null
  })
}
