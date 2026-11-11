import type { FastifyInstance } from 'fastify'
import {
  TimesheetQuery,
  WorkHoursReportQuery,
  type MyTimesheet,
  type StaffShiftResponse,
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
  const requireWorker = rbac.requireRole('staff', 'teacher')
  const requireAdmin = rbac.requireRole('admin')

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
