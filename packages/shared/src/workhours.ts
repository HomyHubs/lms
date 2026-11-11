import { z } from 'zod'
import { SessionDate, SessionTime } from './attendance.js'

/**
 * Work days + teaching hours contract (slice-8, ADR 0007).
 * Teaching hours come from real attendance: a session counts only when it was not cancelled
 * and its attendance was recorded; the recording teacher is the one who taught it.
 */

/** Calendar month `YYYY-MM` (local time Asia/Ho_Chi_Minh). */
export const WorkMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Thang phai co dang YYYY-MM')
export type WorkMonth = z.infer<typeof WorkMonth>

export const StaffShift = z.object({
  id: z.string().uuid(),
  checkInAt: z.string(),
  checkOutAt: z.string().nullable(),
  /** null while the shift is still open. */
  workedMinutes: z.number().int().nonnegative().nullable(),
})
export type StaffShift = z.infer<typeof StaffShift>

export const ShiftSummary = z.object({
  /** Sum of closed shifts only; an open shift is not paid until checked out. */
  workedMinutes: z.number().int().nonnegative(),
  /** Distinct local dates with at least one check-in. */
  workDays: z.number().int().nonnegative(),
  openShifts: z.number().int().nonnegative(),
})
export type ShiftSummary = z.infer<typeof ShiftSummary>

export const TeacherWorkSummary = z.object({
  teacherId: z.string().uuid(),
  phoneNumber: z.string(),
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  /** Regular (non make-up) sessions planned for this teacher. */
  planned: z.number().int().nonnegative(),
  /** Sessions actually taught (attendance recorded by this teacher, not cancelled). */
  held: z.number().int().nonnegative(),
  /** Planned regular sessions that were cancelled or passed without attendance. */
  missed: z.number().int().nonnegative(),
  makeup: z.number().int().nonnegative(),
  /** Held sessions that were planned for another teacher. */
  substitute: z.number().int().nonnegative(),
  taughtMinutes: z.number().int().nonnegative(),
})
export type TeacherWorkSummary = z.infer<typeof TeacherWorkSummary>

export const StaffWorkSummary = ShiftSummary.extend({
  userId: z.string().uuid(),
  phoneNumber: z.string(),
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  role: z.string(),
})
export type StaffWorkSummary = z.infer<typeof StaffWorkSummary>

export const WORK_SESSION_STATUSES = ['held', 'cancelled', 'missed', 'scheduled'] as const
export const WorkSessionStatus = z.enum(WORK_SESSION_STATUSES)
export type WorkSessionStatus = z.infer<typeof WorkSessionStatus>

export const WORK_SESSION_STATUS_LABELS: Record<WorkSessionStatus, string> = {
  held: 'Đã dạy',
  cancelled: 'Nghỉ',
  missed: 'Không điểm danh',
  scheduled: 'Sắp tới',
}

export const WorkSessionDetail = z.object({
  sessionId: z.string().uuid(),
  classId: z.string().uuid(),
  className: z.string(),
  sessionDate: SessionDate,
  startsAt: SessionTime,
  durationMinutes: z.number().int(),
  plannedTeacherPhone: z.string().nullable(),
  taughtByPhone: z.string().nullable(),
  status: WorkSessionStatus,
  isMakeup: z.boolean(),
  isSubstitute: z.boolean(),
})
export type WorkSessionDetail = z.infer<typeof WorkSessionDetail>

/** GET /reports/work-hours?month=YYYY-MM&branchId= (admin, branch-scoped). */
export const WorkHoursReportQuery = z.object({
  month: WorkMonth,
  branchId: z.string().uuid().optional(),
})
export type WorkHoursReportQuery = z.infer<typeof WorkHoursReportQuery>

export const WorkHoursReport = z.object({
  month: WorkMonth,
  teachers: z.array(TeacherWorkSummary),
  staff: z.array(StaffWorkSummary),
  sessions: z.array(WorkSessionDetail),
})
export type WorkHoursReport = z.infer<typeof WorkHoursReport>

/** GET /me/timesheet?month= (staff + teacher). */
export const TimesheetQuery = z.object({ month: WorkMonth.optional() })
export type TimesheetQuery = z.infer<typeof TimesheetQuery>

export const MyTimesheet = z.object({
  month: WorkMonth,
  openShift: StaffShift.nullable(),
  shifts: z.array(StaffShift),
  summary: ShiftSummary,
  /** Teaching summary for teachers; null for other roles. */
  teaching: TeacherWorkSummary.nullable(),
})
export type MyTimesheet = z.infer<typeof MyTimesheet>

export const StaffShiftResponse = z.object({ shift: StaffShift })
export type StaffShiftResponse = z.infer<typeof StaffShiftResponse>
