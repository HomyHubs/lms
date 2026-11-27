import type {
  ClassificationPolicy,
  StudentAttendancePanel,
  StudentClassificationPanel,
  StudentExamPanel,
  StudentProfile,
  StudentSearchResult,
  StudentStudyPanel,
} from '@lms/shared'
import { classify, finalScore, round1 } from '../../platform/grading.js'
import { ratePercentFromCounts } from '../attendance/index.js'

/**
 * Menu "Hoc vien" (slice-30) — logic thuan tren mot store interface de de test.
 * READ-ONLY: tim kiem + tong hop ho so hoc vien tu du lieu da co. RBAC + branch-scope o routes.ts.
 */

/** Mot dong hoc vien tra ve khi tim kiem (danh tinh + co so/cap do dai dien). */
export interface StudentSearchRow {
  id: string
  phone_number: string
  /** Ma hoc vien (slice-23); null voi du lieu cu chua backfill. */
  student_code: string | null
  full_name: string | null
  branch_name: string | null
  level_code: string | null
}

/** Danh tinh hoc vien cho trang ho so. */
export interface StudentIdentityRow {
  id: string
  phone_number: string
  student_code: string | null
  full_name: string | null
  branch_name: string | null
  level_code: string | null
  /** Cap do dai dien (de lay policy xep loai). Null khi hoc vien chua vao lop nao. */
  level_id: string | null
}

/** Tong hop luot thi da cham cua hoc vien (dem + diem). */
export interface StudentExamAggRow {
  attempts: number
  passed: number
  failed: number
  /**
   * Trung binh diem CAO NHAT cua tung de (score/max_score*100), theo ADR 0006 —
   * KHONG phai trung binh moi luot thi. Null khi khong co luot cham.
   */
  avg_score_pct: number | null
}

/** Tong hop chuyen can cua hoc vien theo trang thai. */
export interface StudentAttendanceAggRow {
  present: number
  absent: number
  late: number
  excused: number
}

/** Tong hop thoi gian hoc: so buoi duoc ghi nhan co mat/di muon + tong phut. */
export interface StudentStudyAggRow {
  sessions_attended: number
  study_minutes: number
}

export interface StudentsStore {
  /**
   * Tim hoc vien theo ten / SDT (khong phan biet hoa thuong), gioi han theo co so.
   * `branchIds` undefined = khong gioi han (superadmin); [] = khong co co so nao.
   */
  searchStudents: (q: string, branchIds: string[] | undefined) => Promise<StudentSearchRow[]>
  /** Danh tinh hoc vien trong pham vi; undefined khi khong thay / ngoai pham vi. */
  findStudentIdentity: (
    id: string,
    branchIds: string[] | undefined,
  ) => Promise<StudentIdentityRow | undefined>
  // TODO(slice-30): hai lenh duoi goi rieng cho tung hoc vien -> co the N+1 khi mo nhieu ho so;
  // gop/truy van theo lo khi do thay cham thuc te.
  loadExamAgg: (studentId: string) => Promise<StudentExamAggRow>
  loadAttendanceAgg: (studentId: string) => Promise<StudentAttendanceAggRow>
  loadStudyAgg: (studentId: string) => Promise<StudentStudyAggRow>
  /** Policy xep loai cua cap do (ADR 0006); null khi cap do chua co policy. */
  loadPolicy: (levelId: string) => Promise<ClassificationPolicy | null>
}

function toSearchResult(row: StudentSearchRow): StudentSearchResult {
  return {
    id: row.id,
    studentCode: row.student_code,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    branchName: row.branch_name,
    levelCode: row.level_code,
  }
}

export async function searchStudents(
  store: StudentsStore,
  q: string,
  branchIds: string[] | undefined,
): Promise<StudentSearchResult[]> {
  const rows = await store.searchStudents(q, branchIds)
  return rows.map(toSearchResult)
}

/** Panel thi: null khi khong co luot nao da cham. */
function toExamPanel(agg: StudentExamAggRow): StudentExamPanel | null {
  if (agg.attempts === 0) return null
  return {
    attempts: agg.attempts,
    passed: agg.passed,
    failed: agg.failed,
    avgScorePct: agg.avg_score_pct === null ? null : round1(agg.avg_score_pct),
  }
}

/**
 * Panel chuyen can: null khi chua diem danh buoi nao.
 * Ti le theo dung ADR 0006 = `ratePercentFromCounts` (loai vang CO PHEP khoi mau so),
 * dung chung cong thuc voi bao cao de hai man hinh khong lech nhau.
 */
function toAttendancePanel(agg: StudentAttendanceAggRow): StudentAttendancePanel | null {
  const total = agg.present + agg.absent + agg.late + agg.excused
  if (total === 0) return null
  return {
    present: agg.present,
    absent: agg.absent,
    late: agg.late,
    excused: agg.excused,
    ratePct: ratePercentFromCounts(agg),
  }
}

/**
 * Panel thoi gian hoc: null khi chua co buoi nao duoc ghi nhan co mat/di muon.
 * Chi dem buoi hoc vien thuc su co mat (present/late) — khong suy tu lich hoc.
 */
function toStudyPanel(agg: StudentStudyAggRow): StudentStudyPanel | null {
  if (agg.sessions_attended === 0) return null
  return { sessionsAttended: agg.sessions_attended, studyMinutes: agg.study_minutes }
}

/**
 * Panel xep loai hoc luc — theo DUNG ADR 0006 (truoc day la cong thuc tam: chi dung diem thi
 * trung binh voi nguong cung 90/75/50):
 *   final = examWeight% * diem thi + attendanceWeight% * ti le chuyen can (policy cua cap do);
 *   nhan = classify(final, nguong cua policy).
 * Null khi chua co diem thi (khong xep loai duoc) hoac cap do chua co policy.
 */
function toClassificationPanel(
  exam: StudentExamPanel | null,
  attendance: StudentAttendancePanel | null,
  policy: ClassificationPolicy | null,
): StudentClassificationPanel | null {
  if (!policy) return null
  const score = finalScore(exam?.avgScorePct ?? null, attendance?.ratePct ?? null, policy)
  if (score === null) return null
  return { finalScore: score, label: classify(score, policy) }
}

export async function loadStudentProfile(
  store: StudentsStore,
  id: string,
  branchIds: string[] | undefined,
): Promise<StudentProfile | null> {
  const identity = await store.findStudentIdentity(id, branchIds)
  if (!identity) return null

  const [examAgg, attendanceAgg, studyAgg, policy] = await Promise.all([
    store.loadExamAgg(id),
    store.loadAttendanceAgg(id),
    store.loadStudyAgg(id),
    identity.level_id ? store.loadPolicy(identity.level_id) : Promise.resolve(null),
  ])
  const exam = toExamPanel(examAgg)
  const attendance = toAttendancePanel(attendanceAgg)
  const classification = toClassificationPanel(exam, attendance, policy)

  return {
    id: identity.id,
    studentCode: identity.student_code,
    fullName: identity.full_name,
    phoneNumber: identity.phone_number,
    branchName: identity.branch_name,
    levelCode: identity.level_code,
    exam,
    attendance,
    study: toStudyPanel(studyAgg),
    classification,
  }
}
