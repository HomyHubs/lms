import type { FastifyInstance, FastifyRequest } from 'fastify'
import {
  CreateClassRequest,
  CreateCourseRequest,
  CreateEnrollmentRequest,
  UpdateClassRequest,
  UpdateCourseRequest,
  type ClassList,
  type ClassResponse,
  type CourseList,
  type CourseResponse,
  type EnrollmentList,
  type EnrollmentResponse,
  type LevelList,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import type { CatalogStore } from './service.js'
import {
  createClass,
  createCourse,
  createEnrollment,
  deleteClass,
  deleteCourse,
  deleteEnrollment,
  listClasses,
  listCourses,
  listEnrollments,
  listLevels,
  updateClass,
  updateCourse,
} from './service.js'

interface CatalogRoutesDeps {
  rbac: Rbac
  catalogStore: CatalogStore
  // slice-1 Task 4: pham vi Branch cua nguoi goi (branch-scoped access).
  branchScope: BranchScope
}

/**
 * Route chuong trinh hoc (slice-1 Task 3 + branch-scoped access Task 4).
 * - Level chi doc; Course/Class/Enrollment CRUD (chi Admin sua).
 * - Moi Class gan 1 Branch. Du lieu theo Branch (Class + Enrollment) chi hien/duoc thao tac
 *   trong pham vi Branch da gan cho nguoi goi — ap dung cho ca Admin/Teacher/Student.
 */
export async function catalogRoutes(app: FastifyInstance, deps: CatalogRoutesDeps): Promise<void> {
  const { rbac, catalogStore, branchScope } = deps
  const requireAdmin = rbac.requireRole('admin')
  // Doc du lieu theo Branch: Admin/Teacher/Student deu duoc, nhung bi loc theo Branch gan.
  const requireViewer = rbac.requireRole('admin', 'teacher', 'student')

  const scopeOf = (request: FastifyRequest): Promise<string[]> =>
    branchScope.branchIdsForUser(getSessionUser(request).id)

  /** Kiem tra lop co nam trong pham vi Branch cua nguoi goi hay khong. */
  async function loadClassInScope(
    request: FastifyRequest,
    classId: string,
  ): Promise<{ ok: true; branchId: string } | { ok: false }> {
    const klass = await catalogStore.findClassById(classId)
    if (!klass) return { ok: false }
    const scoped = await scopeOf(request)
    return scoped.includes(klass.branch_id) ? { ok: true, branchId: klass.branch_id } : { ok: false }
  }

  // ----- Levels (chi doc, chi Admin) -----
  app.get('/levels', { preHandler: requireAdmin }, async () => {
    const body: LevelList = { levels: await listLevels(catalogStore) }
    return body
  })

  // ----- Courses (chi Admin) -----
  app.get('/courses', { preHandler: requireAdmin }, async () => {
    const body: CourseList = { courses: await listCourses(catalogStore) }
    return body
  })

  app.post('/courses', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateCourseRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu tao khoa hoc khong hop le' }
    }
    const outcome = await createCourse(catalogStore, parsed.data)
    if (!outcome.ok) {
      reply.code(400)
      return { error: 'Cap do (Level) khong ton tai' }
    }
    reply.code(201)
    const body: CourseResponse = { course: outcome.course }
    return body
  })

  app.patch('/courses/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateCourseRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu cap nhat khong hop le' }
    }
    const outcome = await updateCourse(catalogStore, id, parsed.data)
    if (!outcome.ok) {
      reply.code(outcome.reason === 'level_not_found' ? 400 : 404)
      return {
        error: outcome.reason === 'level_not_found' ? 'Cap do khong ton tai' : 'Khong tim thay khoa hoc',
      }
    }
    const body: CourseResponse = { course: outcome.course }
    return body
  })

  app.delete('/courses/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ok = await deleteCourse(catalogStore, id)
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay khoa hoc' }
    }
    reply.code(204)
    return null
  })

  // ----- Classes (branch-scoped) -----
  app.get('/classes', { preHandler: requireViewer }, async (request) => {
    const branchIds = await scopeOf(request)
    const body: ClassList = { classes: await listClasses(catalogStore, branchIds) }
    return body
  })

  app.post('/classes', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateClassRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu tao lop khong hop le' }
    }
    // Chi tao lop trong Branch thuoc pham vi duoc gan (phan quyen theo Branch la thuc).
    const scoped = await scopeOf(request)
    if (!scoped.includes(parsed.data.branchId)) {
      reply.code(403)
      return { error: 'Co so nam ngoai pham vi duoc gan' }
    }
    const outcome = await createClass(catalogStore, parsed.data)
    if (!outcome.ok) {
      reply.code(400)
      return {
        error: outcome.reason === 'course_not_found' ? 'Khoa hoc khong ton tai' : 'Co so khong ton tai',
      }
    }
    reply.code(201)
    const body: ClassResponse = { class: outcome.class }
    return body
  })

  app.patch('/classes/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateClassRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu cap nhat khong hop le' }
    }
    const scope = await loadClassInScope(request, id)
    if (!scope.ok) {
      reply.code(404)
      return { error: 'Khong tim thay lop' }
    }
    // Neu chuyen lop sang Branch khac, Branch dich cung phai trong pham vi.
    if (parsed.data.branchId !== undefined) {
      const scoped = await scopeOf(request)
      if (!scoped.includes(parsed.data.branchId)) {
        reply.code(403)
        return { error: 'Co so nam ngoai pham vi duoc gan' }
      }
    }
    const outcome = await updateClass(catalogStore, id, parsed.data)
    if (!outcome.ok) {
      reply.code(outcome.reason === 'branch_not_found' ? 400 : 404)
      return { error: outcome.reason === 'branch_not_found' ? 'Co so khong ton tai' : 'Khong tim thay lop' }
    }
    const body: ClassResponse = { class: outcome.class }
    return body
  })

  app.delete('/classes/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const scope = await loadClassInScope(request, id)
    if (!scope.ok) {
      reply.code(404)
      return { error: 'Khong tim thay lop' }
    }
    await deleteClass(catalogStore, id)
    reply.code(204)
    return null
  })

  // ----- Enrollments (branch-scoped theo Branch cua lop) -----
  app.get('/classes/:id/enrollments', { preHandler: requireViewer }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const scope = await loadClassInScope(request, id)
    if (!scope.ok) {
      reply.code(404)
      return { error: 'Khong tim thay lop' }
    }
    const body: EnrollmentList = { enrollments: await listEnrollments(catalogStore, id) }
    return body
  })

  app.post('/enrollments', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateEnrollmentRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu ghi danh khong hop le' }
    }
    // Chi ghi danh vao lop thuoc pham vi Branch duoc gan.
    const scope = await loadClassInScope(request, parsed.data.classId)
    if (!scope.ok) {
      reply.code(404)
      return { error: 'Khong tim thay lop' }
    }
    const outcome = await createEnrollment(catalogStore, parsed.data)
    if (!outcome.ok) {
      reply.code(outcome.reason === 'already_enrolled' ? 409 : 400)
      const message =
        outcome.reason === 'class_not_found'
          ? 'Lop khong ton tai'
          : outcome.reason === 'student_not_found'
            ? 'Hoc vien khong ton tai'
            : 'Hoc vien da duoc ghi danh vao lop nay'
      return { error: message }
    }
    reply.code(201)
    const body: EnrollmentResponse = { enrollment: outcome.enrollment }
    return body
  })

  app.delete('/enrollments/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const enrollment = await catalogStore.findEnrollmentById(id)
    if (!enrollment) {
      reply.code(404)
      return { error: 'Khong tim thay ban ghi ghi danh' }
    }
    const scope = await loadClassInScope(request, enrollment.class_id)
    if (!scope.ok) {
      reply.code(404)
      return { error: 'Khong tim thay ban ghi ghi danh' }
    }
    await deleteEnrollment(catalogStore, id)
    reply.code(204)
    return null
  })
}
