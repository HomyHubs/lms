import { z } from 'zod'
import { SessionDate } from './attendance.js'

/**
 * Student classification + admin dashboard contract (slice-7, ADR 0006).
 * final = examWeight% * exam score + attendanceWeight% * attendance rate, per level policy.
 */

export const STUDENT_CLASSIFICATIONS = ['excellent', 'good', 'average', 'weak'] as const
export const StudentClassification = z.enum(STUDENT_CLASSIFICATIONS)
export type StudentClassification = z.infer<typeof StudentClassification>

export const CLASSIFICATION_LABELS: Record<StudentClassification, string> = {
  excellent: 'Giỏi',
  good: 'Khá',
  average: 'Trung bình',
  weak: 'Yếu',
}

const Percent = z.number().int().min(0).max(100)

export const ClassificationPolicy = z.object({
  levelId: z.string().uuid(),
  levelCode: z.string(),
  levelName: z.string(),
  examWeight: Percent,
  attendanceWeight: Percent,
  excellentMin: Percent,
  goodMin: Percent,
  averageMin: Percent,
})
export type ClassificationPolicy = z.infer<typeof ClassificationPolicy>

export const ClassificationPolicyList = z.object({ policies: z.array(ClassificationPolicy) })
export type ClassificationPolicyList = z.infer<typeof ClassificationPolicyList>

export const UpdateClassificationPolicyRequest = z
  .object({
    examWeight: Percent,
    attendanceWeight: Percent,
    excellentMin: Percent,
    goodMin: Percent,
    averageMin: Percent,
  })
  .refine((p) => p.examWeight + p.attendanceWeight === 100, {
    message: 'Tong trong so thi + chuyen can phai bang 100',
    path: ['attendanceWeight'],
  })
  .refine((p) => p.excellentMin >= p.goodMin && p.goodMin >= p.averageMin, {
    message: 'Nguong phai giam dan: Gioi >= Kha >= Trung binh',
    path: ['goodMin'],
  })
export type UpdateClassificationPolicyRequest = z.infer<typeof UpdateClassificationPolicyRequest>

/** Filters of GET /reports/students. `from`/`to` limit graded attempts and sessions by date. */
export const StudentReportQuery = z.object({
  branchId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  from: SessionDate.optional(),
  to: SessionDate.optional(),
})
export type StudentReportQuery = z.infer<typeof StudentReportQuery>

/** One student in one class (an enrollment), ranked by final score. */
export const StudentRankingRow = z.object({
  rank: z.number().int().nullable(),
  studentId: z.string().uuid(),
  phoneNumber: z.string(),
  /** Họ tên học viên (Họ/chữ lót + Tên) nếu đã có hồ sơ; null khi chưa nhập. */
  studentName: z.string().nullable(),
  classId: z.string().uuid(),
  className: z.string(),
  branchName: z.string(),
  levelCode: z.string(),
  examScore: z.number().nullable(),
  attendanceRate: z.number().nullable(),
  finalScore: z.number().nullable(),
  classification: StudentClassification.nullable(),
  examsTaken: z.number().int(),
  examsPassed: z.number().int(),
  attempts: z.number().int(),
  retakes: z.number().int(),
  /** Failed exams that still have attempts left. */
  pendingRetakes: z.number().int(),
})
export type StudentRankingRow = z.infer<typeof StudentRankingRow>

const PassFail = { passed: z.number().int(), failed: z.number().int() }

export const ClassReport = z.object({
  classId: z.string().uuid(),
  className: z.string(),
  branchName: z.string(),
  levelCode: z.string(),
  students: z.number().int(),
  averageFinal: z.number().nullable(),
  ...PassFail,
})
export type ClassReport = z.infer<typeof ClassReport>

export const LevelReport = z.object({
  levelId: z.string().uuid(),
  levelCode: z.string(),
  students: z.number().int(),
  averageFinal: z.number().nullable(),
  ...PassFail,
})
export type LevelReport = z.infer<typeof LevelReport>

/** Graded attempts per month (`YYYY-MM`) of grading time. */
export const MonthReport = z.object({ month: z.string(), ...PassFail })
export type MonthReport = z.infer<typeof MonthReport>

export const StudentReport = z.object({
  totals: z.object({
    students: z.number().int(),
    averageExamScore: z.number().nullable(),
    averageAttendanceRate: z.number().nullable(),
    averageFinal: z.number().nullable(),
    passRate: z.number().nullable(),
    ...PassFail,
  }),
  classifications: z.object({
    excellent: z.number().int(),
    good: z.number().int(),
    average: z.number().int(),
    weak: z.number().int(),
    unranked: z.number().int(),
  }),
  byClass: z.array(ClassReport),
  byLevel: z.array(LevelReport),
  byMonth: z.array(MonthReport),
  ranking: z.array(StudentRankingRow),
})
export type StudentReport = z.infer<typeof StudentReport>
