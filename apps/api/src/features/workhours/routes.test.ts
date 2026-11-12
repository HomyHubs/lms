import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { MyTimesheet, WorkHoursReport } from '@lms/shared'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { workHoursRoutes } from './routes.js'
import type { ShiftRow, WorkHoursStore, WorkSessionRow } from './service.js'

const BRANCH_1 = '20000000-0000-0000-0000-000000000001'
const BRANCH_2 = '20000000-0000-0000-0000-000000000002'
const NOW = new Date('2026-11-20T03:00:00Z')

function user(id: string, role: string): UserRecord {
  return { id, phone_number: `09${id.slice(-8)}`, password_hash: 'x', role }
}
const ADMIN_B1 = user('60000000-0000-0000-0000-000000000001', 'admin')
const TEACHER = user('70000000-0000-0000-0000-000000000001', 'teacher')
const STAFF = user('90000000-0000-0000-0000-000000000001', 'staff')
const STUDENT = user('80000000-0000-0000-0000-000000000001', 'student')
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

/** Staff + teacher work in branch 1; the teacher taught one 90-minute session in branch 1. */
function makeFakeStore(): WorkHoursStore {
  const shifts: ShiftRow[] = []
  const session: WorkSessionRow = {
    id: 'a0000000-0000-0000-0000-000000000001',
    class_id: 'b0000000-0000-0000-0000-000000000001',
    class_name: 'Starter A',
    session_date: '2026-11-10',
    starts_at: '18:00',
    duration_minutes: 90,
    planned_teacher_id: TEACHER.id,
    makeup_for_session_id: null,
    cancelled_at: null,
    taught_by: TEACHER.id,
  }
  const names: Record<string, { first_name: string | null; last_name: string | null }> = {
    [TEACHER.id]: { first_name: 'Hà', last_name: 'Nguyễn Thu' },
    [STAFF.id]: { first_name: null, last_name: null },
  }
  const workers = [STAFF, TEACHER].map((u) => ({
    id: u.id,
    phone_number: u.phone_number,
    first_name: names[u.id]?.first_name ?? null,
    last_name: names[u.id]?.last_name ?? null,
    role: u.role,
  }))
  return {
    async checkIn(userId) {
      if (shifts.some((s) => s.user_id === userId && !s.check_out_at)) return undefined
      const row = { id: `c000000${shifts.length}-0000-0000-0000-000000000001`, user_id: userId, check_in_at: new Date('2026-11-20T01:00:00Z'), check_out_at: null, work_date: '2026-11-20' }
      shifts.push(row)
      return row
    },
    async checkOut(userId) {
      const open = shifts.find((s) => s.user_id === userId && !s.check_out_at)
      if (!open) return undefined
      open.check_out_at = new Date('2026-11-20T09:00:00Z')
      return open
    },
    async findOpenShift(userId) {
      return shifts.find((s) => s.user_id === userId && !s.check_out_at)
    },
    async listShifts(userIds) {
      return shifts.filter((s) => userIds.includes(s.user_id))
    },
    async listSessions({ branchIds, teacherId }) {
      if (branchIds && !branchIds.includes(BRANCH_1)) return []
      if (teacherId && teacherId !== TEACHER.id) return []
      return [session]
    },
    async listUsers(ids) {
      return workers.filter((w) => ids.includes(w.id))
    },
    async listBranchWorkers(branchIds) {
      return branchIds.includes(BRANCH_1) ? workers : []
    },
  }
}

describe('work hours routes', () => {
  const apps: FastifyInstance[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((a) => a.close()))
  })

  function makeClient(store: WorkHoursStore) {
    return async (sessionUser: UserRecord) => {
      const app = Fastify({ logger: false })
      await app.register(cookie)
      await workHoursRoutes(app, {
        rbac: makeRbac(makeFakeAuthStore(sessionUser)),
        workHoursStore: store,
        branchScope,
        now: () => NOW,
      })
      await app.ready()
      apps.push(app)
      return (method: 'GET' | 'POST', url: string) => app.inject({ method, url, headers: COOKIE })
    }
  }

  it('lets staff check in once, check out, and read the closed shift in their month', async () => {
    const staff = await makeClient(makeFakeStore())(STAFF)
    expect((await staff('POST', '/timesheet/check-out')).statusCode).toBe(409)
    expect((await staff('POST', '/timesheet/check-in')).statusCode).toBe(201)
    expect((await staff('POST', '/timesheet/check-in')).statusCode).toBe(409)
    const out = await staff('POST', '/timesheet/check-out')
    expect(out.json().shift).toMatchObject({ workedMinutes: 480 })
    const sheet = (await staff('GET', '/me/timesheet')).json<MyTimesheet>()
    expect(sheet).toMatchObject({
      month: '2026-11',
      openShift: null,
      summary: { workedMinutes: 480, workDays: 1, openShifts: 0 },
      teaching: null,
    })
    expect((await staff('GET', '/me/timesheet?month=2026-13')).statusCode).toBe(400)
  })

  it('gives teachers their teaching summary and keeps students and admins out of check-in', async () => {
    const client = makeClient(makeFakeStore())
    const teacher = await client(TEACHER)
    const sheet = (await teacher('GET', '/me/timesheet?month=2026-11')).json<MyTimesheet>()
    expect(sheet.teaching).toMatchObject({ held: 1, taughtMinutes: 90 })
    expect((await teacher('GET', '/reports/work-hours?month=2026-11')).statusCode).toBe(403)
    expect((await (await client(STUDENT))('POST', '/timesheet/check-in')).statusCode).toBe(403)
    expect((await (await client(ADMIN_B1))('POST', '/timesheet/check-in')).statusCode).toBe(403)
  })

  it('reports teachers and staff of the admin branches only', async () => {
    const store = makeFakeStore()
    const client = makeClient(store)
    await (await client(STAFF))('POST', '/timesheet/check-in')
    const admin = await client(ADMIN_B1)
    const res = await admin('GET', '/reports/work-hours?month=2026-11')
    expect(res.statusCode).toBe(200)
    const report = res.json<WorkHoursReport>()
    expect(report.teachers).toEqual([expect.objectContaining({ teacherId: TEACHER.id, held: 1, taughtMinutes: 90 })])
    expect(report.staff.find((s) => s.userId === STAFF.id)).toMatchObject({ workDays: 1, openShifts: 1, workedMinutes: 0 })
    expect(report.sessions[0]).toMatchObject({ status: 'held', taughtByPhone: TEACHER.phone_number })
    expect((await admin('GET', `/reports/work-hours?month=2026-11&branchId=${BRANCH_2}`)).statusCode).toBe(404)
    expect((await admin('GET', '/reports/work-hours')).statusCode).toBe(400)
  })
})
