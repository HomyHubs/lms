import type { FastifyInstance } from 'fastify'
import {
  StudentSearchQuery,
  type StudentProfileResponse,
  type StudentSearchResponse,
} from '@lms/shared'
import { branchScopeOf, getSessionUser, type Rbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { loadStudentProfile, searchStudents, type StudentsStore } from './service.js'

interface StudentsRoutesDeps {
  rbac: Rbac
  studentsStore: StudentsStore
  /** Gioi han du lieu theo co so duoc gan (slice-1 Task 4); superadmin xem toan bo. */
  branchScope: BranchScope
}

/**
 * Menu "Hoc vien" (slice-30): tim kiem + ho so chi tiet. READ-ONLY, tong hop du lieu da co.
 * Mo cho admin/teacher/staff (va superadmin). superadmin vuot branch-scope.
 */
export async function studentsRoutes(app: FastifyInstance, deps: StudentsRoutesDeps): Promise<void> {
  const { rbac, studentsStore: store, branchScope } = deps
  const requireStaff = rbac.requirePermission('student.read')

  // GET /students?q= — tim hoc vien theo ten / SDT, gioi han theo co so cua nguoi dung.
  app.get('/students', { preHandler: requireStaff }, async (request, reply) => {
    const parsed = StudentSearchQuery.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Tu khoa tim kiem khong hop le' }
    }
    const user = getSessionUser(request)
    // `branchScopeOf` tra `undefined` cho superadmin — luat do nam mot cho (ADR 0021).
    const branchIds = await branchScopeOf(user, branchScope)
    const students = await searchStudents(store, parsed.data.q, branchIds)
    const body: StudentSearchResponse = { students }
    return body
  })

  // GET /students/:id/profile — ho so tong hop mot hoc vien (404 khi khong thay / ngoai pham vi).
  app.get('/students/:id/profile', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = getSessionUser(request)
    // `branchScopeOf` tra `undefined` cho superadmin — luat do nam mot cho (ADR 0021).
    const branchIds = await branchScopeOf(user, branchScope)
    const profile = await loadStudentProfile(store, id, branchIds)
    if (!profile) {
      reply.code(404)
      return { error: 'Khong tim thay hoc vien' }
    }
    const body: StudentProfileResponse = { student: profile }
    return body
  })
}
