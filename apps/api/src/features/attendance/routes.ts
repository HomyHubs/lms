import type { FastifyInstance, FastifyRequest } from 'fastify'
import {
  AssignClassTeacherRequest,
  AttendanceRatesQuery,
  CreateClassSessionRequest,
  MarkAttendanceRequest,
  type AttendanceRates,
  type ClassSessionList,
  type ClassSessionResponse,
  type ClassTeacherList,
  type SessionAttendance,
  type StudentAttendance,
  type TeachingClassList,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import {
  aggregateRates,
  assignTeacher,
  buildRoster,
  buildTodaySummary,
  canMakeUpFor,
  markAttendance,
  summarize,
  toHistoryDto,
  toSessionDto,
  type AttendanceClassRow,
  type AttendanceStore,
  type SessionRow,
} from './service.js'

interface AttendanceRoutesDeps {
  rbac: Rbac
  attendanceStore: AttendanceStore
  /** Branch scope of the caller (slice-1 Task 4): admins only see classes of their branches. */
  branchScope: BranchScope
}

type ClassAccess =
  | { ok: true; klass: AttendanceClassRow; canWrite: boolean }
  | { ok: false }

const CLASS_NOT_FOUND = { error: 'Khong tim thay lop' }
const SESSION_NOT_FOUND = { error: 'Khong tim thay buoi hoc' }
const ONLY_CLASS_TEACHER = { error: 'Chi giao vien phu trach lop moi duoc diem danh' }
const SESSION_CANCELLED = { error: 'Buoi hoc da bi huy' }

/**
 * Attendance routes (slice-6). Real backend RBAC (not stubbed):
 * - Admin: assigns teachers to classes and reads sessions/attendance/rates within branch scope.
 * - Teacher: creates sessions and marks attendance ONLY for classes assigned in class_teachers.
 * - Student: reads their own attendance history + rate.
 * Classes outside the caller's access return 404 so their existence is not leaked.
 */
export async function attendanceRoutes(
  app: FastifyInstance,
  deps: AttendanceRoutesDeps,
): Promise<void> {
  const { rbac, attendanceStore: store, branchScope } = deps
  const requireAdmin = rbac.requireRole('admin')
  const requireTeacher = rbac.requireRole('teacher')
  const requireStudent = rbac.requireRole('student')
  const requireStaff = rbac.requireRole('admin', 'teacher')

  const scopeOf = (request: FastifyRequest): Promise<string[]> =>
    branchScope.branchIdsForUser(getSessionUser(request).id)

  /** Admin: read-only within branch scope. Teacher: read + write when assigned to the class. */
  async function classAccess(request: FastifyRequest, classId: string): Promise<ClassAccess> {
    const klass = await store.findClass(classId)
    if (!klass) return { ok: false }
    const user = getSessionUser(request)
    if (user.role === 'admin') {
      const scoped = await scopeOf(request)
      return scoped.includes(klass.branch_id) ? { ok: true, klass, canWrite: false } : { ok: false }
    }
    if (user.role === 'teacher' && (await store.isClassTeacher(classId, user.id))) {
      return { ok: true, klass, canWrite: true }
    }
    return { ok: false }
  }

  async function adminClassInScope(
    request: FastifyRequest,
    classId: string,
  ): Promise<AttendanceClassRow | undefined> {
    const klass = await store.findClass(classId)
    if (!klass) return undefined
    const scoped = await scopeOf(request)
    return scoped.includes(klass.branch_id) ? klass : undefined
  }

  async function sessionAttendance(session: SessionRow): Promise<SessionAttendance> {
    const [students, records] = await Promise.all([
      store.listRoster(session.class_id),
      store.listRecords(session.id),
    ])
    return { session: toSessionDto(session), roster: buildRoster(students, records) }
  }

  // ----- Class teachers (admin, branch-scoped) -----
  app.get('/classes/:id/teachers', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!(await adminClassInScope(request, id))) {
      reply.code(404)
      return CLASS_NOT_FOUND
    }
    const rows = await store.listClassTeachers(id)
    const body: ClassTeacherList = {
      teachers: rows.map((r) => ({
        classId: r.class_id,
        teacherId: r.teacher_id,
        phoneNumber: r.phone_number,
      })),
    }
    return body
  })

  app.post('/classes/:id/teachers', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = AssignClassTeacherRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu gan giao vien khong hop le' }
    }
    if (!(await adminClassInScope(request, id))) {
      reply.code(404)
      return CLASS_NOT_FOUND
    }
    const outcome = await assignTeacher(store, id, parsed.data.teacherId)
    if (!outcome.ok) {
      reply.code(outcome.reason === 'already_assigned' ? 409 : 400)
      return {
        error:
          outcome.reason === 'already_assigned'
            ? 'Giao vien da duoc gan cho lop nay'
            : 'Nguoi dung khong ton tai hoac khong phai giao vien',
      }
    }
    reply.code(201)
    return { ok: true }
  })

  app.delete(
    '/classes/:id/teachers/:teacherId',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id, teacherId } = request.params as { id: string; teacherId: string }
      if (!(await adminClassInScope(request, id))) {
        reply.code(404)
        return CLASS_NOT_FOUND
      }
      if (!(await store.removeClassTeacher(id, teacherId))) {
        reply.code(404)
        return { error: 'Giao vien chua duoc gan cho lop nay' }
      }
      reply.code(204)
      return null
    },
  )

  // ----- Teacher: classes I teach -----
  app.get('/attendance/classes', { preHandler: requireTeacher }, async (request) => {
    const rows = await store.listTeachingClasses(getSessionUser(request).id)
    const body: TeachingClassList = {
      classes: rows.map((r) => ({
        id: r.id,
        courseId: r.course_id,
        branchId: r.branch_id,
        name: r.name,
      })),
    }
    return body
  })

  // ----- Sessions -----
  app.get('/classes/:id/sessions', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const access = await classAccess(request, id)
    if (!access.ok) {
      reply.code(404)
      return CLASS_NOT_FOUND
    }
    const body: ClassSessionList = { sessions: (await store.listSessions(id)).map(toSessionDto) }
    return body
  })

  app.post('/classes/:id/sessions', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = CreateClassSessionRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu buoi hoc khong hop le' }
    }
    const access = await classAccess(request, id)
    if (!access.ok) {
      reply.code(404)
      return CLASS_NOT_FOUND
    }
    if (!access.canWrite) {
      reply.code(403)
      return ONLY_CLASS_TEACHER
    }
    const { makeupForSessionId } = parsed.data
    if (makeupForSessionId && !(await canMakeUpFor(store, id, makeupForSessionId))) {
      reply.code(400)
      return { error: 'Buoi duoc day bu phai thuoc lop nay va chua duoc day' }
    }
    const created = await store.createSession({
      classId: id,
      sessionDate: parsed.data.sessionDate,
      startsAt: parsed.data.startsAt ?? '00:00',
      topic: parsed.data.topic ? parsed.data.topic : null,
      createdBy: getSessionUser(request).id,
      durationMinutes: parsed.data.durationMinutes ?? 90,
      makeupForSessionId: makeupForSessionId ?? null,
    })
    if (!created) {
      reply.code(409)
      return { error: 'Lop da co buoi hoc vao ngay gio nay' }
    }
    reply.code(201)
    const body: ClassSessionResponse = { session: toSessionDto(created) }
    return body
  })

  // slice-8: a cancelled session is a missed session (not paid); only before attendance exists.
  app.post('/sessions/:id/cancel', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await store.findSession(id)
    const access = session ? await classAccess(request, session.class_id) : { ok: false as const }
    if (!session || !access.ok) {
      reply.code(404)
      return SESSION_NOT_FOUND
    }
    if (!access.canWrite) {
      reply.code(403)
      return ONLY_CLASS_TEACHER
    }
    if (!(await store.cancelSession(id))) {
      reply.code(409)
      return { error: 'Chi huy duoc buoi hoc chua diem danh va chua bi huy' }
    }
    const body: ClassSessionResponse = {
      session: toSessionDto((await store.findSession(id)) as SessionRow),
    }
    return body
  })

  // ----- Attendance of a session -----
  app.get('/sessions/:id/attendance', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await store.findSession(id)
    if (!session || !(await classAccess(request, session.class_id)).ok) {
      reply.code(404)
      return SESSION_NOT_FOUND
    }
    return sessionAttendance(session)
  })

  app.put('/sessions/:id/attendance', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = MarkAttendanceRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Du lieu diem danh khong hop le' }
    }
    const session = await store.findSession(id)
    const access = session ? await classAccess(request, session.class_id) : { ok: false as const }
    if (!session || !access.ok) {
      reply.code(404)
      return SESSION_NOT_FOUND
    }
    if (!access.canWrite) {
      reply.code(403)
      return ONLY_CLASS_TEACHER
    }
    if (session.cancelled_at !== null) {
      reply.code(409)
      return SESSION_CANCELLED
    }
    const outcome = await markAttendance(store, session, getSessionUser(request).id, parsed.data.records)
    if (!outcome.ok) {
      reply.code(400)
      return outcome.reason === 'duplicate_student'
        ? { error: 'Moi hoc vien chi duoc diem danh mot lan trong mot yeu cau' }
        : { error: 'Co hoc vien khong thuoc lop nay', studentIds: outcome.studentIds }
    }
    return sessionAttendance(session)
  })

  // ----- History -----
  app.get('/me/attendance', { preHandler: requireStudent }, async (request) => {
    const rows = await store.listStudentHistory(getSessionUser(request).id)
    const body: StudentAttendance = {
      history: rows.map(toHistoryDto),
      summary: summarize(rows.map((r) => r.status)),
    }
    return body
  })

  app.get('/attendance/students/:id', { preHandler: requireAdmin }, async (request) => {
    const { id } = request.params as { id: string }
    const rows = await store.listStudentHistory(id, await scopeOf(request))
    const body: StudentAttendance = {
      history: rows.map(toHistoryDto),
      summary: summarize(rows.map((r) => r.status)),
    }
    return body
  })

  // ----- Rates (input for slice-7 reports) -----
  app.get('/attendance/rates', { preHandler: requireStaff }, async (request, reply) => {
    const parsed = AttendanceRatesQuery.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Can it nhat mot bo loc hop le: classId, courseId hoac studentId' }
    }
    const { classId, courseId, studentId } = parsed.data
    const user = getSessionUser(request)
    let branchIds: string[]
    if (user.role === 'admin') {
      branchIds = await scopeOf(request)
      if (classId && !(await adminClassInScope(request, classId))) {
        reply.code(404)
        return CLASS_NOT_FOUND
      }
    } else {
      // Teachers may only read rates of a class they are assigned to.
      if (!classId) {
        reply.code(403)
        return { error: 'Giao vien chi xem ty le chuyen can theo lop minh phu trach' }
      }
      const access = await classAccess(request, classId)
      if (!access.ok) {
        reply.code(404)
        return CLASS_NOT_FOUND
      }
      branchIds = [access.klass.branch_id]
    }
    const rows = await store.listScopedRecords({ classId, courseId, studentId, branchIds })
    const body: AttendanceRates = aggregateRates(rows)
    return body
  })

  // slice-9: bar chart "Diem danh hom nay" — lop co buoi hoc hom nay (gio VN), branch-scoped.
  app.get('/attendance/today-summary', { preHandler: requireAdmin }, async (request) => {
    const scoped = await scopeOf(request)
    // Ngay hom nay theo gio VN, dang 'YYYY-MM-DD'. Dung en-CA de co dinh dang ISO,
    // tranh new Date(toLocaleString(...)) bi 'Invalid time value' tren mot so moi truong.
    const todayVN = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    return buildTodaySummary(store, scoped, todayVN)
  })
}
