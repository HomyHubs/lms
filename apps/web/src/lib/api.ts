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
  NotificationList,
  RunRemindersResult,
  ImportQuestionsResult,
  LevelList,
  LoginResponse,
  MeResponse,
  OkResponse,
  QuestionEditPermissions,
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
  BranchAttendanceRates,
  ClassSessionList,
  ClassSessionResponse,
  ClassTeacherList,
  SessionAttendance,
  StudentAttendance,
  TeachingClassList,
  TodayAttendanceSummary,
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
  ClassificationPolicy,
  ClassificationPolicyList,
  StudentReport,
  type StudentReportQuery,
  type UpdateClassificationPolicyRequest,
  MyTimesheet,
  StaffShiftResponse,
  WorkHoursReport,
  type StaffShift,
  type WorkHoursReportQuery,
  ManualGradingAttemptResponse,
  ManualGradingQueue,
  type GradeAttemptRequest,
  type ManualGradingAttempt,
  type ManualGradingItem,
  ExamSetList,
  ExamSetResponse,
  ExamSetImportPreview,
  GradeImportResult,
  type CommitExamSetImportRequest,
  type AddExamSetQuestionRequest,
  type CreateExamSetRequest,
  type ExamSet,
  type ExamSetDetail,
  MediaResponse,
  QuestionMediaList,
  type MediaAsset,
  type QuestionMediaItem,
  type ExamSetListQuery,
  type UpdateExamSetRequest,
  ExamHistoryPage,
  ExamAttemptReport,
  type ExamHistoryQuery,
  type ExamAttemptReportQuery,
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

/**
 * slice-19: settings quyen sua cau hoi theo role (toan he thong). GET cho moi role da dang nhap
 * (BE merge mac dinh cho role thieu); PUT chi Admin/Superadmin (BE thuc thi RBAC + validate Zod).
 */
export async function getQuestionEditPermissions(): Promise<QuestionEditPermissions> {
  const res = await fetch('/api/settings/question-edit-permissions', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc cau hinh quyen sua cau hoi')
  return QuestionEditPermissions.parse(await res.json())
}

export async function setQuestionEditPermissions(
  permissions: QuestionEditPermissions,
): Promise<QuestionEditPermissions> {
  const res = await fetch('/api/settings/question-edit-permissions', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(permissions),
  })
  if (!res.ok) return throwApiError(res, 'Khong luu duoc cau hinh quyen sua cau hoi')
  return QuestionEditPermissions.parse(await res.json())
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


/** slice-12: raw bytes; the server decides the type from magic bytes and strips EXIF. */
export async function uploadMedia(file: Blob): Promise<MediaAsset> {
  const res = await fetch('/api/media', {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/octet-stream' }, body: file,
  })
  if (!res.ok) return throwApiError(res, 'Khong tai duoc anh len')
  return MediaResponse.parse(await res.json()).media
}

export async function getQuestionMedia(questionId: string): Promise<QuestionMediaList['media']> {
  const res = await fetch(`/api/questions/${questionId}/media`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc anh cua cau hoi')
  return QuestionMediaList.parse(await res.json()).media
}

export async function setQuestionMedia(questionId: string, media: QuestionMediaItem[]): Promise<QuestionMediaList['media']> {
  const res = await fetch(`/api/questions/${questionId}/media`, {
    method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ media }),
  })
  if (!res.ok) return throwApiError(res, 'Khong luu duoc anh cua cau hoi')
  return QuestionMediaList.parse(await res.json()).media
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

/** slice-11a: exam-set errors carry per-question `issues` that the editor shows inline. */
async function sendExamSet(url: string, method: string, body: unknown, fallback: string): Promise<ExamSetDetail> {
  const res = await fetch(url, {
    method, credentials: 'include', headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let message = fallback
    try {
      const data = (await res.json()) as { error?: unknown; issues?: { position: number | null; message: string }[] }
      if (typeof data.error === 'string') message = data.error
      if (Array.isArray(data.issues) && data.issues.length > 0) {
        message += ': ' + data.issues.map((i) => (i.position === null ? i.message : `#${i.position} ${i.message}`)).join('; ')
      }
    } catch {
      // Invalid JSON keeps the fallback.
    }
    throw new ApiError(res.status, message)
  }
  return ExamSetResponse.parse(await res.json()).examSet
}

export async function listExamSets(query: Partial<ExamSetListQuery> = {}): Promise<ExamSet[]> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  const qs = params.toString()
  const res = await fetch(`/api/exam-sets${qs ? `?${qs}` : ''}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc danh sach bo de')
  return ExamSetList.parse(await res.json()).examSets
}

export async function getExamSet(id: string): Promise<ExamSetDetail> {
  const res = await fetch(`/api/exam-sets/${id}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc bo de')
  return ExamSetResponse.parse(await res.json()).examSet
}

export const createExamSet = (input: CreateExamSetRequest) =>
  sendExamSet('/api/exam-sets', 'POST', input, 'Khong tao duoc bo de')
export const updateExamSet = (id: string, input: UpdateExamSetRequest) =>
  sendExamSet(`/api/exam-sets/${id}`, 'PATCH', input, 'Khong cap nhat duoc bo de')
export const replaceExamSetItems = (id: string, questionIds: string[]) =>
  sendExamSet(`/api/exam-sets/${id}/items`, 'PUT', { questionIds }, 'Khong luu duoc danh sach cau hoi')
export const addExamSetQuestion = (id: string, input: AddExamSetQuestionRequest) =>
  sendExamSet(`/api/exam-sets/${id}/questions`, 'POST', input, 'Khong them duoc cau hoi')
export const publishExamSet = (id: string) =>
  sendExamSet(`/api/exam-sets/${id}/publish`, 'POST', undefined, 'Khong phat hanh duoc bo de')
export const archiveExamSet = (id: string) =>
  sendExamSet(`/api/exam-sets/${id}/archive`, 'POST', undefined, 'Khong luu tru duoc bo de')
export const duplicateExamSet = (id: string) =>
  sendExamSet(`/api/exam-sets/${id}/duplicate`, 'POST', undefined, 'Khong nhan ban duoc bo de')

export async function deleteExamSet(id: string): Promise<void> {
  const res = await fetch(`/api/exam-sets/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong xoa duoc bo de')
}

/**
 * slice-11b: import Word/Excel/CSV. Step 1 sends the raw file bytes
 * (application/octet-stream) and gets a preview; nothing is saved yet.
 */
export async function previewExamSetImport(
  file: Blob,
  meta: { title: string; level: string; skill: string; fileName: string },
): Promise<ExamSetImportPreview> {
  const params = new URLSearchParams(meta)
  const res = await fetch(`/api/exam-sets/import/preview?${params.toString()}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) return throwApiError(res, 'Khong doc duoc file import')
  return ExamSetImportPreview.parse(await res.json())
}

/** slice-11b step 2: confirm the previewed items -> draft exam set (all-or-nothing). */
export async function commitExamSetImport(input: CommitExamSetImportRequest): Promise<ExamSetDetail> {
  const res = await fetch('/api/exam-sets/import/commit', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Import bo de that bai')
  return ExamSetResponse.parse(await res.json()).examSet
}

/**
 * slice-9a (revised): nhap bang diem Speaking/Writing tu file Excel/CSV theo ma hoc vien (= SDT).
 * Gui bytes tho (application/octet-stream); examId + fileName o query. Server loc theo branch-scope
 * (superadmin vuot). Tra ve so dong da ap, danh sach bo qua (kem ly do) va loi dinh dang.
 */
export async function importGrades(
  file: Blob,
  meta: { examId: string; fileName: string },
): Promise<GradeImportResult> {
  const params = new URLSearchParams(meta)
  const res = await fetch(`/api/grading/import?${params.toString()}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) return throwApiError(res, 'Khong nhap duoc bang diem')
  return GradeImportResult.parse(await res.json())
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

/** slice-9a: Speaking/Writing attempts waiting for a teacher's grade (Admin/Teacher). */
export async function listGradingQueue(): Promise<ManualGradingItem[]> {
  const res = await fetch('/api/grading/attempts', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc danh sach bai cho cham')
  return ManualGradingQueue.parse(await res.json()).attempts
}

export async function getGradingAttempt(attemptId: string): Promise<ManualGradingAttempt> {
  const res = await fetch(`/api/grading/attempts/${attemptId}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong mo duoc bai lam')
  return ManualGradingAttemptResponse.parse(await res.json()).attempt
}

export async function gradeAttempt(attemptId: string, input: GradeAttemptRequest): Promise<ManualGradingAttempt> {
  const res = await fetch(`/api/grading/attempts/${attemptId}/grade`, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Khong luu duoc diem')
  return ManualGradingAttemptResponse.parse(await res.json()).attempt
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

/** slice-16: overall + per-class attendance rates for a branch (admin-only on the backend). */
export async function getBranchAttendanceRates(branchId: string): Promise<BranchAttendanceRates> {
  const res = await fetch(`/api/attendance/rates?branchId=${encodeURIComponent(branchId)}`, {
    credentials: 'include',
  })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc ty le chuyen can')
  return BranchAttendanceRates.parse(await res.json())
}

export async function getTodayAttendanceSummary(date?: string): Promise<TodayAttendanceSummary> {
  const url = date ? `/api/attendance/today-summary?date=${date}` : '/api/attendance/today-summary'
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc diem danh theo ngay')
  return TodayAttendanceSummary.parse(await res.json())
}

/** slice-7: classification policy per level + admin student report (branch-scoped by the API). */
export async function listClassificationPolicies(): Promise<ClassificationPolicy[]> {
  const res = await fetch('/api/reports/classification-policies', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc cau hinh xep loai')
  return ClassificationPolicyList.parse(await res.json()).policies
}

export async function updateClassificationPolicy(
  levelId: string,
  input: UpdateClassificationPolicyRequest,
): Promise<ClassificationPolicy> {
  const res = await fetch(`/api/reports/classification-policies/${levelId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) return throwApiError(res, 'Luu cau hinh xep loai that bai')
  return ClassificationPolicy.parse(await res.json())
}

function queryString(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  return params.toString()
}

export async function getStudentReport(query: StudentReportQuery): Promise<StudentReport> {
  const res = await fetch(`/api/reports/students?${queryString(query)}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc bao cao hoc vien')
  return StudentReport.parse(await res.json())
}

/**
 * slice-1 (revised): xuat danh sach hoc vien — CHI superadmin (server tra 403 cho admin thuong).
 * Vuot branch-scope o server nen lay duoc toan bo.
 */
export async function exportStudentReport(query: StudentReportQuery): Promise<StudentReport> {
  const res = await fetch(`/api/reports/students/export?${queryString(query)}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Chi Quan tri cap cao duoc xuat danh sach hoc vien')
  return StudentReport.parse(await res.json())
}

/** slice-13: exam history (own or a student's) and the exam attempt report. */
export async function getExamHistory(query: ExamHistoryQuery, studentId?: string): Promise<ExamHistoryPage> {
  const path = studentId ? `/api/students/${studentId}/exam-attempts` : '/api/me/exam-attempts'
  const res = await fetch(`${path}?${queryString(query)}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc lich su thi')
  return ExamHistoryPage.parse(await res.json())
}

export async function getExamAttemptReport(query: ExamAttemptReportQuery): Promise<ExamAttemptReport> {
  const res = await fetch(`/api/reports/exam-attempts?${queryString(query)}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc bao cao thi')
  return ExamAttemptReport.parse(await res.json())
}

/** slice-8: check-in/out, own timesheet, cancel session, admin monthly work-hours report. */
export async function checkShift(action: 'check-in' | 'check-out'): Promise<StaffShift> {
  const res = await fetch(`/api/timesheet/${action}`, { method: 'POST', credentials: 'include' })
  if (!res.ok) return throwApiError(res, action === 'check-in' ? 'Check-in that bai' : 'Check-out that bai')
  return StaffShiftResponse.parse(await res.json()).shift
}

export async function getMyTimesheet(month: string): Promise<MyTimesheet> {
  const res = await fetch(`/api/me/timesheet?month=${month}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc bang cong')
  return MyTimesheet.parse(await res.json())
}

export async function getWorkHoursReport(query: WorkHoursReportQuery): Promise<WorkHoursReport> {
  const res = await fetch(`/api/reports/work-hours?${queryString(query)}`, { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc bao cao cong')
  return WorkHoursReport.parse(await res.json())
}

export async function cancelClassSession(sessionId: string): Promise<ClassSession> {
  const res = await fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST', credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Huy buoi hoc that bai')
  return ClassSessionResponse.parse(await res.json()).session
}

/** slice-9b: in-app notifications of the signed-in user + admin reminder trigger. */
export async function getNotifications(): Promise<NotificationList> {
  const res = await fetch('/api/notifications', { credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong lay duoc thong bao')
  return NotificationList.parse(await res.json())
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong danh dau duoc thong bao')
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Khong danh dau duoc thong bao')
}

export async function runReminders(): Promise<RunRemindersResult> {
  const res = await fetch('/api/notifications/run', { method: 'POST', credentials: 'include' })
  if (!res.ok) return throwApiError(res, 'Chay nhac nho that bai')
  return RunRemindersResult.parse(await res.json())
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
