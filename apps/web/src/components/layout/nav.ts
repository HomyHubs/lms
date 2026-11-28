import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileStack,
  GraduationCap,
  History,
  LayoutDashboard,
  ListChecks,
  MapPin,
  PenLine,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Permission, UserRole } from '@lms/shared'
import { canAny } from '@lms/shared'
import type { Tone } from '@/components/ui/tone'

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Quáº£n trá»‹ cáº¥p cao',
  admin: 'Quáº£n trá»‹',
  teacher: 'GiÃ¡o viÃªn',
  staff: 'NhÃ¢n viÃªn',
  student: 'Há»c viÃªn',
}

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** Tint of the dashboard shortcut tile. */
  tone: Tone
  /**
   * Quyen duoc thay muc nay (any-of; mang rong = moi nguoi da dang nhap) — ADR 0024.
   *
   * Truoc day cho nay la `roles`, tuc FE giu mot ban sao thu hai cua "ai duoc lam gi" ben canh ma
   * tran cua API (ADR 0021). Lech nhau thi im lang: menu hien trang ma API tra 403, hoac menu giau
   * mot trang nguoi dung co quyen.
   */
  permissions: readonly Permission[]
  group?: 'exams'
}

/**
 * Nguon duy nhat cho sidebar, tile o Tong quan va cong route (App.tsx).
 *
 * Tap quyen o day KHONG phai luc nao cung bang tap quyen cua API tuong ung: menu la y dinh san pham
 * (ai duoc thay loi vao), API la nang luc (ai duoc goi). Hai cho khac nhau co chu y — xem ADR 0024.
 */
export const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: LayoutDashboard, tone: 'primary', permissions: [] },
  { path: '/exam-management', label: 'Quản lý thi', icon: ClipboardList, tone: 'accent', permissions: ['exam.manage', 'exam.take'] },
  { path: '/exams', label: 'Bài thi của tôi', icon: ClipboardList, tone: 'accent', permissions: ['exam.take'], group: 'exams' },
  { path: '/exam-history', label: 'Lịch sử thi', icon: History, tone: 'primary', permissions: ['exam.history.self'], group: 'exams' },
  { path: '/attendance', label: 'Điểm danh', icon: CalendarCheck, tone: 'success', permissions: ['attendance.read', 'attendance.self'] },
  { path: '/questions', label: 'Ngân hàng câu hỏi', icon: ListChecks, tone: 'primary', permissions: ['question.edit'], group: 'exams' },
  { path: '/exam-sets', label: 'Bộ đề & đề thi', icon: FileStack, tone: 'warning', permissions: ['exam.manage'], group: 'exams' },
  { path: '/ai-questions', label: 'Sinh câu hỏi AI', icon: Sparkles, tone: 'accent', permissions: ['exam.manage'], group: 'exams' },
  { path: '/grading', label: 'Chấm bài', icon: PenLine, tone: 'success', permissions: ['grading.menu'], group: 'exams' },
  { path: '/exam-reports', label: 'Báo cáo thi', icon: ClipboardCheck, tone: 'accent', permissions: ['exam.history.read'], group: 'exams' },
  { path: '/work-hours', label: 'Ngày công & giờ dạy', icon: Clock, tone: 'warning', permissions: ['workhours.read', 'workhours.manage'] },
  { path: '/reports', label: 'Báo cáo & xếp loại', icon: BarChart3, tone: 'danger', permissions: ['report.read'] },
  { path: '/users', label: 'Người dùng', icon: Users, tone: 'primary', permissions: ['user.manage'] },
  { path: '/centers', label: 'Trung tâm & cơ sở', icon: Building2, tone: 'success', permissions: ['center.manage'] },
  { path: '/catalog', label: 'Chương trình học', icon: BookOpen, tone: 'accent', permissions: ['catalog.manage'] },
  { path: '/assignments', label: 'Ghi danh & Quản lý', icon: MapPin, tone: 'warning', permissions: ['enrollment.manage'] },
  { path: '/students', label: 'Học viên', icon: GraduationCap, tone: 'success', permissions: ['student.read'] },
] as const satisfies readonly NavItem[]

export type NavPath = (typeof NAV_ITEMS)[number]['path']

/**
 * superadmin thay menu cua admin (tai khoan cao nhat).
 *
 * Co y KHONG map sang "co moi quyen": superadmin co `exam.take` nen se thay ca "Bai thi cua toi" —
 * muc chi co nghia voi hoc vien. Giu nguyen hanh vi cu (truoc day cung map sang admin); cau hoi
 * "thay menu gi" va "duoc vao khong" la hai cau hoi khac nhau (ADR 0024).
 */
function effectiveRole(role: UserRole): UserRole {
  return role === 'superadmin' ? 'admin' : role
}

export function navItemsFor(role: UserRole): NavItem[] {
  const effective = effectiveRole(role)
  return NAV_ITEMS.filter((item) => !(item as NavItem).group && canAny(effective, (item as NavItem).permissions))
}

export function examItemsFor(role: UserRole): NavItem[] {
  const effective = effectiveRole(role)
  return NAV_ITEMS.filter((item) => (item as NavItem).group === 'exams' && canAny(effective, (item as NavItem).permissions))
}
