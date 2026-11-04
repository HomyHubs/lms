import { questionRowsToRecords, importFailure, type ImportIssue } from './question-import'
import {
  AdminUserList,
  AttemptResponse,
  AdminUserResponse,
  BranchList,
  BranchResponse,
  CenterList,
  CenterResponse,
  ClassList,
  ClassResponse,
  CourseList,
  CourseResponse,
  EnrollmentList,
  EnrollmentResponse,
  ExamList,
  HealthResponse,
  ImportQuestionsResult,
  LevelList,
  LoginResponse,
  MeResponse,
  OkResponse,
  QuestionList,
  QuestionResponse,
  UserBranchesResponse,
  type AdminUser,
  type Branch,
  type Center,
  type Class,
  type Course,
  type CreateBranchRequest,
  type CreateCenterRequest,
  type CreateClassRequest,
  type CreateCourseRequest,
  type CreateEnrollmentRequest,
  type CreateQuestionRequest,
  type CreateUserRequest,
  type Enrollment,
  type Exam,
  type ExamAttemptView,
  type ForgotPasswordRequest,
  type Level,
  type LoginRequest,
  type PublicUser,
  type Question,
  type ResetPasswordRequest,
  type SubmitExamRequest,
  type SaveExamAnswersRequest,
  type CreateExamRequest,
  ExamResponse,
  type UpdateQuestionRequest,
  type UpdateUserRequest,
  AttendanceRates,
  ClassSessionList,
  ClassSessionResponse,
  ClassTeacherList,
  SessionAttendance,
  StudentAttendance,
  TeachingClassList,
  type AttendanceRatesQuery,
  type ClassSession,
  type ClassTeacher,
  type CreateClassSessionRequest,
  type MarkAttendanceRequest,
  type TeachingClass,
  AiRequestDetail,
  AiRequestList,
  SaveAiRequestResult,
  type AiGenerationRequest,
  type CreateAiRequestRequest,
  type UpdateAiItemRequest,
} from '@lms/shared'

/** Goi endpoint health-check that qua proxy `/api` (vite.config.ts). */
export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  const json: unknown = await res.json()
  return HealthResponse.parse(json)
}

/** Loi API kem status code de UI phan biet 401 vs loi khac. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: ImportIssue[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Dang nhap bang SDT + mat khau. Cookie phien do backend set (HttpOnly). */
export async function login(input: LoginRequest): Promise<PublicUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const message =
      res.status === 401
        ? 'So dien thoai hoac mat khau khong dung'
        : 'Dang nhap that bai, thu lai sau'
    throw new ApiError(res.status, message)
  }
  const json: unknown = await res.json()
  return LoginResponse.parse(json).user
}

/** Lay phien hien tai; tra `null` khi chua dang nhap (401). */
export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc phien')
  const json: unknown = await res.json()
  return MeResponse.parse(json).user
}

/** Dang xuat: xoa phien o backend. */
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}

/**
 * Task 3: yeu cau gui OTP dat lai mat khau toi email.
 * Backend luon tra ok:true (chong liet ke tai khoan) — UI khong tiet lo email co ton tai.
 */
export async function forgotPassword(input: ForgotPasswordRequest): Promise<void> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new ApiError(res.status, 'Khong gui duoc ma OTP, thu lai sau')
  const json: unknown = await res.json()
  OkResponse.parse(json)
}

/** Task 3: dat lai mat khau bang email + OTP + mat khau moi. */
export async function resetPassword(input: ResetPasswordRequest): Promise<void> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    let message = 'Dat lai mat khau that bai'
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // giu message mac dinh
    }
    throw new ApiError(res.status, message)
  }
  const json: unknown = await res.json()
  OkResponse.parse(json)
}

/**
 * slice-1 Task 1: quan ly nguoi dung (chi Admin). Tat ca goi qua `/api/users`
 * voi cookie phien; backend thuc thi RBAC (403 neu khong phai Admin).
 */
export async function listUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/users', { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc danh sach nguoi dung')
  const json: unknown = await res.json()
  return AdminUserList.parse(json).users
}

export async function createUser(input: CreateUserRequest): Promise<AdminUser> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const message = res.status === 409 ? 'So dien thoai da duoc su dung' : 'Tao nguoi dung that bai'
    throw new ApiError(res.status, message)
  }
  const json: unknown = await res.json()
  return AdminUserResponse.parse(json).user
}

export async function updateUser(id: string, input: UpdateUserRequest): Promise<AdminUser> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new ApiError(res.status, 'Cap nhat nguoi dung that bai')
  const json: unknown = await res.json()
  return AdminUserResponse.parse(json).user
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Xoa nguoi dung that bai')
}

/**
 * slice-1 Task 2: quan ly Center (trung tam) + Branch (co so) — chi Admin.
 * Tat ca goi qua `/api` voi cookie phien; backend thuc thi RBAC (403 neu khong phai Admin).
 */
export async function listCenters(): Promise<Center[]> {
  const res = await fetch('/api/centers', { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc danh sach trung tam')
  return CenterList.parse(await res.json()).centers
}

export async function createCenter(input: CreateCenterRequest): Promise<Center> {
  const res = await fetch('/api/centers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new ApiError(res.status, 'Tao trung tam that bai')
  return CenterResponse.parse(await res.json()).center
}

export async function deleteCenter(id: string): Promise<void> {
  const res = await fetch(`/api/centers/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Xoa trung tam that bai')
}

export async function listBranches(): Promise<Branch[]> {
  const res = await fetch('/api/branches', { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc danh sach co so')
  return BranchList.parse(await res.json()).branches
}

export async function createBranch(input: CreateBranchRequest): Promise<Branch> {
  const res = await fetch('/api/branches', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new ApiError(res.status, 'Tao co so that bai')
  return BranchResponse.parse(await res.json()).branch
}

export async function deleteBranch(id: string): Promise<void> {
  const res = await fetch(`/api/branches/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Xoa co so that bai')
}

/**
 * slice-1 Task 3: chuong trinh hoc — Level (chi doc) / Course / Class / Enrollment. Chi Admin.
 */
export async function listLevels(): Promise<Level[]> {
  const res = await fetch('/api/levels', { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc danh sach cap do')
  return LevelList.parse(await res.json()).levels
}

export async function listCourses(): Promise<Course[]> {
  const res = await fetch('/api/courses', { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc danh sach khoa hoc')
  return CourseList.parse(await res.json()).courses
}

export async function createCourse(input: CreateCourseRequest): Promise<Course> {
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new ApiError(res.status, 'Tao khoa hoc that bai')
  return CourseResponse.parse(await res.json()).course
}

export async function deleteCourse(id: string): Promise<void> {
  const res = await fetch(`/api/courses/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Xoa khoa hoc that bai')
}

export async function listClasses(): Promise<Class[]> {
  const res = await fetch('/api/classes', { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc danh sach lop')
  return ClassList.parse(await res.json()).classes
}

export async function createClass(input: CreateClassRequest): Promise<Class> {
  const res = await fetch('/api/classes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new ApiError(res.status, 'Tao lop that bai')
  return ClassResponse.parse(await res.json()).class
}

export async function deleteClass(id: string): Promise<void> {
  const res = await fetch(`/api/classes/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Xoa lop that bai')
}

export async function listEnrollments(classId: string): Promise<Enrollment[]> {
  const res = await fetch(`/api/classes/${classId}/enrollments`, { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc danh sach ghi danh')
  return EnrollmentList.parse(await res.json()).enrollments
}

export async function createEnrollment(input: CreateEnrollmentRequest): Promise<Enrollment> {
  const res = await fetch('/api/enrollments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const message =
      res.status === 409 ? 'Hoc vien da duoc ghi danh vao lop nay' : 'Ghi danh that bai'
    throw new ApiError(res.status, message)
  }
  return EnrollmentResponse.parse(await res.json()).enrollment
}

export async function deleteEnrollment(id: string): Promise<void> {
  const res = await fetch(`/api/enrollments/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Huy ghi danh that bai')
}

/**
 * slice-1 Task 4: gan Branch cho User (branch-scoped access). Chi Admin.
 */
export async function getUserBranches(userId: string): Promise<Branch[]> {
  const res = await fetch(`/api/users/${userId}/branches`, { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status, 'Khong lay duoc co so cua nguoi dung')
  return UserBranchesResponse.parse(await res.json()).branches
}

export async function setUserBranches(userId: string, branchIds: string[]): Promise<Branch[]> {
  const res = await fetch(`/api/users/${userId}/branches`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ branchIds }),
  })
  if (!res.ok) throw new ApiError(res.status, 'Luu co so cho nguoi dung that bai')
  return UserBranchesResponse.parse(await res.json()).branches
}

/**
 * slice-3: Ngan hang cau hoi. Tat ca goi qua `/api/questions` voi cookie phien;
 * backend thuc thi RBAC (Admin/Teacher) va validate strict Question Import Schema.
 */

/** Doc `{ error }` tu body loi cua backend de UI hien thong bao ro rang (fallback neu thieu). */
async function throwApiError(res: Response, fallback: string): Promise<never> {
  let message = fallback
  const errors: ImportIssue[] = []
  try {
    const body = (await res.json()) as { error?: unknown; errors?: unknown }
    if (typeof body.error === 'string' && body.error.trim() !== '') message = body.error
    if (Array.isArray(body.errors)) {
      for (const issue of body.errors) {
        if (
          typeof issue === 'object' &&
          issue !== null &&
          'row' in issue &&
          'field' in issue &&
          'message' in issue &&
          typeof issue.row === 'number' &&
          typeof issue.field === 'string' &&
          typeof issue.message === 'string'
        ) {
          errors.push({ row: issue.row, field: issue.field, message: issue.message })
        }
      }
    }
  } catch {
    // Invalid JSON uses the fallback; no server stack/body leaks.
  }
  throw new ApiError(res.status, message, errors)
}

export async function listQuestions(): Promise<Question[]> {
  const res = await fetch('/api/questions', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc danh sach cau hoi')
  return QuestionList.parse(await res.json()).questions
}

export async function createQuestion(input: CreateQuestionRequest): Promise<Question> {
  const res = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Tao cau hoi that bai')
  return QuestionResponse.parse(await res.json()).question
}

export async function updateQuestion(id: string, input: UpdateQuestionRequest): Promise<Question> {
  const res = await fetch(`/api/questions/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Cap nhat cau hoi that bai')
  return QuestionResponse.parse(await res.json()).question
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(`/api/questions/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Xoa cau hoi that bai')
}

/**
 * Import hang loat (POST /questions/import). Body `{ rows }` theo Question Import Schema.
 * BE validate strict: sai field/enum -> 400 kem message ro rang, KHONG luu gi (all-or-nothing).
 */
export async function importQuestions(
  rows: Record<string, string>[],
): Promise<ImportQuestionsResult> {
  const res = await fetch('/api/questions/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rows }),
  })
  if (!res.ok) return throwApiError(res, 'Import that bai: du lieu sai dinh dang')
  return ImportQuestionsResult.parse(await res.json())
}

/** Tach CSV thanh cac dong (mang o), ho tro o co dau ngoac kep "" (chua dau phay / xuong dong). */
function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let closed = false
  const pushField = () => {
    row.push(field)
    field = ''
    closed = false
  }
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
        closed = true
      } else field += ch
    } else if (ch === ',') pushField()
    else if (ch === '\n') {
      pushField()
      rows.push(row)
      row = []
    } else if (ch === '"') {
      if (field !== '' || closed) importFailure(rows.length + 1, 'csv', 'Dấu nháy không hợp lệ')
      inQuotes = true
    } else {
      if (closed) importFailure(rows.length + 1, 'csv', 'Ký tự sau dấu nháy đóng')
      field += ch
    }
  }
  if (inQuotes) importFailure(rows.length + 1, 'csv', 'Thiếu dấu nháy đóng')
  if (field !== '' || row.length > 0 || closed) {
    pushField()
    rows.push(row)
  }
  return rows
}

/**
 * Parse noi dung CSV thanh mang record theo header (dong dau). Ten cot giu nguyen de
 * backend validate strict — sai/thua field se bi bao loi va khong luu. O duoc trim.
 */
export function parseQuestionsCsv(text: string): Record<string, string>[] {
  return questionRowsToRecords(parseCsvRows(text))
}


export async function saveExamAnswers(examId: string, input: SaveExamAnswersRequest): Promise<ExamAttemptView> {
  const res = await fetch(`/api/exams/${examId}/answers`, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Khong luu duoc dap an; vui long thu lai')
  return AttemptResponse.parse(await res.json()).attempt
}

export async function createExamBlueprint(input: CreateExamRequest): Promise<Exam> {
  const res = await fetch('/api/exams', {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Khong tao duoc de thi')
  return ExamResponse.parse(await res.json()).exam
}

/** slice-4: danh sach de dang mo cho hoc vien (backend tu loc theo role + lich). */
export async function listExams(): Promise<Exam[]> {
  const res = await fetch('/api/exams', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc danh sach de thi')
  return ExamList.parse(await res.json()).exams
}

/** Bat dau hoac resume dung luot thi cu cua hoc vien. */
export async function startExamAttempt(examId: string): Promise<ExamAttemptView> {
  const res = await fetch(`/api/exams/${examId}/attempts`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) return throwApiError(res, 'Khong the bat dau bai thi')
  return AttemptResponse.parse(await res.json()).attempt
}

/** Lay luot thi hien tai neu trang duoc tai lai. */
export async function getExamAttempt(examId: string): Promise<ExamAttemptView> {
  const res = await fetch(`/api/exams/${examId}/attempt`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc luot thi')
  return AttemptResponse.parse(await res.json()).attempt
}

/** Nop bai mot lan; backend loc bo dap an khong thuoc de da sinh. */
export async function submitExamAttempt(
  examId: string,
  input: SubmitExamRequest,
): Promise<ExamAttemptView> {
  const res = await fetch(`/api/exams/${examId}/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Nop bai that bai')
  return AttemptResponse.parse(await res.json()).attempt
}

/**
 * slice-6: attendance. The backend enforces RBAC: only the assigned class teacher marks,
 * admins read within their branch scope, students read their own history.
 */
export async function listTeachingClasses(): Promise<TeachingClass[]> {
  const res = await fetch('/api/attendance/classes', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc danh sach lop phu trach')
  return TeachingClassList.parse(await res.json()).classes
}

export async function listClassTeachers(classId: string): Promise<ClassTeacher[]> {
  const res = await fetch(`/api/classes/${classId}/teachers`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc giao vien cua lop')
  return ClassTeacherList.parse(await res.json()).teachers
}

export async function assignClassTeacher(classId: string, teacherId: string): Promise<void> {
  const res = await fetch(`/api/classes/${classId}/teachers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ teacherId }),
  })
  if (!res.ok) return throwApiError(res, 'Gan giao vien that bai')
}

export async function removeClassTeacher(classId: string, teacherId: string): Promise<void> {
  const res = await fetch(`/api/classes/${classId}/teachers/${teacherId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) return throwApiError(res, 'Go giao vien that bai')
}

export async function listClassSessions(classId: string): Promise<ClassSession[]> {
  const res = await fetch(`/api/classes/${classId}/sessions`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc danh sach buoi hoc')
  return ClassSessionList.parse(await res.json()).sessions
}

export async function createClassSession(
  classId: string,
  input: CreateClassSessionRequest,
): Promise<ClassSession> {
  const res = await fetch(`/api/classes/${classId}/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Tao buoi hoc that bai')
  return ClassSessionResponse.parse(await res.json()).session
}

export async function getSessionAttendance(sessionId: string): Promise<SessionAttendance> {
  const res = await fetch(`/api/sessions/${sessionId}/attendance`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc diem danh')
  return SessionAttendance.parse(await res.json())
}

export async function markSessionAttendance(
  sessionId: string,
  input: MarkAttendanceRequest,
): Promise<SessionAttendance> {
  const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Luu diem danh that bai')
  return SessionAttendance.parse(await res.json())
}

export async function getMyAttendance(): Promise<StudentAttendance> {
  const res = await fetch('/api/me/attendance', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc lich su diem danh')
  return StudentAttendance.parse(await res.json())
}

export async function getStudentAttendance(studentId: string): Promise<StudentAttendance> {
  const res = await fetch(`/api/attendance/students/${studentId}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc lich su diem danh')
  return StudentAttendance.parse(await res.json())
}

export async function getAttendanceRates(query: AttendanceRatesQuery): Promise<AttendanceRates> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  const res = await fetch(`/api/attendance/rates?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc ty le chuyen can')
  return AttendanceRates.parse(await res.json())
}

/** slice-4.5: AI prompt generation + reverse import. The backend never calls an AI provider. */
export async function listAiRequests(): Promise<AiGenerationRequest[]> {
  const res = await fetch('/api/ai-requests', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc danh sach yeu cau AI')
  return AiRequestList.parse(await res.json()).requests
}

export async function getAiRequest(id: string): Promise<AiRequestDetail> {
  const res = await fetch(`/api/ai-requests/${id}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc yeu cau AI')
  return AiRequestDetail.parse(await res.json())
}

async function sendAiJson(url: string, method: string, body: unknown, fallback: string): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) return throwApiError(res, fallback)
  return res.json()
}

export async function createAiRequest(input: CreateAiRequestRequest): Promise<AiRequestDetail> {
  return AiRequestDetail.parse(await sendAiJson('/api/ai-requests', 'POST', input, 'Tao prompt that bai'))
}

export async function submitAiResults(
  id: string,
  rows: Record<string, unknown>[],
): Promise<AiRequestDetail> {
  return AiRequestDetail.parse(
    await sendAiJson(`/api/ai-requests/${id}/results`, 'POST', { rows }, 'Import ket qua AI that bai'),
  )
}

export async function updateAiItem(
  id: string,
  itemId: string,
  input: UpdateAiItemRequest,
): Promise<AiRequestDetail> {
  return AiRequestDetail.parse(
    await sendAiJson(`/api/ai-requests/${id}/items/${itemId}`, 'PATCH', input, 'Cap nhat cau hoi that bai'),
  )
}

export async function saveAiRequest(id: string): Promise<SaveAiRequestResult> {
  return SaveAiRequestResult.parse(
    await sendAiJson(`/api/ai-requests/${id}/save`, 'POST', {}, 'Luu vao ngan hang that bai'),
  )
}

/** Parses what the external AI returned: a JSON array of rows, or CSV with the import header. */
export function parseAiResultText(text: string): Record<string, unknown>[] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  if (!trimmed.startsWith('[')) return parseQuestionsCsv(trimmed)
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return importFailure(1, 'json', 'JSON không hợp lệ')
  }
  if (!Array.isArray(parsed) || parsed.some((r) => typeof r !== 'object' || r === null || Array.isArray(r))) {
    return importFailure(1, 'json', 'Cần một mảng JSON các object câu hỏi')
  }
  return parsed as Record<string, unknown>[]
}
