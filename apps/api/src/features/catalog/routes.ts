import type { FastifyInstance } from 'fastify'
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
import type { Rbac } from '../access/index.js'
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
}

/**
 * Route chuong trinh hoc (slice-1 Task 3). Chi Admin duoc CRUD (RBAC that).
 * Level chi doc (seed san). Moi Class gan 1 Branch. Branch-scoped access them o Task 4.
 */
export async function catalogRoutes(app: FastifyInstance, deps: CatalogRoutesDeps): Promise<void> {
  const { rbac, catalogStore } = deps
  const requireAdmin = rbac.requireRole('admin')

  // ----- Levels (chi doc) -----
  app.get('/levels', { preHandler: requireAdmin }, async () => {
    const body: LevelList = { levels: await listLevels(catalogStore) }
    return body
  })

  // ----- Courses -----
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
      return { error: outcome.reason === 'level_not_found' ? 'Cap do khong ton tai' : 'Khong tim thay khoa hoc' }
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

  // ----- Classes (moi Class gan 1 Branch) -----
  app.get('/classes', { preHandler: requireAdmin }, async () => {
    const body: ClassList = { classes: await listClasses(catalogStore) }
    return body
  })

  app.post('/classes', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateClassRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu tao lop khong hop le' }
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
    const ok = await deleteClass(catalogStore, id)
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay lop' }
    }
    reply.code(204)
    return null
  })

  // ----- Enrollments (ghi danh hoc vien vao lop) -----
  app.get('/classes/:id/enrollments', { preHandler: requireAdmin }, async (request) => {
    const { id } = request.params as { id: string }
    const body: EnrollmentList = { enrollments: await listEnrollments(catalogStore, id) }
    return body
  })

  app.post('/enrollments', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = CreateEnrollmentRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu ghi danh khong hop le' }
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
    const ok = await deleteEnrollment(catalogStore, id)
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay ban ghi ghi danh' }
    }
    reply.code(204)
    return null
  })
}
