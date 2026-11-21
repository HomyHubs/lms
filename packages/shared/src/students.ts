import { z } from 'zod'
import { PhoneNumber } from './auth.js'

/**
 * Contract menu "Hoc vien" (slice-30) dung chung FE-BE.
 * Toan bo READ-ONLY: tim kiem hoc vien + ho so chi tiet tong hop tu du lieu da co
 * (reports/attendance/examhistory/exams). Khong nhap/sua du lieu nghiep vu o slice nay.
 */

/** Query tim kiem hoc vien: tu khoa theo ten / SDT (va ma hoc vien khi co). */
export const StudentSearchQuery = z.object({
  q: z.string().trim().min(1, 'Nhap tu khoa tim kiem').max(100),
})
export type StudentSearchQuery = z.infer<typeof StudentSearchQuery>

/** Mot dong ket qua tim kiem hoc vien (toi gian de hien danh sach). */
export const StudentSearchResult = z.object({
  id: z.string().uuid(),
  // slice-30: ma hoc vien se co sau khi slice-23 merge; hien de null (xem store TODO).
  studentCode: z.string().nullable(),
  fullName: z.string().nullable(),
  phoneNumber: PhoneNumber,
  branchName: z.string().nullable(),
  levelCode: z.string().nullable(),
})
export type StudentSearchResult = z.infer<typeof StudentSearchResult>

/** Response tim kiem hoc vien (GET /students?q=). */
export const StudentSearchResponse = z.object({
  students: z.array(StudentSearchResult),
})
export type StudentSearchResponse = z.infer<typeof StudentSearchResponse>

/** Panel Ket qua thi: so lieu KPI + du lieu chart (null khi chua co luot thi cham). */
export const StudentExamPanel = z.object({
  attempts: z.number().int(),
  passed: z.number().int(),
  failed: z.number().int(),
  // Diem trung binh thang-100 (lam tron 1 chu so); null khi khong co luot nao cham.
  avgScorePct: z.number().nullable(),
})
export type StudentExamPanel = z.infer<typeof StudentExamPanel>

/** Panel Chuyen can: dem theo trang thai + ti le di hoc (null khi chua diem danh buoi nao). */
export const StudentAttendancePanel = z.object({
  present: z.number().int(),
  absent: z.number().int(),
  late: z.number().int(),
  excused: z.number().int(),
  // Ti le di hoc (%) = (present + late) / tong co tinh; null khi khong co buoi nao.
  ratePct: z.number().nullable(),
})
export type StudentAttendancePanel = z.infer<typeof StudentAttendancePanel>

/** Panel Xep loai hoc luc: diem tong + nhan (null khi chua du du lieu xep loai). */
export const StudentClassificationPanel = z.object({
  finalScore: z.number().nullable(),
  label: z.enum(['excellent', 'good', 'average', 'weak']).nullable(),
})
export type StudentClassificationPanel = z.infer<typeof StudentClassificationPanel>

/**
 * Ho so hoc vien tong hop (GET /students/:id/profile). READ-ONLY.
 * Cac panel cho phep null khi chua co nguon du lieu (FE render panel "dang cap nhat").
 */
export const StudentProfile = z.object({
  id: z.string().uuid(),
  studentCode: z.string().nullable(),
  fullName: z.string().nullable(),
  phoneNumber: PhoneNumber,
  branchName: z.string().nullable(),
  levelCode: z.string().nullable(),
  exam: StudentExamPanel.nullable(),
  attendance: StudentAttendancePanel.nullable(),
  classification: StudentClassificationPanel.nullable(),
})
export type StudentProfile = z.infer<typeof StudentProfile>

/** Response ho so hoc vien (GET /students/:id/profile). */
export const StudentProfileResponse = z.object({
  student: StudentProfile,
})
export type StudentProfileResponse = z.infer<typeof StudentProfileResponse>
