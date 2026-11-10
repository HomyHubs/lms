import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { ExamHistoryPage, StudentReport } from '@lms/shared'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { examHistoryRoutes, type ExamHistoryStore, type HistoryAttemptRow } from '../examhistory/index.js'
import { reportsRoutes } from './routes.js'
import type { EnrollmentRow, GradedAttemptRow, PolicyRow, ReportsStore } from './service.js'

const LEVEL = '10000000-0000-0000-0000-000000000001'
const BRANCH_1 = '20000000-0000-0000-0000-000000000001'
const BRANCH_2 = '20000000-0000-0000-0000-000000000002'
const CLASS_1 = '50000000-0000-0000-0000-000000000001'
const CLASS_2 = '50000000-0000-0000-0000-000000000002'
const STUDENT_1 = '80000000-0000-0000-0000-000000000001'
const STUDENT_2 = '80000000-0000-0000-0000-000000000002'

function user(id: string, role: string): UserRecord {
  return { id, phone_number: `09${id.slice(-8)}`, password_hash: 'x', role }
}
const ADMIN_B1 = user('60000000-0000-0000-0000-000000000001', 'admin')
const TEACHER = user('70000000-0000-0000-0000-000000000001', 'teacher')
const COOKIE = { cookie: `${SESSION_COOKIE}=any-token` }

function makeFakeAuthStore(sessionUser: UserRecord): AuthStore {
  return {
    async findUserByPhone() {
      return undefined
    },
    async findUserById(id) {
      return sessionUser.id === id ? sessionUser : undefined
    },
    async createSession() {},
    async findSession() {
      return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) }
    },
    async deleteSession() {},
  }
}

const branchScope: BranchScope = {
  async branchIdsForUser(userId) {
    return userId === ADMIN_B1.id ? [BRANCH_1] : []
  },
}

function enrollment(classId: string, branchId: string, studentId: string): EnrollmentRow {
  return {
    class_id: classId,
    class_name: classId === CLASS_1 ? 'Starter A' : 'Starter B',
    branch_id: branchId,
    branch_name: branchId === BRANCH_1 ? 'Co so 1' : 'Co so 2',
    level_id: LEVEL,
    level_code: 'starter',
    student_id: studentId,
    phone_number: `09${studentId.slice(-8)}`,
    student_name: null,
  }
}

/** Student 1 in branch 1 (exam 80%, attendance 100%), student 2 in branch 2 (exam 40%). */
function makeFakeStore(): ReportsStore {
  const policy: PolicyRow = {
    level_id: LEVEL,
    level_code: 'starter',
    level_name: 'Starter',
    exam_weight: 90,
    attendance_weight: 10,
    excellent_min: 85,
    good_min: 70,
    average_min: 50,
    pass_min: 50,
  }
  const enrollments = [enrollment(CLASS_1, BRANCH_1, STUDENT_1), enrollment(CLASS_2, BRANCH_2, STUDENT_2)]
  const graded = (id: string, studentId: string, score: number, passed: boolean): GradedAttemptRow => ({
    id,
    student_id: studentId,
    exam_id: 'exam-1',
    level_id: LEVEL,
    attempt_number: 1,
    score,
    max_score: 10,
    passed,
    max_attempts: 3,
    graded_month: '2026-11',
  })
  const attempts = [graded('a1', STUDENT_1, 8, true), graded('a2', STUDENT_2, 4, false)]
  return {
    async listPolicies() {
      return [policy]
    },
    async levelExists(levelId) {
      return levelId === LEVEL
    },
    async upsertPolicy(_levelId, p) {
      Object.assign(policy, {
        exam_weight: p.examWeight,
        attendance_weight: p.attendanceWeight,
        excellent_min: p.excellentMin,
        good_min: p.goodMin,
        average_min: p.averageMin,
        pass_min: p.passMin,
      })
    },
    async listEnrollments({ branchIds, classId }) {
      // branchIds undefined = superadmin (khong loc co so), giong store that.
      return enrollments.filter(
        (e) =>
          (!branchIds || branchIds.includes(e.branch_id)) &&
          (!classId || e.class_id === classId),
      )
    },
    async listGradedAttempts(studentIds) {
      return attempts.filter((a) => studentIds.includes(a.student_id))
    },
    async listAttendanceStatuses(classIds) {
      return classIds.includes(CLASS_1)
        ? [{ class_id: CLASS_1, student_id: STUDENT_1, status: 'present' }]
        : []
    },
  }
}

describe('reports routes', () => {
  const apps: FastifyInstance[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((a) => a.close()))
  })

  async function client(sessionUser: UserRecord, store: ReportsStore) {
    const app = Fastify({ logger: false })
    await app.register(cookie)
    await reportsRoutes(app, { rbac: makeRbac(makeFakeAuthStore(sessionUser)), reportsStore: store, branchScope })
    await app.ready()
    apps.push(app)
    return (method: 'GET' | 'PUT', url: string, payload?: object) =>
      app.inject({ method, url, headers: COOKIE, ...(payload ? { payload } : {}) })
  }

  it('is admin-only', async () => {
    const teacher = await client(TEACHER, makeFakeStore())
    expect((await teacher('GET', '/reports/students')).statusCode).toBe(403)
    expect((await teacher('GET', '/reports/classification-policies')).statusCode).toBe(403)
  })

  it('reports only the branches assigned to the admin', async () => {
    const admin = await client(ADMIN_B1, makeFakeStore())
    const res = await admin('GET', '/reports/students')
    expect(res.statusCode).toBe(200)
    const body = res.json<StudentReport>()
    expect(body.ranking.map((r) => r.studentId)).toEqual([STUDENT_1])
    // 0.9 * 80 + 0.1 * 100 = 82
    expect(body.ranking[0]).toMatchObject({ finalScore: 82, classification: 'good', rank: 1 })
    expect(body.totals).toMatchObject({ students: 1, passed: 1, failed: 0 })
    expect((await admin('GET', `/reports/students?branchId=${BRANCH_2}`)).statusCode).toBe(404)
    expect((await admin('GET', '/reports/students?from=11-2026')).statusCode).toBe(400)
  })

  it('applies a reconfigured level policy to the classification', async () => {
    const admin = await client(ADMIN_B1, makeFakeStore())
    const invalid = await admin('PUT', `/reports/classification-policies/${LEVEL}`, {
      examWeight: 90,
      attendanceWeight: 20,
      excellentMin: 85,
      goodMin: 70,
      averageMin: 50,
      passMin: 50,
    })
    expect(invalid.statusCode).toBe(400)
    const updated = await admin('PUT', `/reports/classification-policies/${LEVEL}`, {
      examWeight: 50,
      attendanceWeight: 50,
      excellentMin: 90,
      goodMin: 70,
      averageMin: 50,
      passMin: 50,
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json()).toMatchObject({ levelId: LEVEL, examWeight: 50, attendanceWeight: 50 })
    const body = (await admin('GET', '/reports/students')).json<StudentReport>()
    // 0.5 * 80 + 0.5 * 100 = 90 -> excellent under the new bands
    expect(body.ranking[0]).toMatchObject({ finalScore: 90, classification: 'excellent' })
  })
})

describe('exam history routes', () => {
  const apps: FastifyInstance[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((a) => a.close()))
  })

  const row: HistoryAttemptRow = {
    id: '90000000-0000-0000-0000-000000000001',
    exam_id: '90000000-0000-0000-0000-000000000002',
    exam_title: 'Starter reading',
    level_code: 'starter',
    skill: 'reading',
    mode: 'random',
    exam_set_title: null,
    attempt_number: 1,
    started_at: new Date('2026-11-15T09:45:00Z'),
    submitted_at: new Date('2026-11-15T10:00:00Z'),
    deadline_at: new Date('2026-11-15T10:15:00Z'),
    submit_reason: 'manual',
    score: 8,
    max_score: 10,
    passed: true,
    graded_at: new Date('2026-11-15T10:00:00Z'),
    student_id: STUDENT_1,
    student_phone: '0900000001',
  }
  const store: ExamHistoryStore = {
    async listStudentAttempts(studentId) {
      return studentId === STUDENT_1 ? [row] : []
    },
    async isStudentInBranches(studentId, branchIds) {
      return studentId === STUDENT_1 && branchIds.includes(BRANCH_1)
    },
    async listScopedAttempts() {
      return [row]
    },
  }

  async function client(sessionUser: UserRecord) {
    const app = Fastify({ logger: false })
    await app.register(cookie)
    await examHistoryRoutes(app, { rbac: makeRbac(makeFakeAuthStore(sessionUser)), examHistoryStore: store, branchScope })
    await app.ready()
    apps.push(app)
    return (url: string) => app.inject({ method: 'GET', url, headers: COOKIE })
  }

  it('shows a student only to managers of the branch the student is enrolled in', async () => {
    const admin = await client(ADMIN_B1)
    const res = await admin(`/students/${STUDENT_1}/exam-attempts`)
    expect(res.statusCode).toBe(200)
    expect(res.json<ExamHistoryPage>().attempts[0]).toMatchObject({
      attemptNumber: 1,
      durationSeconds: 900,
      percent: 80,
      submitReason: 'manual',
      status: 'graded',
    })
    expect((await admin(`/students/${STUDENT_2}/exam-attempts`)).statusCode).toBe(403)
    expect((await (await client(TEACHER))(`/students/${STUDENT_1}/exam-attempts`)).statusCode).toBe(403)

    const student = await client(user(STUDENT_1, 'student'))
    expect((await student('/me/exam-attempts')).json<ExamHistoryPage>().attempts).toHaveLength(1)
    expect((await student('/me/exam-attempts?cursor=bad')).statusCode).toBe(400)
    expect((await student(`/students/${STUDENT_1}/exam-attempts`)).statusCode).toBe(403)
  })
})
