import {
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock,
  GraduationCap,
  LogOut,
  School,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PublicUser } from '@lms/shared'
import { navItemsFor, ROLE_LABELS } from '@/components/layout/nav'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardTitle, StatCard } from '@/components/ui/card'
import { TONE_TILE } from '@/components/ui/tone'
import { useSession } from '@/features/auth/useAuth'
import { useMyAttendance, useTeachingClasses } from '@/features/attendance/useAttendance'
import { useClasses } from '@/features/catalog/useCatalog'
import { useBranches } from '@/features/centers/useCenters'
import { useExams } from '@/features/exams/useExams'
import { useUsers } from '@/features/users/useUsers'
import { toHours } from '@/features/workhours/work-hours-export'
import { useMyTimesheet } from '@/features/workhours/useWorkHours'
import { cn, currentMonth } from '@/lib/utils'
import { DashboardCharts } from './DashboardCharts'

const count = (value: number | undefined): string => (value === undefined ? '—' : String(value))
const hours = (minutes: number | undefined): string => (minutes === undefined ? '—' : `${toHours(minutes)} giờ`)

function greeting(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
}

function Hero({ user, subtitle }: { user: PublicUser; subtitle: string }): React.ReactElement {
  const [, firstAction] = navItemsFor(user.role)
  return (
    <section className="c-hero">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {greeting()}, {ROLE_LABELS[user.role].toLowerCase()} {user.phoneNumber}!
        </h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
      {firstAction && (
        <Link to={firstAction.path} className={cn(buttonVariants(), 'gap-2')}>
          <firstAction.icon className="h-4 w-4" /> {firstAction.label}
        </Link>
      )}
    </section>
  )
}

function QuickLinks({ user }: { user: PublicUser }): React.ReactElement {
  const links = navItemsFor(user.role).filter((item) => item.path !== '/')
  return (
    <Card>
      <CardTitle>Truy cập nhanh</CardTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {links.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 p-3 text-center text-sm text-slate-700 hover:border-primary-200 hover:bg-primary-50"
          >
            <span className={cn('rounded-lg p-2', TONE_TILE[item.tone])}>
              <item.icon className="h-5 w-5" />
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </Card>
  )
}

function StatGrid({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
}

function AdminDashboard({ user }: { user: PublicUser }): React.ReactElement {
  const users = useUsers()
  const branches = useBranches()
  const classes = useClasses()
  const byRole = (role: PublicUser['role']) => users.data?.filter((u) => u.role === role).length
  return (
    <>
      <Hero user={user} subtitle={`${count(branches.data?.length)} cơ sở · ${count(classes.data?.length)} lớp đang quản lý.`} />
      <StatGrid>
        <StatCard label="Học viên" value={count(byRole('student'))} icon={GraduationCap} tone="primary" />
        <StatCard label="Giáo viên" value={count(byRole('teacher'))} icon={UserCheck} tone="success" />
        <StatCard label="Cơ sở" value={count(branches.data?.length)} icon={Building2} tone="accent" />
        <StatCard label="Lớp học" value={count(classes.data?.length)} icon={School} tone="warning" />
      </StatGrid>
      <DashboardCharts />
    </>
  )
}

function TeacherDashboard({ user }: { user: PublicUser }): React.ReactElement {
  const classes = useTeachingClasses(true)
  const sheet = useMyTimesheet(currentMonth(), true)
  const teaching = sheet.data?.teaching ?? undefined
  return (
    <>
      <Hero user={user} subtitle={`Bạn phụ trách ${count(classes.data?.length)} lớp. Tháng này đã dạy ${hours(teaching?.taughtMinutes)}.`} />
      <StatGrid>
        <StatCard label="Lớp phụ trách" value={count(classes.data?.length)} icon={School} tone="primary" />
        <StatCard label="Buổi thực dạy (tháng)" value={count(teaching?.held)} hint={teaching && `Theo lịch ${teaching.planned}`} icon={BookOpenCheck} tone="success" />
        <StatCard label="Giờ dạy (tháng)" value={hours(teaching?.taughtMinutes)} icon={Clock} tone="accent" />
        <StatCard label="Buổi nghỉ" value={count(teaching?.missed)} icon={XCircle} tone="danger" />
      </StatGrid>
      {classes.data && classes.data.length > 0 && (
        <Card>
          <CardTitle>Lớp của tôi</CardTitle>
          <ul className="flex flex-wrap gap-2 text-sm">
            {classes.data.map((c) => (
              <li key={c.id} className={cn('rounded-lg px-3 py-1.5', TONE_TILE.primary)}>
                {c.name}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function StaffDashboard({ user }: { user: PublicUser }): React.ReactElement {
  const sheet = useMyTimesheet(currentMonth(), true)
  const open = sheet.data?.openShift ?? null
  return (
    <>
      <Hero user={user} subtitle={open ? 'Bạn đang trong ca — nhớ check-out khi kết thúc.' : 'Bạn chưa check-in hôm nay.'} />
      <StatGrid>
        <StatCard label="Ngày công (tháng)" value={count(sheet.data?.summary.workDays)} icon={CalendarDays} tone="primary" />
        <StatCard label="Giờ công (tháng)" value={hours(sheet.data?.summary.workedMinutes)} icon={Clock} tone="success" />
        <StatCard label="Ca chưa check-out" value={count(sheet.data?.summary.openShifts)} icon={LogOut} tone="warning" />
      </StatGrid>
    </>
  )
}

function StudentDashboard({ user }: { user: PublicUser }): React.ReactElement {
  const attendance = useMyAttendance(true)
  const exams = useExams()
  const summary = attendance.data?.summary
  const rate = summary?.ratePercent
  return (
    <>
      <Hero user={user} subtitle={`Có ${count(exams.data?.length)} bài thi đang mở cho bạn.`} />
      <StatGrid>
        <StatCard label="Tỷ lệ chuyên cần" value={rate === undefined || rate === null ? '—' : `${rate}%`} icon={CalendarCheck} tone="primary" />
        <StatCard label="Buổi đã học" value={count(summary?.total)} icon={BookOpenCheck} tone="success" />
        <StatCard label="Buổi vắng" value={count(summary?.absent)} icon={XCircle} tone="danger" />
        <StatCard label="Bài thi đang mở" value={count(exams.data?.length)} icon={ClipboardList} tone="accent" />
      </StatGrid>
    </>
  )
}

const DASHBOARDS = {
  admin: AdminDashboard,
  teacher: TeacherDashboard,
  staff: StaffDashboard,
  student: StudentDashboard,
} satisfies Record<PublicUser['role'], (props: { user: PublicUser }) => React.ReactElement>

/** `/`: role dashboard (greeting, stat cards, shortcuts) inside AppShell. */
export function HomePage(): React.ReactElement | null {
  const { user } = useSession()
  if (!user) return null // rendered only inside RequireAuth
  const Dashboard = DASHBOARDS[user.role]
  return (
    <>
      <Dashboard user={user} />
      <QuickLinks user={user} />
    </>
  )
}
