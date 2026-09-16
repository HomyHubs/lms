import { randomUUID } from 'node:crypto'
import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
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
const BRANCH_2 = '20000000-0000-0000-0000-000000000002'
const STUDENT_1 = '30000000-0000-0000-0000-000000000001'

const ADMIN_A: UserRecord = { id: 'admin-a', phone_number: '0900000001', password_hash: 'x', role: 'admin' }
const ADMIN_B: UserRecord = { id: 'admin-b', phone_number: '0900000002', password_hash: 'x', role: 'admin' }
const TEACHER: UserRecord = {
  id: 'teacher-1',
  phone_number: '0900000003',
  password_hash: 'x',
  role: 'teacher',
}
const COOKIE = `${SESSION_COOKIE}=any-token`

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

/** Pham vi Branch theo tung user (gia lap gan Branch cho User). */
function makeFakeBranchScope(map: Record<string, string[]>): BranchScope {
  return {
    async branchIdsForUser(userId) {
      return map[userId] ?? []
    },
  }
}

function makeFakeCatalogStore(): CatalogStore {
  const levels: LevelRow[] = [{ id: LEVEL_STARTER, code: 'starter', name: 'Starter' }]
  const courses: CourseRow[] = []
  const classes: ClassRow[] = []
  const enrollments: EnrollmentRow[] = []
  const branches = new Set<string>([BRANCH_1, BRANCH_2])
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
    async findEnrollmentById(id) {
      return enrollments.find((e) => e.id === id)
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

async function buildTestApp(
  authUser: UserRecord | null,
  catalogStore: CatalogStore,
  branchScope: BranchScope,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await catalogRoutes(app, { rbac: makeRbac(makeFakeAuthStore(authUser)), catalogStore, branchScope })
  await app.ready()
  return app
}

describe('catalog routes — RBAC guard', () => {
  let app: FastifyInstance | undefined
  const scope = makeFakeBranchScope({})
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET /levels returns 401 without a session', async () => {
    app = await buildTestApp(null, makeFakeCatalogStore(), scope)
    expect((await app.inject({ method: 'GET', url: '/levels' })).statusCode).toBe(401)
  })

  it('GET /levels returns 403 for a non-admin', async () => {
    app = await buildTestApp(TEACHER, makeFakeCatalogStore(), scope)
    const res = await app.inject({ method: 'GET', url: '/levels', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(403)
  })
})

describe('catalog routes — branch-scoped classes (slice-1 Task 4)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('admins only see classes of their assigned branches; enrollment is scoped too', async () => {
    const store = makeFakeCatalogStore()
    // Admin A chi gan Branch 1; Admin B gan ca 2 Branch.
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1], [ADMIN_B.id]: [BRANCH_1, BRANCH_2] })

    // Admin B (co ca 2 Branch) tao 1 khoa hoc + 1 lop o moi Branch.
    app = await buildTestApp(ADMIN_B, store, scope)
    const course = await app.inject({
      method: 'POST',
      url: '/courses',
      headers: { cookie: COOKIE },
      payload: { levelId: LEVEL_STARTER, name: 'KH1' },
    })
    const courseId = course.json().course.id as string

    const classB1 = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { cookie: COOKIE },
      payload: { courseId, branchId: BRANCH_1, name: 'Lop B1' },
    })
    expect(classB1.statusCode).toBe(201)
    const classB1Id = classB1.json().class.id as string

    const classB2 = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { cookie: COOKIE },
      payload: { courseId, branchId: BRANCH_2, name: 'Lop B2' },
    })
    expect(classB2.statusCode).toBe(201)

    // Admin B thay ca 2 lop.
    const listB = await app.inject({ method: 'GET', url: '/classes', headers: { cookie: COOKIE } })
    expect(listB.json().classes).toHaveLength(2)

    // Ghi danh hoc vien vao lop Branch 1 (trong pham vi cua Admin B).
    const enroll = await app.inject({
      method: 'POST',
      url: '/enrollments',
      headers: { cookie: COOKIE },
      payload: { classId: classB1Id, studentId: STUDENT_1 },
    })
    expect(enroll.statusCode).toBe(201)
    await app.close()

    // Admin A (chi Branch 1) chi thay lop cua Branch 1.
    app = await buildTestApp(ADMIN_A, store, scope)
    const listA = await app.inject({ method: 'GET', url: '/classes', headers: { cookie: COOKIE } })
    expect(listA.json().classes).toHaveLength(1)
    expect(listA.json().classes[0].branchId).toBe(BRANCH_1)
  })

  it('rejects creating a class in a branch outside the caller scope (403)', async () => {
    const store = makeFakeCatalogStore()
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1] })
    app = await buildTestApp(ADMIN_A, store, scope)

    const course = await app.inject({
      method: 'POST',
      url: '/courses',
      headers: { cookie: COOKIE },
      payload: { levelId: LEVEL_STARTER, name: 'KH1' },
    })
    const courseId = course.json().course.id as string

    // Branch 2 nam ngoai pham vi cua Admin A -> 403.
    const res = await app.inject({
      method: 'POST',
      url: '/classes',
      headers: { cookie: COOKIE },
      payload: { courseId, branchId: BRANCH_2, name: 'Lop B2' },
    })
    expect(res.statusCode).toBe(403)
  })
})
