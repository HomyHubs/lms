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

export const EnrollmentMovementQuery = z.object({
  branchId: z.string().uuid().optional(),
  from: z.string().date().refine((date) => date >= '0001-01-01'),
  to: z.string().date().refine((date) => date >= '0001-01-01'),
}).refine((q) => q.from <= q.to, { message: 'Khoang ngay khong hop le' })
export type EnrollmentMovementQuery = z.infer<typeof EnrollmentMovementQuery>

export const EnrollmentMovementReport = z.object({
  branches: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  events: z.array(z.object({
    id: z.string(), branchId: z.string().uuid(), branchName: z.string(),
    className: z.string().nullable(), studentPhone: z.string().nullable(),
    type: z.enum(['enrolled', 'withdrawn']), occurredAt: z.string(),
  })),
})
export type EnrollmentMovementReport = z.infer<typeof EnrollmentMovementReport>

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
  /** Ngưỡng Đậu: điểm tổng (final) >= passMin => Đậu, ngược lại Rớt. Chỉ admin sửa. */
  passMin: Percent,
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
    passMin: Percent,
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
  /** slice-24: tìm theo tên hoặc SĐT/mã HS — áp SAU khi tính thứ hạng, trước khi cắt trang. */
  q: z.string().trim().max(100).optional(),
  /** slice-24: phân trang bảng xếp hạng phía server (mặc định 1/20 do route áp). */
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
})
export type StudentReportQuery = z.infer<typeof StudentReportQuery>

/**
 * slice-24: thông tin phân trang của bảng xếp hạng. `total` là số dòng KHỚP BỘ LỌC (sau `q`),
 * không phải số dòng trong trang; `rank` trong từng dòng vẫn tính trên toàn bộ phạm vi.
 */
export const RankingPage = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int(),
  totalPages: z.number().int(),
})
export type RankingPage = z.infer<typeof RankingPage>

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
  /** Đậu (true) / Rớt (false) theo finalScore >= passMin; null khi chưa xếp loại (chưa có điểm). */
  passed: z.boolean().nullable(),
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
    /** Số học viên Đậu / Rớt theo ngưỡng passMin (khác passed/failed là lượt thi). */
    studentsPassed: z.number().int(),
    studentsFailed: z.number().int(),
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
  /** Chỉ là MỘT trang của bảng xếp hạng; tổng số dòng khớp bộ lọc nằm ở `rankingPage.total`. */
  ranking: z.array(StudentRankingRow),
  rankingPage: RankingPage,
})
export type StudentReport = z.infer<typeof StudentReport>
