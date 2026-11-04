import type {
  AttendanceHistoryEntry,
  AttendanceRosterEntry,
  AttendanceStatus,
  AttendanceSummary,
  ClassSession,
  MarkAttendanceRecord,
  StudentAttendanceRate,
} from '@lms/shared'

/**
 * Attendance logic (slice-6) — pure functions over a store interface so it is easy to test.
 * Class -> ClassSession -> AttendanceRecord. RBAC decisions live in routes.ts; this module
 * owns validation (only enrolled students can be marked) and the attendance-rate formula.
 */

export interface AttendanceClassRow {
  id: string
  course_id: string
  branch_id: string
  name: string
}

export interface ClassTeacherRow {
  class_id: string
  teacher_id: string
  phone_number: string
}

export interface SessionRow {
  id: string
  class_id: string
  /** 'YYYY-MM-DD' */
  session_date: string
  /** 'HH:MM' */
  starts_at: string
  topic: string | null
  created_at: Date | string
}

export interface RosterStudentRow {
  student_id: string
  phone_number: string
}

export interface RecordRow {
  session_id: string
  student_id: string
  status: string
  note: string | null
}

export interface HistoryRow {
  session_id: string
  class_id: string
  class_name: string
  session_date: string
  starts_at: string
  topic: string | null
  status: string
  note: string | null
}

export interface ScopedRecordRow {
  student_id: string
  phone_number: string
  status: string
}

export interface CreateSessionFields {
  classId: string
  sessionDate: string
  startsAt: string
  topic: string | null
  createdBy: string
}

export interface UpsertRecordFields {
  studentId: string
  status: AttendanceStatus
  note: string | null
}

/** Filter for rate queries. `branchIds` limits the result to classes in those branches. */
export interface RecordScope {
  classId?: string
  courseId?: string
  studentId?: string
  branchIds: string[]
}

export interface AttendanceStore {
  findClass(classId: string): Promise<AttendanceClassRow | undefined>
  /** Role of a user (to validate that only teachers get assigned). */
  findUserRole(userId: string): Promise<string | undefined>

  listClassTeachers(classId: string): Promise<ClassTeacherRow[]>
  isClassTeacher(classId: string, teacherId: string): Promise<boolean>
  /** Returns false when the teacher is already assigned. */
  addClassTeacher(classId: string, teacherId: string): Promise<boolean>
  removeClassTeacher(classId: string, teacherId: string): Promise<boolean>
  listTeachingClasses(teacherId: string): Promise<AttendanceClassRow[]>

  listSessions(classId: string): Promise<SessionRow[]>
  findSession(sessionId: string): Promise<SessionRow | undefined>
  /** Returns undefined when (class, date, start time) already exists. */
  createSession(fields: CreateSessionFields): Promise<SessionRow | undefined>

  /** Students currently enrolled in the class. */
  listRoster(classId: string): Promise<RosterStudentRow[]>
  listRecords(sessionId: string): Promise<RecordRow[]>
  /** Insert-or-update all records atomically. */
  upsertRecords(sessionId: string, recordedBy: string, records: UpsertRecordFields[]): Promise<void>

  listStudentHistory(studentId: string, branchIds?: string[]): Promise<HistoryRow[]>
  listScopedRecords(scope: RecordScope): Promise<ScopedRecordRow[]>
}

const STATUSES: readonly AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

function toStatus(value: string): AttendanceStatus {
  if ((STATUSES as readonly string[]).includes(value)) return value as AttendanceStatus
  // DB has a CHECK constraint; anything else is a programming/data error.
  throw new Error(`Unknown attendance status: ${value}`)
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export function toSessionDto(row: SessionRow): ClassSession {
  return {
    id: row.id,
    classId: row.class_id,
    sessionDate: row.session_date,
    startsAt: row.starts_at,
    topic: row.topic,
    createdAt: toIso(row.created_at),
  }
}

/**
 * Attendance rate formula (ADR 0004):
 * ratePercent = (present + late) / (present + late + absent) * 100, rounded to 1 decimal.
 * Excused sessions are excluded from the denominator. Null when the denominator is 0.
 */
export function summarize(statuses: readonly string[]): AttendanceSummary {
  const summary = { present: 0, late: 0, absent: 0, excused: 0 }
  for (const raw of statuses) summary[toStatus(raw)] += 1
  const counted = summary.present + summary.late + summary.absent
  const ratePercent =
    counted === 0 ? null : Math.round(((summary.present + summary.late) / counted) * 1000) / 10
  return { ...summary, total: statuses.length, ratePercent }
}

/** Roster of enrolled students merged with what has been recorded for the session. */
export function buildRoster(
  students: readonly RosterStudentRow[],
  records: readonly RecordRow[],
): AttendanceRosterEntry[] {
  const byStudent = new Map(records.map((r) => [r.student_id, r]))
  return students.map((s) => {
    const rec = byStudent.get(s.student_id)
    return {
      studentId: s.student_id,
      phoneNumber: s.phone_number,
      status: rec ? toStatus(rec.status) : null,
      note: rec?.note ?? null,
    }
  })
}

export function toHistoryDto(row: HistoryRow): AttendanceHistoryEntry {
  return {
    sessionId: row.session_id,
    classId: row.class_id,
    className: row.class_name,
    sessionDate: row.session_date,
    startsAt: row.starts_at,
    topic: row.topic,
    status: toStatus(row.status),
    note: row.note,
  }
}

/** Per-student summaries + overall summary, sorted by phone number for a stable output. */
export function aggregateRates(rows: readonly ScopedRecordRow[]): {
  overall: AttendanceSummary
  students: StudentAttendanceRate[]
} {
  const perStudent = new Map<string, { phone: string; statuses: string[] }>()
  for (const row of rows) {
    const entry = perStudent.get(row.student_id) ?? { phone: row.phone_number, statuses: [] }
    entry.statuses.push(row.status)
    perStudent.set(row.student_id, entry)
  }
  const students = [...perStudent.entries()]
    .map(([studentId, v]) => ({ studentId, phoneNumber: v.phone, summary: summarize(v.statuses) }))
    .sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber))
  return { overall: summarize(rows.map((r) => r.status)), students }
}

export type MarkAttendanceOutcome =
  | { ok: true }
  | { ok: false; reason: 'duplicate_student' }
  | { ok: false; reason: 'not_enrolled'; studentIds: string[] }

/**
 * Mark attendance for one session. Every student must be enrolled in the session's class
 * (enforced here, not only in the UI) and may appear only once per request.
 */
export async function markAttendance(
  store: AttendanceStore,
  session: SessionRow,
  recordedBy: string,
  records: readonly MarkAttendanceRecord[],
): Promise<MarkAttendanceOutcome> {
  const ids = records.map((r) => r.studentId)
  if (new Set(ids).size !== ids.length) return { ok: false, reason: 'duplicate_student' }
  const enrolled = new Set((await store.listRoster(session.class_id)).map((s) => s.student_id))
  const notEnrolled = ids.filter((id) => !enrolled.has(id))
  if (notEnrolled.length > 0) return { ok: false, reason: 'not_enrolled', studentIds: notEnrolled }
  await store.upsertRecords(
    session.id,
    recordedBy,
    records.map((r) => ({ studentId: r.studentId, status: r.status, note: r.note ? r.note : null })),
  )
  return { ok: true }
}

export type AssignTeacherOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_a_teacher' | 'already_assigned' }

export async function assignTeacher(
  store: AttendanceStore,
  classId: string,
  teacherId: string,
): Promise<AssignTeacherOutcome> {
  const role = await store.findUserRole(teacherId)
  if (role !== 'teacher') return { ok: false, reason: 'not_a_teacher' }
  const added = await store.addClassTeacher(classId, teacherId)
  return added ? { ok: true } : { ok: false, reason: 'already_assigned' }
}
