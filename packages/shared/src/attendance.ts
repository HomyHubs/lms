import { z } from 'zod'

/**
 * Attendance contract (slice-6) shared by FE and BE.
 * Class -> ClassSession (one date + start time) -> AttendanceRecord (one per enrolled student).
 * Only teachers assigned to the class (class_teachers) may mark attendance; admins read within
 * their branch scope; students read their own history.
 */

export const AttendanceStatus = z.enum(['present', 'absent', 'late', 'excused'])
export type AttendanceStatus = z.infer<typeof AttendanceStatus>

/** Calendar date `YYYY-MM-DD` (no timezone; a session belongs to a local day). */
export const SessionDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngay phai co dang YYYY-MM-DD')
/** Local start time `HH:MM` (24h). */
export const SessionTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Gio phai co dang HH:MM')

// ----- Class teachers (admin assigns teachers to classes) -----

export const ClassTeacher = z.object({
  classId: z.string().uuid(),
  teacherId: z.string().uuid(),
  phoneNumber: z.string(),
})
export type ClassTeacher = z.infer<typeof ClassTeacher>

export const ClassTeacherList = z.object({ teachers: z.array(ClassTeacher) })
export type ClassTeacherList = z.infer<typeof ClassTeacherList>

export const AssignClassTeacherRequest = z.object({ teacherId: z.string().uuid() })
export type AssignClassTeacherRequest = z.infer<typeof AssignClassTeacherRequest>

/** Classes a teacher is assigned to (GET /attendance/classes). */
export const TeachingClass = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  branchId: z.string().uuid(),
  name: z.string(),
})
export type TeachingClass = z.infer<typeof TeachingClass>

export const TeachingClassList = z.object({ classes: z.array(TeachingClass) })
export type TeachingClassList = z.infer<typeof TeachingClassList>

// ----- Sessions -----

export const ClassSession = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  sessionDate: SessionDate,
  startsAt: SessionTime,
  topic: z.string().nullable(),
  createdAt: z.string(),
  // slice-8: planned length, make-up link and cancellation (teaching hours, ADR 0007).
  durationMinutes: z.number().int(),
  makeupForSessionId: z.string().uuid().nullable(),
  cancelledAt: z.string().nullable(),
})
export type ClassSession = z.infer<typeof ClassSession>

export const SessionDurationMinutes = z.number().int().min(15).max(480)

export const CreateClassSessionRequest = z.object({
  sessionDate: SessionDate,
  startsAt: SessionTime.optional(),
  topic: z.string().trim().max(200).optional(),
  durationMinutes: SessionDurationMinutes.optional(),
  /** A make-up session replaces a missed session of the same class. */
  makeupForSessionId: z.string().uuid().optional(),
})
export type CreateClassSessionRequest = z.infer<typeof CreateClassSessionRequest>

export const ClassSessionList = z.object({ sessions: z.array(ClassSession) })
export type ClassSessionList = z.infer<typeof ClassSessionList>

export const ClassSessionResponse = z.object({ session: ClassSession })
export type ClassSessionResponse = z.infer<typeof ClassSessionResponse>

// ----- Marking attendance -----

/** One roster line: an enrolled student and the status recorded so far (null = not marked yet). */
export const AttendanceRosterEntry = z.object({
  studentId: z.string().uuid(),
  phoneNumber: z.string(),
  // Ten hoc vien (co the trong voi du lieu cu) de hien thi thay cho SDT.
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  status: AttendanceStatus.nullable(),
  note: z.string().nullable(),
})
export type AttendanceRosterEntry = z.infer<typeof AttendanceRosterEntry>

export const SessionAttendance = z.object({
  session: ClassSession,
  roster: z.array(AttendanceRosterEntry),
})
export type SessionAttendance = z.infer<typeof SessionAttendance>

export const MarkAttendanceRecord = z.object({
  studentId: z.string().uuid(),
  status: AttendanceStatus,
  note: z.string().trim().max(500).optional(),
})
export type MarkAttendanceRecord = z.infer<typeof MarkAttendanceRecord>

export const MarkAttendanceRequest = z.object({
  records: z.array(MarkAttendanceRecord).min(1).max(500),
})
export type MarkAttendanceRequest = z.infer<typeof MarkAttendanceRequest>

// ----- History + rates -----

/**
 * Attendance summary. `ratePercent` = (present + late) / (present + late + absent) * 100,
 * rounded to 1 decimal. Excused sessions are excluded from the denominator.
 * `null` when there is nothing to count yet.
 */
export const AttendanceSummary = z.object({
  present: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
  absent: z.number().int().nonnegative(),
  excused: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  ratePercent: z.number().min(0).max(100).nullable(),
})
export type AttendanceSummary = z.infer<typeof AttendanceSummary>

export const AttendanceHistoryEntry = z.object({
  sessionId: z.string().uuid(),
  classId: z.string().uuid(),
  className: z.string(),
  sessionDate: SessionDate,
  startsAt: SessionTime,
  topic: z.string().nullable(),
  status: AttendanceStatus,
  note: z.string().nullable(),
})
export type AttendanceHistoryEntry = z.infer<typeof AttendanceHistoryEntry>

/** GET /me/attendance (student) and GET /attendance/students/:id (admin). */
export const StudentAttendance = z.object({
  history: z.array(AttendanceHistoryEntry),
  summary: AttendanceSummary,
})
export type StudentAttendance = z.infer<typeof StudentAttendance>

/** GET /attendance/rates?classId=|courseId=|studentId=|branchId= — at least one filter is required. */
export const AttendanceRatesQuery = z
  .object({
    classId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
  })
  .refine(
    (v) =>
      v.classId !== undefined ||
      v.courseId !== undefined ||
      v.studentId !== undefined ||
      v.branchId !== undefined,
    {
      message: 'Can it nhat mot bo loc: classId, courseId, studentId hoac branchId',
    },
  )
export type AttendanceRatesQuery = z.infer<typeof AttendanceRatesQuery>

export const StudentAttendanceRate = z.object({
  studentId: z.string().uuid(),
  phoneNumber: z.string(),
  // Ten hoc vien (co the trong voi du lieu cu) de hien thi thay cho SDT.
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  summary: AttendanceSummary,
})
export type StudentAttendanceRate = z.infer<typeof StudentAttendanceRate>

export const AttendanceRates = z.object({
  overall: AttendanceSummary,
  students: z.array(StudentAttendanceRate),
})
export type AttendanceRates = z.infer<typeof AttendanceRates>

/** Tom tat diem danh mot lop co buoi hoc hom nay. */
export const TodayClassSummary = z.object({
  classId: z.string().uuid(),
  className: z.string(),
  startsAt: z.string(),
  branchId: z.string(),
  branchName: z.string(),
  present: z.number().int(),
  late: z.number().int(),
  absent: z.number().int(),
  excused: z.number().int(),
  notMarked: z.number().int(),
  total: z.number().int(),
  ratePercent: z.number().nullable(),
})
export type TodayClassSummary = z.infer<typeof TodayClassSummary>

export const TodayAttendanceSummary = z.object({
  date: z.string(),
  classes: z.array(TodayClassSummary),
})
export type TodayAttendanceSummary = z.infer<typeof TodayAttendanceSummary>

/**
 * slice-16: attendance rates for a whole branch, broken down per class.
 * `ratePercent` follows ADR 0004: (present + late) / (present + late + absent) * 100,
 * rounded to 1 decimal, excused excluded; null when the denominator is 0.
 */
export const BranchClassRate = z.object({
  classId: z.string().uuid(),
  className: z.string(),
  startsAt: z.string().optional(),
  present: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
  absent: z.number().int().nonnegative(),
  excused: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  ratePercent: z.number().min(0).max(100).nullable(),
})
export type BranchClassRate = z.infer<typeof BranchClassRate>

/** GET /attendance/rates?branchId= — overall branch rate + per-class breakdown. */
export const BranchAttendanceRates = z.object({
  branchId: z.string().uuid(),
  overall: AttendanceSummary,
  classes: z.array(BranchClassRate),
})
export type BranchAttendanceRates = z.infer<typeof BranchAttendanceRates>
