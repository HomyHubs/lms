import { randomUUID } from 'node:crypto'
import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { attendanceRoutes } from './routes.js'
import type { AttendanceClassRow, AttendanceStore, RecordRow, SessionRow } from './service.js'

const BRANCH_1 = '20000000-0000-0000-0000-000000000001'
const BRANCH_2 = '20000000-0000-0000-0000-000000000002'
const COURSE = '40000000-0000-0000-0000-000000000001'
const CLASS_1 = '50000000-0000-0000-0000-000000000001'
const CLASS_2 = '50000000-0000-0000-0000-000000000002'

function user(id: string, phone: string, role: string): UserRecord {
  return { id, phone_number: phone, password_hash: 'x', role }
}
const ADMIN_B1 = user('60000000-0000-0000-0000-000000000001', '0900000001', 'admin')
const ADMIN_B2 = user('60000000-0000-0000-0000-000000000002', '0900000002', 'admin')
const TEACHER_1 = user('70000000-0000-0000-0000-000000000001', '0900000011', 'teacher')
const TEACHER_2 = user('70000000-0000-0000-0000-000000000002', '0900000012', 'teacher')
const STUDENT_1 = user('80000000-0000-0000-0000-000000000001', '0900000021', 'student')
const STUDENT_2 = user('80000000-0000-0000-0000-000000000002', '0900000022', 'student')
const STUDENT_3 = user('80000000-0000-0000-0000-000000000003', '0900000023', 'student')
const USERS = [ADMIN_B1, ADMIN_B2, TEACHER_1, TEACHER_2, STUDENT_1, STUDENT_2, STUDENT_3]
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
    return ({ [ADMIN_B1.id]: [BRANCH_1], [ADMIN_B2.id]: [BRANCH_2] } as Record<string, string[]>)[userId] ?? []
  },
}

/** In-memory store: CLASS_1 (branch 1, students 1+2, teacher 1), CLASS_2 (branch 2, student 3). */
function makeFakeStore(): AttendanceStore {
  const classes: AttendanceClassRow[] = [
    { id: CLASS_1, course_id: COURSE, branch_id: BRANCH_1, name: 'Starter A' },
    { id: CLASS_2, course_id: COURSE, branch_id: BRANCH_2, name: 'Starter B' },
  ]
  const enrollments: Record<string, string[]> = {
    [CLASS_1]: [STUDENT_1.id, STUDENT_2.id],
    [CLASS_2]: [STUDENT_3.id],
  }
  const teachers = new Set<string>([`${CLASS_1}:${TEACHER_1.id}`])
  const sessions: SessionRow[] = []
  const records: RecordRow[] = []
  const phone = (id: string) => USERS.find((u) => u.id === id)?.phone_number ?? ''
  const classOf = (sessionId: string) =>
    classes.find((c) => c.id === sessions.find((s) => s.id === sessionId)?.class_id)

  return {
    async findClass(id) {
      return classes.find((c) => c.id === id)
    },
    async findUserRole(id) {
      return USERS.find((u) => u.id === id)?.role
    },
    async listClassTeachers(classId) {
      return [...teachers]
        .map((k) => k.split(':') as [string, string])
        .filter(([c]) => c === classId)
        .map(([c, t]) => ({ class_id: c, teacher_id: t, phone_number: phone(t) }))
    },
    async isClassTeacher(classId, teacherId) {
      return teachers.has(`${classId}:${teacherId}`)
    },
    async addClassTeacher(classId, teacherId) {
      const key = `${classId}:${teacherId}`
      if (teachers.has(key)) return false
      teachers.add(key)
      return true
    },
    async removeClassTeacher(classId, teacherId) {
      return teachers.delete(`${classId}:${teacherId}`)
    },
    async listTeachingClasses(teacherId) {
      return classes.filter((c) => teachers.has(`${c.id}:${teacherId}`))
    },
    async listSessions(classId) {
      return sessions.filter((s) => s.class_id === classId)
    },
    async findSession(id) {
      return sessions.find((s) => s.id === id)
    },
    async createSession({ classId, sessionDate, startsAt, topic, durationMinutes, makeupForSessionId }) {
      if (sessions.some((s) => s.class_id === classId && s.session_date === sessionDate && s.starts_at === startsAt)) {
        return undefined
      }
      const row: SessionRow = {
        id: randomUUID(),
        class_id: classId,
        session_date: sessionDate,
        starts_at: startsAt,
        topic,
        created_at: new Date('2026-11-05T00:00:00.000Z'),
        duration_minutes: durationMinutes,
        makeup_for_session_id: makeupForSessionId,
        cancelled_at: null,
      }
      sessions.push(row)
      return row
    },
    async cancelSession(id) {
      const session = sessions.find((s) => s.id === id)
      if (!session || session.cancelled_at !== null || records.some((r) => r.session_id === id)) return false
      session.cancelled_at = new Date('2026-11-06T00:00:00.000Z')
      return true
    },
    async listRoster(classId) {
      return (enrollments[classId] ?? []).map((id) => ({
        student_id: id,
        phone_number: phone(id),
        first_name: null,
        last_name: null,
      }))
    },
    async listRecords(sessionId) {
      return records.filter((r) => r.session_id === sessionId)
    },
    async upsertRecords(sessionId, _recordedBy, rows) {
      for (const r of rows) {
        const existing = records.find((x) => x.session_id === sessionId && x.student_id === r.studentId)
        if (existing) Object.assign(existing, { status: r.status, note: r.note })
        else records.push({ session_id: sessionId, student_id: r.studentId, status: r.status, note: r.note })
      }
    },
    async listStudentHistory(studentId, branchIds) {
      return records
        .filter((r) => r.student_id === studentId)
        .filter((r) => !branchIds || branchIds.includes(classOf(r.session_id)?.branch_id ?? ''))
        .map((r) => {
          const s = sessions.find((x) => x.id === r.session_id) as SessionRow
          return {
            session_id: s.id,
            class_id: s.class_id,
            class_name: classOf(s.id)?.name ?? '',
            session_date: s.session_date,
            starts_at: s.starts_at,
            topic: s.topic,
            status: r.status,
            note: r.note,
          }
        })
    },
    async listScopedRecords({ classId, courseId, studentId, branchIds }) {
      return records
        .filter((r) => {
          const c = classOf(r.session_id)
          if (!c || !branchIds.includes(c.branch_id)) return false
          if (classId && c.id !== classId) return false
          if (courseId && c.course_id !== courseId) return false
          return !studentId || r.student_id === studentId
        })
        .map((r) => ({
          student_id: r.student_id,
          phone_number: phone(r.student_id),
          first_name: null,
          last_name: null,
          status: r.status,
        }))
    },
    async listSessionsOnDate() {
      return [] as import('./service.js').TodaySessionRow[]
    },
    async listBranchClassRecords(branchId) {
      return records
        .map((r) => ({ klass: classOf(r.session_id), status: r.status }))
        .filter((r) => r.klass?.branch_id === branchId)
        .map((r) => ({ class_id: r.klass!.id, class_name: r.klass!.name, status: r.status }))
    },
  }
}

describe('attendance routes', () => {
  const apps: FastifyInstance[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((a) => a.close()))
  })

  /** One app per session user, all sharing the same store. */
  function makeClient(store: AttendanceStore) {
    return async (sessionUser: UserRecord) => {
      const app = Fastify({ logger: false })
      await app.register(cookie)
      await attendanceRoutes(app, { rbac: makeRbac(makeFakeAuthStore(sessionUser)), attendanceStore: store, branchScope })
      await app.ready()
      apps.push(app)
      return (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
        app.inject({ method, url, headers: COOKIE, ...(payload ? { payload } : {}) })
    }
  }

  async function createMarkedSession(store: AttendanceStore) {
    const teacher = await makeClient(store)(TEACHER_1)
    const created = await teacher('POST', `/classes/${CLASS_1}/sessions`, {
      sessionDate: '2026-11-05',
      startsAt: '18:00',
      topic: 'Unit 1',
    })
    expect(created.statusCode).toBe(201)
    const sessionId = created.json().session.id as string
    const marked = await teacher('PUT', `/sessions/${sessionId}/attendance`, {
      records: [
        { studentId: STUDENT_1.id, status: 'present' },
        { studentId: STUDENT_2.id, status: 'absent', note: 'sick' },
      ],
    })
    return { teacher, sessionId, marked }
  }

  it('lets the assigned teacher create a session and mark attendance for the roster', async () => {
    const store = makeFakeStore()
    const { teacher, sessionId, marked } = await createMarkedSession(store)
    expect(marked.statusCode).toBe(200)
    expect(marked.json().roster).toEqual([
      { studentId: STUDENT_1.id, phoneNumber: '0900000021', firstName: null, lastName: null, status: 'present', note: null },
      { studentId: STUDENT_2.id, phoneNumber: '0900000022', firstName: null, lastName: null, status: 'absent', note: 'sick' },
    ])
    expect((await teacher('GET', '/attendance/classes')).json().classes.map((c: { id: string }) => c.id)).toEqual([
      CLASS_1,
    ])
    // Re-marking updates in place instead of duplicating.
    const remark = await teacher('PUT', `/sessions/${sessionId}/attendance`, {
      records: [{ studentId: STUDENT_2.id, status: 'excused' }],
    })
    expect(remark.json().roster[1]).toMatchObject({ status: 'excused', note: null })
    const dup = await teacher('POST', `/classes/${CLASS_1}/sessions`, { sessionDate: '2026-11-05', startsAt: '18:00' })
    expect(dup.statusCode).toBe(409)
  })

  it('blocks marking by unassigned teachers, admins, students and for non-enrolled students', async () => {
    const store = makeFakeStore()
    const { teacher, sessionId } = await createMarkedSession(store)
    const client = makeClient(store)
    const body = { records: [{ studentId: STUDENT_1.id, status: 'late' }] }

    const otherTeacher = await client(TEACHER_2)
    expect((await otherTeacher('PUT', `/sessions/${sessionId}/attendance`, body)).statusCode).toBe(404)
    expect((await otherTeacher('POST', `/classes/${CLASS_1}/sessions`, { sessionDate: '2026-11-06' })).statusCode).toBe(404)

    const admin = await client(ADMIN_B1)
    expect((await admin('PUT', `/sessions/${sessionId}/attendance`, body)).statusCode).toBe(403)
    expect((await admin('GET', `/sessions/${sessionId}/attendance`)).statusCode).toBe(200)

    const student = await client(STUDENT_1)
    expect((await student('PUT', `/sessions/${sessionId}/attendance`, body)).statusCode).toBe(403)

    const notEnrolled = await teacher('PUT', `/sessions/${sessionId}/attendance`, {
      records: [{ studentId: STUDENT_3.id, status: 'present' }],
    })
    expect(notEnrolled.statusCode).toBe(400)
    expect(notEnrolled.json().studentIds).toEqual([STUDENT_3.id])
  })

  it('cancels only unmarked sessions and accepts make-ups only for untaught sessions of the class', async () => {
    const store = makeFakeStore()
    const { teacher, sessionId: heldId } = await createMarkedSession(store)
    const planned = await teacher('POST', `/classes/${CLASS_1}/sessions`, {
      sessionDate: '2026-11-06',
      startsAt: '18:00',
      durationMinutes: 120,
    })
    expect(planned.json().session).toMatchObject({ durationMinutes: 120, cancelledAt: null })
    const missedId = planned.json().session.id as string

    const admin = await makeClient(store)(ADMIN_B1)
    expect((await admin('POST', `/sessions/${missedId}/cancel`)).statusCode).toBe(403)
    expect((await teacher('POST', `/sessions/${heldId}/cancel`)).statusCode).toBe(409)
    const cancelled = await teacher('POST', `/sessions/${missedId}/cancel`)
    expect(cancelled.statusCode).toBe(200)
    expect(cancelled.json().session.cancelledAt).not.toBeNull()
    expect((await teacher('POST', `/sessions/${missedId}/cancel`)).statusCode).toBe(409)
    const markCancelled = await teacher('PUT', `/sessions/${missedId}/attendance`, {
      records: [{ studentId: STUDENT_1.id, status: 'present' }],
    })
    expect(markCancelled.statusCode).toBe(409)

    const makeupOfHeld = await teacher('POST', `/classes/${CLASS_1}/sessions`, {
      sessionDate: '2026-11-08',
      makeupForSessionId: heldId,
    })
    expect(makeupOfHeld.statusCode).toBe(400)
    const makeup = await teacher('POST', `/classes/${CLASS_1}/sessions`, {
      sessionDate: '2026-11-08',
      makeupForSessionId: missedId,
    })
    expect(makeup.statusCode).toBe(201)
    expect(makeup.json().session).toMatchObject({ makeupForSessionId: missedId, durationMinutes: 90 })
  })

  it('lets admins assign only teachers to classes in their branch scope', async () => {
    const store = makeFakeStore()
    const client = makeClient(store)
    const admin = await client(ADMIN_B1)
    expect((await admin('POST', `/classes/${CLASS_1}/teachers`, { teacherId: STUDENT_1.id })).statusCode).toBe(400)
    expect((await admin('POST', `/classes/${CLASS_2}/teachers`, { teacherId: TEACHER_2.id })).statusCode).toBe(404)
    expect((await admin('POST', `/classes/${CLASS_1}/teachers`, { teacherId: TEACHER_2.id })).statusCode).toBe(201)
    expect((await admin('POST', `/classes/${CLASS_1}/teachers`, { teacherId: TEACHER_2.id })).statusCode).toBe(409)

    const newTeacher = await client(TEACHER_2)
    expect((await newTeacher('POST', `/classes/${CLASS_1}/sessions`, { sessionDate: '2026-11-06' })).statusCode).toBe(201)

    expect((await admin('DELETE', `/classes/${CLASS_1}/teachers/${TEACHER_2.id}`)).statusCode).toBe(204)
    expect((await newTeacher('GET', `/classes/${CLASS_1}/sessions`)).statusCode).toBe(404)
  })

  it('shows history and correct rates to the student and to admins within scope only', async () => {
    const store = makeFakeStore()
    await createMarkedSession(store)
    const client = makeClient(store)

    const student = await client(STUDENT_2)
    const mine = (await student('GET', '/me/attendance')).json()
    expect(mine.history).toHaveLength(1)
    expect(mine.history[0]).toMatchObject({ className: 'Starter A', sessionDate: '2026-11-05', status: 'absent' })
    expect(mine.summary).toMatchObject({ absent: 1, ratePercent: 0 })

    const admin = await client(ADMIN_B1)
    const rates = (await admin('GET', `/attendance/rates?classId=${CLASS_1}`)).json()
    expect(rates.overall).toMatchObject({ present: 1, absent: 1, total: 2, ratePercent: 50 })
    expect(rates.students.map((s: { summary: { ratePercent: number } }) => s.summary.ratePercent)).toEqual([100, 0])
    expect((await admin('GET', `/attendance/rates?courseId=${COURSE}`)).json().overall.total).toBe(2)
    expect((await admin('GET', `/attendance/students/${STUDENT_1.id}`)).json().summary.ratePercent).toBe(100)
    expect((await admin('GET', '/attendance/rates')).statusCode).toBe(400)

    const otherAdmin = await client(ADMIN_B2)
    expect((await otherAdmin('GET', `/attendance/rates?classId=${CLASS_1}`)).statusCode).toBe(404)
    expect((await otherAdmin('GET', `/attendance/students/${STUDENT_1.id}`)).json().history).toEqual([])
  })
})
