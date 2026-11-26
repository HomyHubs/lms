import type {
  StudentAttendancePanel,
  StudentClassificationPanel,
  StudentExamPanel,
  StudentProfile,
  StudentSearchResult,
  StudentStudyPanel,
} from '@lms/shared'

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
}

/** Tong hop luot thi da cham cua hoc vien (dem + diem). */
export interface StudentExamAggRow {
  attempts: number
  passed: number
  failed: number
  /** Trung binh (score/max_score*100); null khi khong co luot cham. */
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
}

const round1 = (n: number): number => Math.round(n * 10) / 10

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

/** Panel chuyen can: null khi chua diem danh buoi nao. Ti le = (present+late)/tong. */
function toAttendancePanel(agg: StudentAttendanceAggRow): StudentAttendancePanel | null {
  const total = agg.present + agg.absent + agg.late + agg.excused
  if (total === 0) return null
  return {
    present: agg.present,
    absent: agg.absent,
    late: agg.late,
    excused: agg.excused,
    ratePct: round1(((agg.present + agg.late) / total) * 100),
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
 * Xep loai hoc luc o slice nay giu don gian (read-only tong hop): dung diem thi trung binh
 * lam diem tong tam thoi. Cong thuc xep loai day du (trong so thi/chuyen can) thuoc slice-7
 * va co the gan sau; de null khi chua co diem thi.
 * TODO(slice-30): dong bo cong thuc xep loai voi reports/service (finalScore/classify) khi chot.
 */
function toClassificationPanel(exam: StudentExamPanel | null): StudentClassificationPanel | null {
  if (!exam || exam.avgScorePct === null) return null
  const score = exam.avgScorePct
  const label =
    score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 50 ? 'average' : 'weak'
  return { finalScore: score, label }
}

export async function loadStudentProfile(
  store: StudentsStore,
  id: string,
  branchIds: string[] | undefined,
): Promise<StudentProfile | null> {
  const identity = await store.findStudentIdentity(id, branchIds)
  if (!identity) return null

  const [examAgg, attendanceAgg, studyAgg] = await Promise.all([
    store.loadExamAgg(id),
    store.loadAttendanceAgg(id),
    store.loadStudyAgg(id),
  ])
  const exam = toExamPanel(examAgg)
  const attendance = toAttendancePanel(attendanceAgg)
  const classification = toClassificationPanel(exam)

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
