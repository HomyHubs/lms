import type { UserRole } from './auth.js'

/**
 * Ma quyen theo NANG LUC, khong theo route.
 *
 * slice-1 (huong toi thieu): truoc day quyen duoc viet lai thanh danh sach role tai ~30 cho khai bao
 * guard trong `apps/api/src/features/<feature>/routes.ts` (11 to hop role khac nhau), cong them mot ban
 * sao o FE (`components/layout/nav.ts`) va mot guard tu viet rieng trong `users/routes.ts`. Hien trang do
 * co ba he qua:
 *
 *  1. Khong co cho nao tra loi duoc "ai duoc export danh sach hoc vien?" ngoai `grep`.
 *  2. Them mot role moi phai ra soat tung danh sach, va rat de bo sot.
 *  3. Luat "superadmin vuot moi guard" duoc cai lai o 6 noi (xem `isAllowed`).
 *
 * Ten quyen duoc dat theo `<mien>.<hanh dong>` va giu DUNG tap role nhu truoc, nen day la refactor
 * khong doi hanh vi. Muon doi quyen thi sua o day, khong sua o route.
 */
export const PERMISSIONS = [
  // Danh muc (cap do / khoa hoc / lop). `read` cho moi role vi hoc vien can xem lop cua minh;
  // `read.staff` la ban doc danh muc day du danh cho nguoi tao de chon lop ap dung (slice-14).
  'catalog.read',
  'catalog.read.staff',
  'catalog.manage',
  'center.manage',
  'setting.manage',
  'user.manage',
  // Bao cao: `read` cho admin xem tren man hinh, `export` chi superadmin (chong ro ri danh sach hoc vien).
  'report.read',
  'report.export',
  'notification.read',
  'notification.manage',
  // Ngan hang cau hoi: staff duoc doc de cham/doi chieu, chi admin+teacher duoc sua.
  'question.read',
  'question.edit',
  // De thi: `manage` la soan de/bo de/hinh/anh/AI, `assignClass` la gan lop cho de,
  // `administrate` la thao tac quan tri rieng cua admin, `take` la lam bai.
  'exam.manage',
  'exam.assignClass',
  'exam.administrate',
  'exam.take',
  'exam.history.read',
  'exam.history.self',
  // Cham bai: `grade` cham tung cau (ke ca chon tay), `import` nhap bang diem tu file.
  'grading.grade',
  'grading.import',
  // Diem danh: `record` la giao vien diem danh lop minh, `read` la xem bang tong hop,
  // `team` la thao tac tren nhieu lop, `office` la nghiep vu van phong (admin+staff).
  'attendance.manage',
  'attendance.record',
  'attendance.read',
  'attendance.team',
  'attendance.office',
  'attendance.self',
  'workhours.read',
  'workhours.manage',
  'student.read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

/**
 * Ma tran role -> quyen. Day la noi DUY NHAT dinh nghia ai duoc lam gi.
 *
 * `superadmin` lay ca mang `PERMISSIONS` thay vi liet ke tay: them quyen moi thi superadmin co ngay,
 * khong the quen.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  superadmin: PERMISSIONS,
  admin: [
    'catalog.read',
    'catalog.read.staff',
    'catalog.manage',
    'center.manage',
    'setting.manage',
    'user.manage',
    'report.read',
    'notification.read',
    'notification.manage',
    'question.read',
    'question.edit',
    'exam.manage',
    'exam.assignClass',
    'exam.administrate',
    'exam.history.read',
    'grading.grade',
    'grading.import',
    'attendance.manage',
    'attendance.read',
    'attendance.team',
    'attendance.office',
    'workhours.manage',
    'student.read',
  ],
  teacher: [
    'catalog.read',
    'catalog.read.staff',
    'notification.read',
    'question.read',
    'question.edit',
    'exam.manage',
    'exam.assignClass',
    'exam.history.read',
    'grading.grade',
    'attendance.record',
    'attendance.read',
    'attendance.team',
    'workhours.read',
    'student.read',
  ],
  student: ['catalog.read', 'notification.read', 'exam.take', 'exam.history.self', 'attendance.self'],
  staff: [
    'catalog.read',
    'catalog.read.staff',
    'notification.read',
    'question.read',
    'exam.assignClass',
    'grading.grade',
    'grading.import',
    'attendance.team',
    'attendance.office',
    'workhours.read',
    'student.read',
  ],
}

/** Nguoi dung co quyen nay khong. */
export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Kiem tra theo DANH SACH ROLE (cach cu, giu lai cho cac route chi yeu cau dang nhap).
 *
 * Luat "superadmin vuot moi guard" nam DUY NHAT o day. Truoc day no duoc cai lai o `rbac.ts`,
 * `exams/routes.ts` (3 cho), `questions/routes.ts` va `RequireAuth.tsx` — them mot cho kiem tra moi ma
 * quen luat thi chi tai khoan superadmin gap 403, va khong test nao bat duoc.
 *
 * Danh sach rong = chi yeu cau da dang nhap.
 */
export function isAllowed(role: UserRole, roles: readonly UserRole[]): boolean {
  if (roles.length === 0) return true
  return role === 'superadmin' || roles.includes(role)
}
