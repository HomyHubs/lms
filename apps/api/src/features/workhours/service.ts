import type {
  ShiftSummary,
  StaffShift,
  StaffWorkSummary,
  TeacherWorkSummary,
  WorkHoursReport,
  WorkSessionDetail,
  WorkSessionStatus,
} from '@lms/shared'

/**
 * Work days + teaching hours (slice-8, ADR 0007) — pure functions over a store interface.
 * A session is "held" only when it is not cancelled and attendance was recorded; the teacher
 * who recorded attendance is the one who taught it. Nothing is counted from the plan alone.
 */

export const WORK_TIME_ZONE = 'Asia/Ho_Chi_Minh'

export interface WorkSessionRow {
  id: string
  class_id: string
  class_name: string
  /** 'YYYY-MM-DD' */
  session_date: string
  /** 'HH:MM' */
  starts_at: string
  duration_minutes: number
  planned_teacher_id: string | null
  makeup_for_session_id: string | null
  cancelled_at: Date | string | null
  /** Teacher who recorded attendance; null when nothing was recorded. */
  taught_by: string | null
}

export interface WorkUserRow {
  id: string
  phone_number: string
  first_name: string | null
  last_name: string | null
  role: string
}

/** Họ tên (last_name + first_name) của một user, null khi chưa có hồ sơ. */
export interface WorkUserName {
  firstName: string | null
  lastName: string | null
}

export interface ShiftRow {
  id: string
  user_id: string
  check_in_at: Date
  check_out_at: Date | null
  /** Local (WORK_TIME_ZONE) date of the check-in, 'YYYY-MM-DD'. */
  work_date: string
}

/** Half-open local date range [from, to). */
export interface DateRange {
  from: string
  to: string
}

export interface SessionScope extends DateRange {
  branchIds?: string[]
  /** Sessions planned for or taught by this teacher. */
  teacherId?: string
}

export interface WorkHoursStore {
  /** Undefined when the user already has an open shift. */
  checkIn(userId: string): Promise<ShiftRow | undefined>
  /** Undefined when the user has no open shift. */
  checkOut(userId: string): Promise<ShiftRow | undefined>
  findOpenShift(userId: string): Promise<ShiftRow | undefined>
  listShifts(userIds: string[], range: DateRange): Promise<ShiftRow[]>
  listSessions(scope: SessionScope): Promise<WorkSessionRow[]>
  listUsers(userIds: string[]): Promise<WorkUserRow[]>
  /** Staff and teachers assigned to any of the branches. */
  listBranchWorkers(branchIds: string[]): Promise<WorkUserRow[]>
}

function localParts(now: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WORK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function localToday(now: Date): string {
  const { year, month, day } = localParts(now)
  return `${year}-${month}-${day}`
}

export function localMonth(now: Date): string {
  const { year, month } = localParts(now)
  return `${year}-${month}`
}

export function monthRange(month: string): DateRange {
  const [year, mon] = month.split('-').map(Number) as [number, number]
  const next = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`
  return { from: `${month}-01`, to: `${next}-01` }
}

export function sessionStatus(row: WorkSessionRow, today: string): WorkSessionStatus {
  if (row.cancelled_at !== null) return 'cancelled'
  if (row.taught_by !== null) return 'held'
  return row.session_date < today ? 'missed' : 'scheduled'
}

function emptyTeacher(teacherId: string, phoneNumber: string, name?: WorkUserName): TeacherWorkSummary {
  return {
    teacherId,
    phoneNumber,
    firstName: name?.firstName ?? null,
    lastName: name?.lastName ?? null,
    planned: 0,
    held: 0,
    missed: 0,
    makeup: 0,
    substitute: 0,
    taughtMinutes: 0,
  }
}

/**
 * Per-teacher counts. Regular sessions count as planned for the planned teacher; a missed
 * regular session is never paid; held sessions (including make-up and substitute ones) are
 * paid to the teacher who taught them.
 */
export function summarizeTeachers(
  sessions: readonly WorkSessionRow[],
  phoneById: ReadonlyMap<string, string>,
  today: string,
  nameById: ReadonlyMap<string, WorkUserName> = new Map(),
): TeacherWorkSummary[] {
  const byTeacher = new Map<string, TeacherWorkSummary>()
  const entry = (teacherId: string) => {
    let found = byTeacher.get(teacherId)
    if (!found) {
      found = emptyTeacher(teacherId, phoneById.get(teacherId) ?? '', nameById.get(teacherId))
      byTeacher.set(teacherId, found)
    }
    return found
  }
  for (const s of sessions) {
    const status = sessionStatus(s, today)
    const isMakeup = s.makeup_for_session_id !== null
    if (s.planned_teacher_id && !isMakeup) {
      const planned = entry(s.planned_teacher_id)
      planned.planned += 1
      if (status === 'cancelled' || status === 'missed') planned.missed += 1
    }
    if (status === 'held' && s.taught_by) {
      const teacher = entry(s.taught_by)
      teacher.held += 1
      teacher.taughtMinutes += s.duration_minutes
      if (isMakeup) teacher.makeup += 1
      if (s.planned_teacher_id && s.planned_teacher_id !== s.taught_by) teacher.substitute += 1
    }
  }
  return [...byTeacher.values()].sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber))
}

export function workedMinutes(shift: ShiftRow): number | null {
  if (!shift.check_out_at) return null
  return Math.floor((shift.check_out_at.getTime() - shift.check_in_at.getTime()) / 60000)
}

export function toShiftDto(shift: ShiftRow): StaffShift {
  return {
    id: shift.id,
    checkInAt: shift.check_in_at.toISOString(),
    checkOutAt: shift.check_out_at ? shift.check_out_at.toISOString() : null,
    workedMinutes: workedMinutes(shift),
  }
}

/** Only closed shifts are paid; a work day is a local date with at least one check-in. */
export function summarizeShifts(shifts: readonly ShiftRow[]): ShiftSummary {
  let minutes = 0
  let open = 0
  for (const s of shifts) {
    const worked = workedMinutes(s)
    if (worked === null) open += 1
    else minutes += worked
  }
  return {
    workedMinutes: minutes,
    workDays: new Set(shifts.map((s) => s.work_date)).size,
    openShifts: open,
  }
}

function toSessionDetail(
  s: WorkSessionRow,
  phoneById: ReadonlyMap<string, string>,
  today: string,
): WorkSessionDetail {
  const status = sessionStatus(s, today)
  const phone = (id: string | null) => (id ? (phoneById.get(id) ?? null) : null)
  return {
    sessionId: s.id,
    classId: s.class_id,
    className: s.class_name,
    sessionDate: s.session_date,
    startsAt: s.starts_at,
    durationMinutes: s.duration_minutes,
    plannedTeacherPhone: phone(s.planned_teacher_id),
    taughtByPhone: status === 'held' ? phone(s.taught_by) : null,
    status,
    isMakeup: s.makeup_for_session_id !== null,
    isSubstitute:
      status === 'held' && s.planned_teacher_id !== null && s.planned_teacher_id !== s.taught_by,
  }
}

function teacherIdsOf(sessions: readonly WorkSessionRow[]): string[] {
  const ids = new Set<string>()
  for (const s of sessions) {
    if (s.planned_teacher_id) ids.add(s.planned_teacher_id)
    if (s.taught_by) ids.add(s.taught_by)
  }
  return [...ids]
}

/** Monthly report for the admin's branches: teachers (from sessions) + staff (from shifts). */
export async function loadWorkHoursReport(
  store: WorkHoursStore,
  month: string,
  branchIds: string[],
  now: Date,
): Promise<WorkHoursReport> {
  const range = monthRange(month)
  const today = localToday(now)
  const [sessions, workers] = await Promise.all([
    store.listSessions({ ...range, branchIds }),
    store.listBranchWorkers(branchIds),
  ])
  const [teachers, shifts] = await Promise.all([
    store.listUsers(teacherIdsOf(sessions)),
    store.listShifts(
      workers.map((w) => w.id),
      range,
    ),
  ])
  const phoneById = new Map([...teachers, ...workers].map((u) => [u.id, u.phone_number]))
  const nameById = new Map<string, WorkUserName>(
    [...teachers, ...workers].map((u) => [u.id, { firstName: u.first_name, lastName: u.last_name }]),
  )
  const shiftsByUser = new Map<string, ShiftRow[]>()
  for (const s of shifts) shiftsByUser.set(s.user_id, [...(shiftsByUser.get(s.user_id) ?? []), s])
  const staff: StaffWorkSummary[] = workers
    .map((w) => ({
      userId: w.id,
      phoneNumber: w.phone_number,
      firstName: w.first_name,
      lastName: w.last_name,
      role: w.role,
      ...summarizeShifts(shiftsByUser.get(w.id) ?? []),
    }))
    .sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber))
  return {
    month,
    teachers: summarizeTeachers(sessions, phoneById, today, nameById),
    staff,
    sessions: sessions.map((s) => toSessionDetail(s, phoneById, today)),
  }
}

/** Teaching summary of one teacher across all their classes (zeros when nothing happened). */
export async function loadTeacherSummary(
  store: WorkHoursStore,
  teacher: WorkUserRow,
  month: string,
  now: Date,
): Promise<TeacherWorkSummary> {
  const sessions = await store.listSessions({ ...monthRange(month), teacherId: teacher.id })
  const phoneById = new Map([[teacher.id, teacher.phone_number]])
  const name: WorkUserName = { firstName: teacher.first_name, lastName: teacher.last_name }
  const nameById = new Map([[teacher.id, name]])
  const mine = summarizeTeachers(sessions, phoneById, localToday(now), nameById).find(
    (t) => t.teacherId === teacher.id,
  )
  return mine ?? emptyTeacher(teacher.id, teacher.phone_number, name)
}
