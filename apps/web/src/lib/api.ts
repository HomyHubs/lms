import {
  AdminUserList,
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
  type ForgotPasswordRequest,
  type Level,
  type LoginRequest,
  type PublicUser,
  type Question,
  type ResetPasswordRequest,
  type UpdateQuestionRequest,
  type UpdateUserRequest,
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
    const message =
      res.status === 409 ? 'So dien thoai da duoc su dung' : 'Tao nguoi dung that bai'
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
    const message = res.status === 409 ? 'Hoc vien da duoc ghi danh vao lop nay' : 'Ghi danh that bai'
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
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body.error === 'string' && body.error.trim() !== '') message = body.error
  } catch {
    // Body khong phai JSON hop le -> dung fallback.
  }
  throw new ApiError(res.status, message)
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
  let src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1) // bo BOM cua file Excel/CSV
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/**
 * Parse noi dung CSV thanh mang record theo header (dong dau). Ten cot giu nguyen de
 * backend validate strict — sai/thua field se bi bao loi va khong luu. O duoc trim.
 */
export function parseQuestionsCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const header = (rows[0] ?? []).map((h) => h.trim())
  return rows
    .slice(1)
    .filter((cells) => cells.some((c) => c.trim() !== ''))
    .map((cells) => {
      const record: Record<string, string> = {}
      header.forEach((key, i) => {
        record[key] = (cells[i] ?? '').trim()
      })
      return record
    })
}
