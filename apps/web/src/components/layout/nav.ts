import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileStack,
  History,
  LayoutDashboard,
  ListChecks,
  MapPin,
  PenLine,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@lms/shared'
import type { Tone } from '@/components/ui/tone'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị',
  teacher: 'Giáo viên',
  staff: 'Nhân viên',
  student: 'Học viên',
}

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** Tint of the dashboard shortcut tile. */
  tone: Tone
  roles: readonly UserRole[]
}

/** Single source for the sidebar, dashboard shortcuts and route role guards (App.tsx). */
export const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: LayoutDashboard, tone: 'primary', roles: ['admin', 'teacher', 'staff', 'student'] },
  { path: '/exams', label: 'Bài thi của tôi', icon: ClipboardList, tone: 'accent', roles: ['student'] },
  { path: '/exam-history', label: 'Lịch sử thi', icon: History, tone: 'primary', roles: ['student'] },
  { path: '/attendance', label: 'Điểm danh', icon: CalendarCheck, tone: 'success', roles: ['admin', 'teacher', 'student'] },
  { path: '/questions', label: 'Ngân hàng câu hỏi', icon: ListChecks, tone: 'primary', roles: ['admin', 'teacher'] },
  { path: '/exam-sets', label: 'Bộ đề & đề thi', icon: FileStack, tone: 'warning', roles: ['admin', 'teacher'] },
  { path: '/ai-questions', label: 'Sinh câu hỏi AI', icon: Sparkles, tone: 'accent', roles: ['admin', 'teacher'] },
  { path: '/grading', label: 'Chấm bài', icon: PenLine, tone: 'success', roles: ['admin', 'teacher'] },
  { path: '/exam-reports', label: 'Báo cáo thi', icon: ClipboardCheck, tone: 'accent', roles: ['admin', 'teacher'] },
  { path: '/work-hours', label: 'Ngày công & giờ dạy', icon: Clock, tone: 'warning', roles: ['admin', 'teacher', 'staff'] },
  { path: '/reports', label: 'Báo cáo & xếp loại', icon: BarChart3, tone: 'danger', roles: ['admin'] },
  { path: '/users', label: 'Người dùng', icon: Users, tone: 'primary', roles: ['admin'] },
  { path: '/centers', label: 'Trung tâm & cơ sở', icon: Building2, tone: 'success', roles: ['admin'] },
  { path: '/catalog', label: 'Chương trình học', icon: BookOpen, tone: 'accent', roles: ['admin'] },
  { path: '/assignments', label: 'Gán cơ sở', icon: MapPin, tone: 'warning', roles: ['admin'] },
] as const satisfies readonly NavItem[]

export type NavPath = (typeof NAV_ITEMS)[number]['path']

export function navItemsFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => (item.roles as readonly UserRole[]).includes(role))
}
