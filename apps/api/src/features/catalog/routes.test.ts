import { randomUUID } from 'node:crypto'
import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import { catalogRoutes } from './routes.js'
import type {
  CatalogStore,
  ClassRow,
  CourseRow,
  EnrollmentRow,
  LevelRow,
} from './service.js'

const LEVEL_STARTER = '10000000-0000-0000-0000-000000000001'
const BRANCH_1 = '20000000-0000-0000-0000-000000000001'
const STUDENT_1 = '30000000-0000-0000-0000-000000000001'

function makeFakeAuthStore(sessionUser: UserRecord | null): AuthStore {
  return {
    async findUserByPhone() {
      return undefined
    },
    async findUserById(id) {
      return sessionUser && sessionUser.id === id ? sessionUser : undefined
    },
    async createSession() {},
    async findSession() {
      if (!sessionUser) return undefined
      return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) }
    },
    async deleteSession() {},
  }
}

/** CatalogStore gia lap trong bo nho; sinh id dang UUID de qua duoc validate cua contract. */
function makeFakeCatalogStore(): CatalogStore {
  const levels: LevelRow[] = [{ id: LEVEL_STARTER, code: 'starter', name: 'Starter' }]
  const courses: CourseRow[] = []
  const classes: ClassRow[] = []
  const enrollments: EnrollmentRow[] = []
  const branches = new Set<string>([BRANCH_1])
  const users = new Set<string>([STUDENT_1])
  const now = new Date('2026-09-16T00:00:00.000Z')
  return {
    async listLevels() {
      return [...levels]
    },
    async findLevelById(id) {
      return levels.find((l) => l.id === id)
    },
    async listCourses() {
      return [...courses]
    },
    async findCourseById(id) {
      return courses.find((c) => c.id === id)
    },
    async createCourse({ levelId, name }) {
      const row: CourseRow = { id: randomUUID(), level_id: levelId, name, created_at: now }
      courses.push(row)
      return row
    },
    async updateCourse(id, input) {
      const row = courses.find((c) => c.id === id)
      if (!row) return undefined
      if (input.levelId !== undefined) row.level_id = input.levelId
      if (input.name !== undefined) row.name = input.name
      return row
    },
    async deleteCourse(id) {
      const idx = courses.findIndex((c) => c.id === id)
      if (idx < 0) return false
      courses.splice(idx, 1)
      return true
    },
    async listClasses(branchIds) {
      if (branchIds && branchIds.length === 0) return []
      const all = [...classes]
      return branchIds ? all.filter((c) => branchIds.includes(c.branch_id)) : all
    },
    async findClassById(id) {
      return classes.find((c) => c.id === id)
    },
    async createClass({ courseId, branchId, name }) {
      const row: ClassRow = {
        id: randomUUID(),
        course_id: courseId,
        branch_id: branchId,
        name,
        created_at: now,
      }
      classes.push(row)
      return row
    },
    async updateClass(id, input) {
      const row = classes.find((c) => c.id === id)
      if (!row) return undefined
      if (input.branchId !== undefined) row.branch_id = input.branchId
      if (input.name !== undefined) row.name = input.name
      return row
    },
    async deleteClass(id) {
      const idx = classes.findIndex((c) => c.id === id)
      if (idx < 0) return false
      classes.splice(idx, 1)
      return true
    },
    async branchExists(id) {
      return branches.has(id)
    },
    async userExists(id) {
      return users.has(id)
    },
    async listEnrollmentsByClass(classId) {
      return enrollments.filter((e) => e.class_id === classId)
    },
    async findEnrollment(classId, studentId) {
      return enrollments.find((e) => e.class_id === classId && e.student_id === studentId)
    },
    async createEnrollment({ classId, studentId }) {
      const row: EnrollmentRow = {
        id: randomUUID(),
        class_id: classId,
        student_id: studentId,
        created_at: now,
      }
      enrollments.push(row)
      return row
    },
    async deleteEnrollment(id) {
      const idx = enrollments.findIndex((e) => e.id === id)
      if (idx < 0) return false
      enrollments.splice(idx, 1)
      return true
    },
  }
}

const ADMIN: UserRecord = { id: 'admin-1', phone_number: '0900000001', password_hash: 'x', role: 'admin' }
const TEACHER: UserRecord = {
  id: 'teacher-1',
  phone_number: '0900000002',
  password_hash: 'x',
  role: 'teacher',
}
const COOKIE = `${SESSION_COOKIE}=any-token`

async function buildTestApp(
  authUser: UserRecord | null,
  catalogStore: CatalogStore = makeFakeCatalogStore(),
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await catalogRoutes(app, { rbac: makeRbac(makeFakeAuthStore(authUser)), catalogStore })
  await app.ready()
  return app
}

describe('catalog routes — RBAC guard', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET /courses returns 401 without a session', async () => {
    app = await buildTestApp(null)
    expect((await app.inject({ method: 'GET', url: '/courses' })).statusCode).toBe(401)
  })

  it('GET /courses returns 403 for a non-admin', async () => {
    app = await buildTestApp(TEACHER)
    const res = await app.inject({ method: 'GET', url: '/courses', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(403)
  })

  it('GET /levels returns the seeded levels for an admin', async () => {
    app = await buildTestApp(ADMIN)
    const res = await app.inject({ method: 'GET', url: '/levels', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(200)
    expect(res.json().levels).toHaveLength(1)
  })
})

describe('catalog routes — Course/Class/Enrollment (admin only)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('creates a course, a class bound to a branch, and enrolls a student', async () => {
    const store = makeFakeCatalogStore()
    app = await buildTestApp(ADMIN, store)

    const course = await app.inject({
      method: 'POST',
      url: '/courses',
      headers: { cookie: COOKIE },
      payload: { levelId: LEVEL_STARTER, name: 'KH1' },
    })
    expect(course.statusCode).toBe(201)
    const courseId = course.json().course.id as string

    const klass = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { cookie: COOKIE },
      payload: { courseId, branchId: BRANCH_1, name: 'Lop 1' },
    })
    expect(klass.statusCode).toBe(201)
    expect(klass.json().class.branchId).toBe(BRANCH_1)
    const classId = klass.json().class.id as string

    const enroll = await app.inject({
      method: 'POST',
      url: '/enrollments',
      headers: { cookie: COOKIE },
      payload: { classId, studentId: STUDENT_1 },
    })
    expect(enroll.statusCode).toBe(201)

    // Ghi danh trung -> 409.
    const dup = await app.inject({
      method: 'POST',
      url: '/enrollments',
      headers: { cookie: COOKIE },
      payload: { classId, studentId: STUDENT_1 },
    })
    expect(dup.statusCode).toBe(409)

    const list = await app.inject({
      method: 'GET',
      url: `/classes/${classId}/enrollments`,
      headers: { cookie: COOKIE },
    })
    expect(list.json().enrollments).toHaveLength(1)
  })

  it('POST /classes returns 400 when the branch does not exist', async () => {
    const store = makeFakeCatalogStore()
    app = await buildTestApp(ADMIN, store)
    const course = await app.inject({
      method: 'POST',
      url: '/courses',
      headers: { cookie: COOKIE },
      payload: { levelId: LEVEL_STARTER, name: 'KH1' },
    })
    const courseId = course.json().course.id as string
    const res = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { cookie: COOKIE },
      payload: { courseId, branchId: '99999999-9999-9999-9999-999999999999', name: 'Lop X' },
    })
    expect(res.statusCode).toBe(400)
  })
})
