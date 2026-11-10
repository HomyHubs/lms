import type { FastifyInstance } from 'fastify'
import {
  StudentReportQuery,
  UpdateClassificationPolicyRequest,
  type ClassificationPolicy,
  type ClassificationPolicyList,
  type StudentReport,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { loadStudentReport, toPolicyDto, type ReportsStore } from './service.js'

interface ReportsRoutesDeps {
  rbac: Rbac
  reportsStore: ReportsStore
  /** Admins only see data of their assigned branches (slice-1 Task 4). */
  branchScope: BranchScope
}

/**
 * Admin reports (slice-7): classification policy per level, dashboard + ranking.
 * Every number is computed from real exam attempts and attendance within the admin's branches.
 */
export async function reportsRoutes(app: FastifyInstance, deps: ReportsRoutesDeps): Promise<void> {
  const { rbac, reportsStore: store, branchScope } = deps
  const requireAdmin = rbac.requireRole('admin')

  app.get('/reports/classification-policies', { preHandler: requireAdmin }, async () => {
    const body: ClassificationPolicyList = { policies: (await store.listPolicies()).map(toPolicyDto) }
    return body
  })

  app.put(
    '/reports/classification-policies/:levelId',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { levelId } = request.params as { levelId: string }
      const parsed = UpdateClassificationPolicyRequest.safeParse(request.body)
      if (!parsed.success) {
        reply.code(400)
        return { error: parsed.error.issues[0]?.message ?? 'Cau hinh xep loai khong hop le' }
      }
      if (!(await store.levelExists(levelId))) {
        reply.code(404)
        return { error: 'Cap do khong ton tai' }
      }
      await store.upsertPolicy(levelId, parsed.data)
      const row = (await store.listPolicies()).find((p) => p.level_id === levelId)
      const body: ClassificationPolicy = toPolicyDto(row as NonNullable<typeof row>)
      return body
    },
  )

  app.get('/reports/students', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = StudentReportQuery.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Bo loc bao cao khong hop le' }
    }
    const { branchId, levelId, classId, from, to } = parsed.data
    const user = getSessionUser(request)
    // superadmin vuot branch-scope: thay tat ca co so (branchIds = undefined).
    const scoped =
      user.role === 'superadmin' ? undefined : await branchScope.branchIdsForUser(user.id)
    if (branchId && scoped && !scoped.includes(branchId)) {
      reply.code(404)
      return { error: 'Khong tim thay co so' }
    }
    const body: StudentReport = await loadStudentReport(
      store,
      { branchIds: branchId ? [branchId] : scoped, levelId, classId },
      { from, to },
    )
    return body
  })

  // GET /reports/students/export — CHI superadmin duoc xuat danh sach hoc vien ra file
  // (slice-1 revised: chong ro ri thong tin; admin thuong chi xem tren man hinh, khong export).
  // superadmin vuot branch-scope nen export duoc toan bo.
  app.get(
    '/reports/students/export',
    { preHandler: rbac.requireRole('superadmin') },
    async (request, reply) => {
      const parsed = StudentReportQuery.safeParse(request.query)
      if (!parsed.success) {
        reply.code(400)
        return { error: 'Bo loc bao cao khong hop le' }
      }
      const { branchId, levelId, classId, from, to } = parsed.data
      const body: StudentReport = await loadStudentReport(
        store,
        { branchIds: branchId ? [branchId] : undefined, levelId, classId },
        { from, to },
      )
      return body
    },
  )
}
