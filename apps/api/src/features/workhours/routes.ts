import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  TimesheetQuery,
  WorkHoursReportQuery,
  type MyTimesheet,
  type StaffShiftResponse,
  type TeacherTimesheet,
  type WorkHoursReport,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import {
  loadTeacherSummary,
  loadWorkHoursReport,
  localMonth,
  monthRange,
  summarizeShifts,
  toShiftDto,
  type WorkHoursStore,
} from './service.js'

interface WorkHoursRoutesDeps {
  rbac: Rbac
  workHoursStore: WorkHoursStore
  /** Admins only see staff + sessions of their assigned branches (slice-1 Task 4). */
  branchScope: BranchScope
  now?: () => Date
}

/**
 * Work days + teaching hours (slice-8, ADR 0007).
 * - Staff/teacher: check in/out and read their own month.
 * - Admin: monthly report (teachers from real attendance, staff from shifts) within branch scope.
 */
export async function workHoursRoutes(
  app: FastifyInstance,
  deps: WorkHoursRoutesDeps,
): Promise<void> {
  const { rbac, workHoursStore: store, branchScope } = deps
  const now = deps.now ?? (() => new Date())
  const requireWorker = rbac.requirePermission('workhours.read')
  const requireAdmin = rbac.requirePermission('workhours.manage')

  app.post('/timesheet/check-in', { preHandler: requireWorker }, async (request, reply) => {
    const shift = await store.checkIn(getSessionUser(request).id)
    if (!shift) {
      reply.code(409)
      return { error: 'Ban dang trong ca, hay check-out truoc' }
    }
    reply.code(201)
    const body: StaffShiftResponse = { shift: toShiftDto(shift) }
    return body
  })

  app.post('/timesheet/check-out', { preHandler: requireWorker }, async (request, reply) => {
    const shift = await store.checkOut(getSessionUser(request).id)
    if (!shift) {
      reply.code(409)
      return { error: 'Ban chua check-in' }
    }
    const body: StaffShiftResponse = { shift: toShiftDto(shift) }
    return body
  })

  app.get('/me/timesheet', { preHandler: requireWorker }, async (request, reply) => {
    const parsed = TimesheetQuery.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Thang khong hop le (YYYY-MM)' }
    }
    const user = getSessionUser(request)
    const month = parsed.data.month ?? localMonth(now())
    const [shifts, openShift] = await Promise.all([
      store.listShifts([user.id], monthRange(month)),
      store.findOpenShift(user.id),
    ])
    const teaching =
      user.role === 'teacher'
        ? await loadTeacherSummary(
            store,
            // Timesheet riêng của GV không hiển thị tên nên không cần tra cứu hồ sơ ở đây.
            { id: user.id, phone_number: user.phoneNumber, first_name: null, last_name: null, role: user.role },
            month,
            now(),
          )
        : null
    const body: MyTimesheet = {
      month,
      openShift: openShift ? toShiftDto(openShift) : null,
      shifts: shifts.map(toShiftDto),
      summary: summarizeShifts(shifts),
      teaching,
    }
    return body
  })

  const teacherParams = z.object({ teacherId: z.string().uuid() })
  const teacherQuery = WorkHoursReportQuery.extend({ branchId: z.string().uuid() })
  async function teacherInScope(adminId: string, teacherId: string, branchId: string): Promise<boolean> {
    const scoped = await branchScope.branchIdsForUser(adminId)
    if (!scoped.includes(branchId)) return false
    return (await store.listBranchWorkers([branchId])).some((worker) => worker.id === teacherId && worker.role === 'teacher')
  }

  app.get('/admin/teachers/:teacherId/timesheet', { preHandler: requireAdmin }, async (request, reply) => {
    const params = teacherParams.safeParse(request.params)
    const query = teacherQuery.safeParse(request.query)
    if (!params.success || !query.success) return reply.code(400).send({ error: 'Bo loc khong hop le' })
    const { teacherId } = params.data
    const { month, branchId } = query.data
    if (!await teacherInScope(getSessionUser(request).id, teacherId, branchId)) return reply.code(404).send({ error: 'Khong tim thay giao vien' })
    const [open, allEvents] = await Promise.all([store.findOpenShift(teacherId), store.listShiftEvents(teacherId, monthRange(month))])
    const events = allEvents.filter((event) => event.branch_id === null || event.branch_id === branchId)
    const actors = await store.listUsers([...new Set(events.flatMap((e) => e.recorded_by ? [e.recorded_by] : []))])
    const phones = new Map(actors.map((actor) => [actor.id, actor.phone_number]))
    const body: TeacherTimesheet = {
      openShift: open ? toShiftDto(open) : null,
      events: events.map((e) => ({ shiftId: e.shift_id, action: e.event_type, occurredAt: e.occurred_at.toISOString(), recordedBy: e.recorded_by, recordedByPhone: e.recorded_by ? phones.get(e.recorded_by) ?? null : null, branchId: e.branch_id })),
    }
    return body
  })

  app.post('/admin/teachers/:teacherId/timesheet/:action', { preHandler: requireAdmin }, async (request, reply) => {
    const params = teacherParams.extend({ action: z.enum(['check-in', 'check-out']) }).safeParse(request.params)
    const query = z.object({ branchId: z.string().uuid() }).safeParse(request.query)
    if (!params.success || !query.success) return reply.code(400).send({ error: 'Du lieu khong hop le' })
    const { teacherId, action } = params.data
    const { branchId } = query.data
    const actorId = getSessionUser(request).id
    if (!await teacherInScope(actorId, teacherId, branchId)) return reply.code(404).send({ error: 'Khong tim thay giao vien' })
    const shift = action === 'check-in' ? await store.checkIn(teacherId, actorId, branchId) : await store.checkOut(teacherId, actorId, branchId)
    if (!shift) return reply.code(409).send({ error: action === 'check-in' ? 'Giao vien dang trong ca' : 'Giao vien chua check-in' })
    if (action === 'check-in') reply.code(201)
    const body: StaffShiftResponse = { shift: toShiftDto(shift) }
    return body
  })

  app.get('/reports/work-hours', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = WorkHoursReportQuery.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return { error: 'Bo loc bao cao cong khong hop le' }
    }
    const { month, branchId } = parsed.data
    const scoped = await branchScope.branchIdsForUser(getSessionUser(request).id)
    if (branchId && !scoped.includes(branchId)) {
      reply.code(404)
      return { error: 'Khong tim thay co so' }
    }
    const body: WorkHoursReport = await loadWorkHoursReport(
      store,
      month,
      branchId ? [branchId] : scoped,
      now(),
    )
    return body
  })
}
