import { useState } from 'react'
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Repeat,
  UserCheck,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  WORK_SESSION_STATUS_LABELS,
  type StaffShift,
  type TeacherWorkSummary,
  type WorkHoursReport,
  type WorkHoursReportQuery,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/useAuth'
import { buildXlsx, downloadFile, XLSX_MIME } from '@/lib/xlsx-export'
import { toHours, workHoursToSheets } from './work-hours-export'
import { useBranches, useCheckShift, useMyTimesheet, useWorkHoursReport } from './useWorkHours'

// First page in the docs/design/ui-reference.md look (soft page, rounded cards, tinted stat tiles).
// Card/input/stat classes move to shared components when the UI-shell slice restyles every page.
const CARD = 'flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm'
const INPUT = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
const TONES = {
  primary: 'bg-blue-50 text-blue-600',
  success: 'bg-emerald-50 text-emerald-600',
  accent: 'bg-violet-50 text-violet-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
} as const

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const hoursLabel = (minutes: number): string => `${toHours(minutes)} giờ`
const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

function StatCard(props: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone: keyof typeof TONES
}): React.ReactElement {
  const Icon = props.icon
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500">{props.label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{props.value}</p>
        {props.hint && <p className="mt-1 text-xs text-slate-400">{props.hint}</p>}
      </div>
      <span className={`rounded-lg p-2 ${TONES[props.tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  )
}

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }): React.ReactElement {
  return (
    <input
      aria-label="Tháng"
      type="month"
      className={INPUT}
      value={month}
      onChange={(e) => e.target.value && onChange(e.target.value)}
    />
  )
}

function TeachingCards({ teaching }: { teaching: TeacherWorkSummary }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Buổi thực dạy" value={String(teaching.held)} hint={`Theo lịch ${teaching.planned}`} icon={BookOpenCheck} tone="primary" />
      <StatCard label="Giờ dạy" value={hoursLabel(teaching.taughtMinutes)} icon={Clock} tone="success" />
      <StatCard label="Buổi nghỉ" value={String(teaching.missed)} hint="Không tính công" icon={XCircle} tone="danger" />
      <StatCard label="Dạy bù / dạy thay" value={`${teaching.makeup} / ${teaching.substitute}`} icon={Repeat} tone="accent" />
    </div>
  )
}

function ShiftTable({ shifts }: { shifts: StaffShift[] }): React.ReactElement {
  if (shifts.length === 0) return <p className="text-sm text-slate-500">Chưa có ca làm trong tháng.</p>
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-slate-500">
          <th className="py-1">Check-in</th>
          <th>Check-out</th>
          <th>Thời gian</th>
        </tr>
      </thead>
      <tbody>
        {shifts.map((s) => (
          <tr key={s.id} className="border-t border-slate-100">
            <td className="py-1">{timeLabel(s.checkInAt)}</td>
            <td>{s.checkOutAt ? timeLabel(s.checkOutAt) : <span className="text-amber-600">Đang trong ca</span>}</td>
            <td>{s.workedMinutes === null ? '—' : hoursLabel(s.workedMinutes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Staff/teacher: check in/out and see the month's work days (+ teaching for teachers). */
function MyTimesheetView(): React.ReactElement {
  const [month, setMonth] = useState(currentMonth)
  const sheet = useMyTimesheet(month, true)
  const check = useCheckShift()
  const [message, setMessage] = useState<string | null>(null)
  const open = sheet.data?.openShift ?? null

  function toggle(): void {
    setMessage(null)
    check.mutate(open ? 'check-out' : 'check-in', {
      onSuccess: () => setMessage(open ? 'Đã check-out.' : 'Đã check-in.'),
      onError: (err) => setMessage((err as Error).message),
    })
  }

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 p-6">
        <div>
          <p className="text-lg font-semibold text-slate-900">{open ? 'Bạn đang trong ca' : 'Bạn chưa check-in'}</p>
          <p className="text-sm text-slate-600">
            {open ? `Bắt đầu lúc ${timeLabel(open.checkInAt)}` : 'Check-in khi bắt đầu ca làm việc.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span role="status" className="text-sm text-slate-600">
              {message}
            </span>
          )}
          <Button onClick={toggle} disabled={check.isPending || sheet.isLoading}>
            {open ? <LogOut className="mr-1 h-4 w-4" /> : <LogIn className="mr-1 h-4 w-4" />}
            {open ? 'Check-out' : 'Check-in'}
          </Button>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Bảng công của tôi</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </div>
      {sheet.isError && <p className="text-sm text-red-600">{(sheet.error as Error).message}</p>}
      {sheet.data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="Ngày công" value={String(sheet.data.summary.workDays)} icon={CalendarDays} tone="primary" />
            <StatCard label="Giờ công" value={hoursLabel(sheet.data.summary.workedMinutes)} icon={Clock} tone="success" />
            <StatCard
              label="Ca chưa check-out"
              value={String(sheet.data.summary.openShifts)}
              hint="Chưa tính giờ"
              icon={LogOut}
              tone="warning"
            />
          </div>
          {sheet.data.teaching && <TeachingCards teaching={sheet.data.teaching} />}
          <section className={CARD}>
            <h3 className="font-medium text-slate-800">Ca làm trong tháng</h3>
            <ShiftTable shifts={sheet.data.shifts} />
          </section>
        </>
      )}
    </>
  )
}

function ReportTables({ report }: { report: WorkHoursReport }): React.ReactElement {
  return (
    <>
      <section className={CARD} aria-label="Giáo viên">
        <h3 className="font-medium text-slate-800">Giờ dạy giáo viên</h3>
        {report.teachers.length === 0 ? (
          <p className="text-sm text-slate-500">Không có buổi học trong tháng.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1">Giáo viên</th>
                <th>Theo lịch</th>
                <th>Thực dạy</th>
                <th>Nghỉ</th>
                <th>Dạy bù</th>
                <th>Dạy thay</th>
                <th>Giờ dạy</th>
              </tr>
            </thead>
            <tbody>
              {report.teachers.map((t) => (
                <tr key={t.teacherId} className="border-t border-slate-100">
                  <td className="py-1">{t.phoneNumber}</td>
                  <td>{t.planned}</td>
                  <td className="font-medium">{t.held}</td>
                  <td>{t.missed}</td>
                  <td>{t.makeup}</td>
                  <td>{t.substitute}</td>
                  <td className="font-medium">{hoursLabel(t.taughtMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={CARD} aria-label="Nhân viên">
        <h3 className="font-medium text-slate-800">Ngày công nhân viên &amp; giáo viên</h3>
        {report.staff.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có nhân viên được gán cơ sở.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1">SĐT</th>
                <th>Vai trò</th>
                <th>Ngày công</th>
                <th>Giờ công</th>
                <th>Ca chưa check-out</th>
              </tr>
            </thead>
            <tbody>
              {report.staff.map((s) => (
                <tr key={s.userId} className="border-t border-slate-100">
                  <td className="py-1">{s.phoneNumber}</td>
                  <td>{s.role === 'teacher' ? 'Giáo viên' : 'Nhân viên'}</td>
                  <td className="font-medium">{s.workDays}</td>
                  <td>{hoursLabel(s.workedMinutes)}</td>
                  <td>{s.openShifts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={CARD} aria-label="Chi tiết buổi">
        <h3 className="font-medium text-slate-800">Lịch dự kiến vs thực tế</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1">Ngày</th>
              <th>Lớp</th>
              <th>GV theo lịch</th>
              <th>GV dạy</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {report.sessions.map((s) => (
              <tr key={s.sessionId} className="border-t border-slate-100">
                <td className="py-1">
                  {s.sessionDate} {s.startsAt}
                </td>
                <td>{s.className}</td>
                <td>{s.plannedTeacherPhone ?? '—'}</td>
                <td>{s.taughtByPhone ?? '—'}</td>
                <td>
                  {WORK_SESSION_STATUS_LABELS[s.status]}
                  {s.isMakeup && <span className="ml-1 rounded bg-violet-50 px-1 text-xs text-violet-700">Bù</span>}
                  {s.isSubstitute && <span className="ml-1 rounded bg-amber-50 px-1 text-xs text-amber-700">Thay</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

/** Admin: monthly payroll report within branch scope + Excel export. */
function AdminReportView(): React.ReactElement {
  const [query, setQuery] = useState<WorkHoursReportQuery>({ month: currentMonth() })
  const branches = useBranches(true)
  const report = useWorkHoursReport(query, true)
  const data = report.data
  const totalTaught = data?.teachers.reduce((sum, t) => sum + t.taughtMinutes, 0) ?? 0
  const totalWorked = data?.staff.reduce((sum, s) => sum + s.workedMinutes, 0) ?? 0

  function exportExcel(): void {
    if (!data) return
    downloadFile(buildXlsx(workHoursToSheets(data)), `cong-gio-day-${data.month}.xlsx`, XLSX_MIME)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker month={query.month} onChange={(month) => setQuery((q) => ({ ...q, month }))} />
        <select
          aria-label="Cơ sở"
          className={INPUT}
          value={query.branchId ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, branchId: e.target.value || undefined }))}
        >
          <option value="">Tất cả cơ sở</option>
          {branches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="ml-auto" onClick={exportExcel} disabled={!data}>
          <FileSpreadsheet className="mr-1 h-4 w-4" /> Xuất Excel bảng công
        </Button>
      </div>
      {report.isLoading && <p className="text-sm text-slate-500">Đang tải báo cáo…</p>}
      {report.isError && <p className="text-sm text-red-600">{(report.error as Error).message}</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Giáo viên có lịch" value={String(data.teachers.length)} icon={UserCheck} tone="primary" />
            <StatCard label="Tổng giờ dạy" value={hoursLabel(totalTaught)} icon={BookOpenCheck} tone="success" />
            <StatCard label="Nhân sự chấm công" value={String(data.staff.length)} icon={Users} tone="accent" />
            <StatCard label="Tổng giờ công" value={hoursLabel(totalWorked)} icon={Clock} tone="warning" />
          </div>
          <ReportTables report={data} />
        </>
      )}
    </>
  )
}

/**
 * slice-8 work days + teaching hours. Teaching hours come only from real attendance
 * (ADR 0007); staff work days come from check-in/check-out.
 */
export function WorkHoursPage(): React.ReactElement {
  const { user } = useSession()
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Clock className="h-6 w-6 text-blue-600" /> Ngày công &amp; giờ dạy
          </h1>
          <Link to="/" className="flex items-center gap-1 text-sm text-slate-500 underline">
            <ArrowLeft className="h-4 w-4" /> Trang chủ
          </Link>
        </div>
        {user?.role === 'admin' ? <AdminReportView /> : <MyTimesheetView />}
      </main>
    </div>
  )
}
