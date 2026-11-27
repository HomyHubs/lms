import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { ClassificationPolicy } from '@lms/shared'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { studentsRoutes } from './routes.js'
import type {
  StudentAttendanceAggRow,
  StudentExamAggRow,
  StudentIdentityRow,
  StudentSearchRow,
  StudentsStore,
  StudentStudyAggRow,
} from './service.js'

const BRANCH_1 = '20000000-0000-4000-8000-000000000001'
const BRANCH_2 = '20000000-0000-4000-8000-000000000002'
const STUDENT_1 = '30000000-0000-4000-8000-000000000001'
const STUDENT_2 = '30000000-0000-4000-8000-000000000002'

const ADMIN_A: UserRecord = { id: 'admin-a', phone_number: '0900000001', password_hash: 'x', role: 'admin' }
const ADMIN_B: UserRecord = { id: 'admin-b', phone_number: '0900000002', password_hash: 'x', role: 'admin' }
const TEACHER: UserRecord = {
  id: 'teacher-1',
  phone_number: '0900000003',
  password_hash: 'x',
  role: 'teacher',
}
const STAFF: UserRecord = { id: 'staff-1', phone_number: '0900000004', password_hash: 'x', role: 'staff' }
const SUPERADMIN: UserRecord = {
  id: 'super-1',
  phone_number: '0900000005',
  password_hash: 'x',
  role: 'superadmin',
}
const STUDENT_USER: UserRecord = {
  id: 'student-user-1',
  phone_number: '0900000006',
  password_hash: 'x',
  role: 'student',
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

interface FakeStudent extends StudentSearchRow {
  branch_id: string
  level_id: string | null
}

/** Policy xep loai mac dinh (ADR 0006) cho moi cap do trong test. */
const TEST_POLICY: ClassificationPolicy = {
  levelId: '40000000-0000-4000-8000-000000000001',
  levelCode: 'starter',
  levelName: 'Starter',
  examWeight: 90,
  attendanceWeight: 10,
  excellentMin: 85,
  goodMin: 70,
  averageMin: 50,
  passMin: 50,
}

/**
 * Store gia: hai hoc vien o hai co so khac nhau.
 * - STUDENT_1 thuoc BRANCH_1, co ma hoc vien, co du lieu thi/chuyen can/gio hoc.
 * - STUDENT_2 thuoc BRANCH_2, du lieu cu chua backfill ma hoc vien.
 */
function makeFakeStudentsStore(): StudentsStore {
  const students: FakeStudent[] = [
    {
      id: STUDENT_1,
      phone_number: '0912345678',
      student_code: 'HV0001',
      full_name: 'Nguyen Van A',
      branch_name: 'Co so 1',
      level_code: 'starter',
      level_id: TEST_POLICY.levelId,
      branch_id: BRANCH_1,
    },
    {
      id: STUDENT_2,
      phone_number: '0987654321',
      student_code: null,
      full_name: 'Tran Thi B',
      branch_name: 'Co so 2',
      level_code: 'mover',
      level_id: TEST_POLICY.levelId,
      branch_id: BRANCH_2,
    },
  ]

  function inScope(row: FakeStudent, branchIds: string[] | undefined): boolean {
    if (!branchIds) return true
    return branchIds.includes(row.branch_id)
  }

  const exams: Record<string, StudentExamAggRow> = {
    [STUDENT_1]: { attempts: 4, passed: 3, failed: 1, avg_score_pct: 82.5 },
  }
  const attendance: Record<string, StudentAttendanceAggRow> = {
    [STUDENT_1]: { present: 9, absent: 1, late: 1, excused: 1 },
  }
  const study: Record<string, StudentStudyAggRow> = {
    [STUDENT_1]: { sessions_attended: 10, study_minutes: 900 },
  }

  return {
    async searchStudents(q, branchIds) {
      const needle = q.trim().toLowerCase()
      return students
        .filter((s) => inScope(s, branchIds))
        .filter(
          (s) =>
            (s.full_name ?? '').toLowerCase().includes(needle) ||
            s.phone_number.includes(needle) ||
            (s.student_code ?? '').toLowerCase().includes(needle),
        )
        .map((s) => ({
          id: s.id,
          phone_number: s.phone_number,
          student_code: s.student_code,
          full_name: s.full_name,
          branch_name: s.branch_name,
          level_code: s.level_code,
        }))
    },
    async findStudentIdentity(id, branchIds) {
      const row = students.find((s) => s.id === id)
      if (!row || !inScope(row, branchIds)) return undefined
      const identity: StudentIdentityRow = {
        id: row.id,
        phone_number: row.phone_number,
        student_code: row.student_code,
        full_name: row.full_name,
        branch_name: row.branch_name,
        level_code: row.level_code,
        level_id: row.level_id,
      }
      return identity
    },
    async loadExamAgg(studentId) {
      return exams[studentId] ?? { attempts: 0, passed: 0, failed: 0, avg_score_pct: null }
    },
    async loadAttendanceAgg(studentId) {
      return attendance[studentId] ?? { present: 0, absent: 0, late: 0, excused: 0 }
    },
    async loadStudyAgg(studentId) {
      return study[studentId] ?? { sessions_attended: 0, study_minutes: 0 }
    },
    async loadPolicy(levelId) {
      return levelId === TEST_POLICY.levelId ? TEST_POLICY : null
    },
  }
}

async function buildTestApp(
  authUser: UserRecord | null,
  store: StudentsStore,
  branchScope: BranchScope,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await studentsRoutes(app, { rbac: makeRbac(makeFakeAuthStore(authUser)), studentsStore: store, branchScope })
  await app.ready()
  return app
}

describe('students routes — RBAC', () => {
  let app: FastifyInstance | undefined
  // Moi user duoc thu trong khoi nay deu duoc gan Co so 1 (de thay duoc du lieu).
  const scope = makeFakeBranchScope({
    [ADMIN_A.id]: [BRANCH_1],
    [TEACHER.id]: [BRANCH_1],
    [STAFF.id]: [BRANCH_1],
  })
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET /students tra 401 khi chua dang nhap', async () => {
    app = await buildTestApp(null, makeFakeStudentsStore(), scope)
    expect((await app.inject({ method: 'GET', url: '/students?q=Nguyen' })).statusCode).toBe(401)
  })

  it('GET /students/:id/profile tra 401 khi chua dang nhap', async () => {
    app = await buildTestApp(null, makeFakeStudentsStore(), scope)
    expect(
      (await app.inject({ method: 'GET', url: `/students/${STUDENT_1}/profile` })).statusCode,
    ).toBe(401)
  })

  it.each([
    ['teacher', TEACHER],
    ['staff', STAFF],
    ['admin', ADMIN_A],
  ])('cho phep %s doc danh sach hoc vien (200)', async (_label, user) => {
    app = await buildTestApp(user, makeFakeStudentsStore(), scope)
    const res = await app.inject({ method: 'GET', url: '/students?q=Nguyen', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(200)
    expect(res.json().students).toHaveLength(1)
  })

  it('chan hoc vien (403) — menu nay la cua quan tri', async () => {
    app = await buildTestApp(STUDENT_USER, makeFakeStudentsStore(), scope)
    const res = await app.inject({ method: 'GET', url: '/students?q=Nguyen', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(403)
  })

  it('tra 400 khi thieu tu khoa tim kiem', async () => {
    app = await buildTestApp(ADMIN_A, makeFakeStudentsStore(), scope)
    const res = await app.inject({ method: 'GET', url: '/students?q=', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(400)
  })
})

describe('students routes — branch-scope (slice-1 Task 4)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('admin chi thay hoc vien thuoc co so duoc gan', async () => {
    const store = makeFakeStudentsStore()
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1], [ADMIN_B.id]: [BRANCH_1, BRANCH_2] })

    app = await buildTestApp(ADMIN_B, store, scope)
    const all = await app.inject({ method: 'GET', url: '/students?q=', headers: { cookie: COOKIE } })
    // Tu khoa rong -> 400; dung tu khoa chung de lay ca hai.
    expect(all.statusCode).toBe(400)
    const listB = await app.inject({ method: 'GET', url: '/students?q=an', headers: { cookie: COOKIE } })
    expect(listB.statusCode).toBe(200)
    await app.close()

    app = await buildTestApp(ADMIN_A, store, scope)
    const listA = await app.inject({ method: 'GET', url: '/students?q=an', headers: { cookie: COOKIE } })
    expect(listA.statusCode).toBe(200)
    expect(listA.json().students).toHaveLength(1)
    expect(listA.json().students[0].id).toBe(STUDENT_1)
  })

  it('admin khong xem duoc ho so hoc vien ngoai co so (404)', async () => {
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1] })
    app = await buildTestApp(ADMIN_A, makeFakeStudentsStore(), scope)

    const ok = await app.inject({
      method: 'GET',
      url: `/students/${STUDENT_1}/profile`,
      headers: { cookie: COOKIE },
    })
    expect(ok.statusCode).toBe(200)

    const blocked = await app.inject({
      method: 'GET',
      url: `/students/${STUDENT_2}/profile`,
      headers: { cookie: COOKIE },
    })
    expect(blocked.statusCode).toBe(404)
    expect(String(blocked.json().error)).toContain('Khong tim thay hoc vien')
  })

  it('superadmin vuot branch-scope: xem duoc hoc vien cua moi co so', async () => {
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1] })
    app = await buildTestApp(SUPERADMIN, makeFakeStudentsStore(), scope)

    const res = await app.inject({
      method: 'GET',
      url: `/students/${STUDENT_2}/profile`,
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().student.id).toBe(STUDENT_2)
  })
})

describe('students routes — ho so tong hop (slice-30)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('tra day du panel thi / chuyen can / thoi gian hoc / xep loai', async () => {
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1] })
    app = await buildTestApp(ADMIN_A, makeFakeStudentsStore(), scope)

    const res = await app.inject({
      method: 'GET',
      url: `/students/${STUDENT_1}/profile`,
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(200)

    const student = res.json().student
    expect(student.studentCode).toBe('HV0001')
    expect(student.fullName).toBe('Nguyen Van A')
    expect(student.branchName).toBe('Co so 1')
    expect(student.exam).toEqual({ attempts: 4, passed: 3, failed: 1, avgScorePct: 82.5 })
    expect(student.attendance).toEqual({
      present: 9,
      absent: 1,
      late: 1,
      excused: 1,
      // (9+1) / (9+1+1) = 90.9% — vắng có phép không bị trừ (ADR 0006).
      ratePct: 90.9,
    })
    expect(student.study).toEqual({ sessionsAttended: 10, studyMinutes: 900 })
    // 90% * 82.5 + 10% * 90.9 = 83.3 -> 'good'.
    expect(student.classification).toEqual({ finalScore: 83.3, label: 'good' })
  })

  it('hoc vien chua co du lieu: cac panel null, ma hoc vien null voi du lieu cu', async () => {
    const scope = makeFakeBranchScope({ [ADMIN_B.id]: [BRANCH_2] })
    app = await buildTestApp(ADMIN_B, makeFakeStudentsStore(), scope)

    const res = await app.inject({
      method: 'GET',
      url: `/students/${STUDENT_2}/profile`,
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(200)

    const student = res.json().student
    expect(student.studentCode).toBeNull()
    expect(student.exam).toBeNull()
    expect(student.attendance).toBeNull()
    expect(student.study).toBeNull()
    expect(student.classification).toBeNull()
  })

  it('tim kiem duoc theo ma hoc vien', async () => {
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1] })
    app = await buildTestApp(ADMIN_A, makeFakeStudentsStore(), scope)

    const res = await app.inject({ method: 'GET', url: '/students?q=HV0001', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(200)
    expect(res.json().students).toHaveLength(1)
    expect(res.json().students[0].studentCode).toBe('HV0001')
  })

  it('tra 404 khi hoc vien khong ton tai', async () => {
    const scope = makeFakeBranchScope({ [ADMIN_A.id]: [BRANCH_1] })
    app = await buildTestApp(ADMIN_A, makeFakeStudentsStore(), scope)

    const res = await app.inject({
      method: 'GET',
      url: '/students/30000000-0000-4000-8000-0000000000ff/profile',
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(404)
  })
})
