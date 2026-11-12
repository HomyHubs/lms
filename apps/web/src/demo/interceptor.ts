/**
 * Fetch interceptor cho chế độ demo (read-only, không server).
 *
 * Toàn bộ app gọi backend qua fetch('/api/...'). Khi demo mode bật và đã có dataset,
 * interceptor này trả Response tổng hợp từ dataset thay vì ra mạng:
 *  - GET  /api/...  -> lấy dữ liệu từ dataset (hoặc shape rỗng hợp lệ nếu chưa có).
 *  - auth login/logout/me -> cho qua để vào app với quyền Admin.
 *  - mọi ghi khác (POST/PUT/PATCH/DELETE) -> 403 "chỉ xem".
 *
 * UI, React Query và Zod schema giữ nguyên — không sửa trang nào.
 */
import { getDataset, isDemoMode } from './store'

let installed = false

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const READ_ONLY = { error: 'Chế độ demo chỉ xem (read-only). Thao tác này bị vô hiệu hóa.' }

/**
 * Lấy giá trị trong dataset theo danh sách key (thử lần lượt). Trả undefined nếu không có.
 */
function pick(ds: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (ds[k] !== undefined) return ds[k]
  }
  return undefined
}

/**
 * Xử lý một GET /api/<path>. Trả về body JSON đúng shape mà api.ts mong đợi
 * (các response đều bọc trong object có key, ví dụ { questions }, { examSets }, { user }).
 * Nếu dataset không có dữ liệu cho path, trả shape rỗng hợp lệ để màn hình không lỗi.
 */
function handleGet(path: string, ds: Record<string, unknown>): Response {
  // Chuẩn hoá: bỏ query string để so khớp, giữ lại để tra cứu nếu cần.
  const clean = path.split('?')[0] ?? path
  const seg = clean.split('/').filter(Boolean) // ['api', ...]
  const p = seg.slice(1) // bỏ 'api'

  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
  const obj = (v: unknown, fallback: unknown): unknown => (v && typeof v === 'object' ? v : fallback)

  // --- Auth ---
  if (clean === '/api/auth/me') return json({ user: (pick(ds, 'me') as { user?: unknown })?.user ?? ds.user ?? null })
  if (clean === '/api/health') return json({ status: 'ok' })

  // --- Danh sách cấp 1 ---
  if (clean === '/api/users') return json({ users: arr(pick(ds, 'users')) })
  if (clean === '/api/centers') return json({ centers: arr(pick(ds, 'centers')) })
  if (clean === '/api/branches') return json({ branches: arr(pick(ds, 'branches')) })
  if (clean === '/api/levels') return json({ levels: arr(pick(ds, 'levels')) })
  if (clean === '/api/courses') return json({ courses: arr(pick(ds, 'courses')) })
  if (clean === '/api/classes') return json({ classes: arr(pick(ds, 'classes')) })
  if (clean === '/api/questions') return json({ questions: arr(pick(ds, 'questions')) })
  if (clean === '/api/exams') return json({ exams: arr(pick(ds, 'exams')) })
  if (clean === '/api/exam-sets') return json({ examSets: arr(pick(ds, 'examSets')) })
  if (clean === '/api/notifications') return json(obj(pick(ds, 'notifications'), { notifications: [], unreadCount: 0 }))
  if (clean === '/api/ai-requests') return json({ requests: arr(pick(ds, 'aiRequests')) })
  if (clean === '/api/grading/attempts') return json({ attempts: arr(pick(ds, 'gradingQueue')) })

  // --- Attendance ---
  if (clean === '/api/attendance/classes') return json({ classes: arr(pick(ds, 'teachingClasses')) })
  if (clean === '/api/attendance/rates') return json(obj(pick(ds, 'attendanceRates'), { rates: [] }))
  if (clean.startsWith('/api/attendance/today-summary'))
    return json(obj(pick(ds, 'todayAttendanceSummary'), { sessions: [], totals: {} }))
  if (clean === '/api/me/attendance') return json(obj(pick(ds, 'myAttendance'), { sessions: [] }))

  // --- Reports ---
  if (clean === '/api/reports/classification-policies')
    return json({ policies: arr(pick(ds, 'classificationPolicies')) })
  if (clean.startsWith('/api/reports/students'))
    return json(obj(pick(ds, 'studentReport'), { rows: [], summary: {} }))
  if (clean.startsWith('/api/reports/exam-attempts'))
    return json(obj(pick(ds, 'examAttemptReport'), { rows: [], summary: {} }))
  if (clean.startsWith('/api/reports/work-hours'))
    return json(obj(pick(ds, 'workHoursReport'), { rows: [] }))

  // --- Work hours ---
  if (clean.startsWith('/api/me/timesheet')) return json(obj(pick(ds, 'myTimesheet'), { shifts: [], totals: {} }))

  // --- Exam history ---
  if (clean.startsWith('/api/me/exam-attempts') || clean.startsWith('/api/students/'))
    return json(obj(pick(ds, 'examHistory'), { items: [], total: 0 }))

  // --- Cấp 2 (có path param) ---
  // /api/classes/:id/enrollments  | /sessions | /teachers
  if (p[0] === 'classes' && p.length === 3) {
    const classId = p[1]
    const byClass = (key: string): unknown[] => {
      const m = pick(ds, key) as Record<string, unknown[]> | undefined
      if (Array.isArray(m)) return m as unknown[]
      if (m && typeof m === 'object' && classId) return arr(m[classId])
      return []
    }
    if (p[2] === 'enrollments') return json({ enrollments: byClass('enrollments') })
    if (p[2] === 'sessions') return json({ sessions: byClass('classSessions') })
    if (p[2] === 'teachers') return json({ teachers: byClass('classTeachers') })
  }
  // /api/exam-sets/:id
  if (p[0] === 'exam-sets' && p.length === 2) {
    const id = p[1] ?? ''
    const map = pick(ds, 'examSetDetails') as Record<string, unknown> | undefined
    const detail = map && typeof map === 'object' ? map[id] : undefined
    return json({ examSet: detail ?? { id, items: [], questions: [] } })
  }
  // /api/sessions/:id/attendance
  if (p[0] === 'sessions' && p[2] === 'attendance') {
    const id = p[1] ?? ''
    const map = pick(ds, 'sessionAttendance') as Record<string, unknown> | undefined
    const v = map && typeof map === 'object' ? map[id] : undefined
    return json(v ?? { sessionId: id, records: [] })
  }
  // /api/users/:id/branches
  if (p[0] === 'users' && p[2] === 'branches') {
    const id = p[1] ?? ''
    const map = pick(ds, 'userBranches') as Record<string, unknown> | undefined
    const v = map && typeof map === 'object' ? map[id] : undefined
    return json({ branches: Array.isArray(v) ? v : [] })
  }
  // /api/questions/:id/media
  if (p[0] === 'questions' && p[2] === 'media') return json({ media: [] })
  // /api/exams/:id/attempt  (chưa làm bài trong demo)
  if (p[0] === 'exams' && p[2] === 'attempt') return json({ attempt: null })
  // /api/grading/attempts/:id
  if (p[0] === 'grading' && p[1] === 'attempts' && p.length === 3) {
    const id = p[2] ?? ''
    const map = pick(ds, 'gradingAttempts') as Record<string, unknown> | undefined
    const v = map && typeof map === 'object' ? map[id] : undefined
    return json(v ?? { attempt: null, items: [] })
  }

  // --- Mặc định: trả object rỗng để tránh crash (màn hình sẽ hiển thị "không có dữ liệu"). ---
  return json({})
}

export function installDemoFetch(): void {
  if (installed) return
  installed = true
  const original = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') ?? 'GET').toUpperCase()

    // Chỉ can thiệp khi demo mode bật và là call nội bộ /api/...
    if (!isDemoMode() || !url.startsWith('/api/')) {
      return original(input, init)
    }

    const ds = getDataset()
    if (!ds) {
      // Chưa nạp dataset: báo 401 để UI hiện màn đăng nhập / loader bọc ngoài xử lý.
      return json({ error: 'Chưa nạp dữ liệu demo' }, 401)
    }

    // Auth: cho đăng nhập / đăng xuất để vào app với quyền trong dataset.
    if (url.startsWith('/api/auth/login')) return json({ user: (ds.me as { user?: unknown })?.user ?? ds.user })
    if (url.startsWith('/api/auth/logout')) return new Response(null, { status: 204 })

    if (method === 'GET') return handleGet(url, ds as Record<string, unknown>)

    // Mọi ghi khác đều bị chặn (chế độ chỉ xem).
    return json(READ_ONLY, 403)
  }
}
