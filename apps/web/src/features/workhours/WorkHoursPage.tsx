import { useState } from 'react'
import {
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
} from 'lucide-react'
import {
  WORK_SESSION_STATUS_LABELS,
  type StaffShift,
  type TeacherWorkSummary,
  type WorkHoursReport,
  type WorkHoursReportQuery,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardTitle, PageHeader, StatCard } from '@/components/ui/card'
import { useSession } from '@/features/auth/useAuth'
import { currentMonth } from '@/lib/utils'
import { buildXlsx, downloadFile, XLSX_MIME } from '@/lib/xlsx-export'
import { toHours, workHoursToSheets } from './work-hours-export'
import { useBranches, useCheckShift, useMyTimesheet, useWorkHoursReport } from './useWorkHours'

const hoursLabel = (minutes: number): string => `${toHours(minutes)} giờ`
const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }): React.ReactElement {
  return (
    <input
      aria-label="Tháng"
      type="month"
      className="c-input"
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
    <table className="c-table">
      <thead>
        <tr>
          <th>Check-in</th>
          <th>Check-out</th>
          <th>Thời gian</th>
        </tr>
      </thead>
      <tbody>
        {shifts.map((s) => (
          <tr key={s.id}>
            <td>{timeLabel(s.checkInAt)}</td>
            <td>{s.checkOutAt ? timeLabel(s.checkOutAt) : <Badge tone="warning">Đang trong ca</Badge>}</td>
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
      <section className="c-hero">
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
      {sheet.isError && <p className="text-sm text-danger-600">{(sheet.error as Error).message}</p>}
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
          <Card>
            <CardTitle>Ca làm trong tháng</CardTitle>
            <ShiftTable shifts={sheet.data.shifts} />
          </Card>
        </>
      )}
    </>
  )
}

function ReportTables({ report }: { report: WorkHoursReport }): React.ReactElement {
  return (
    <>
      <Card aria-label="Giáo viên">
        <CardTitle>Giờ dạy giáo viên</CardTitle>
        {report.teachers.length === 0 ? (
          <p className="text-sm text-slate-500">Không có buổi học trong tháng.</p>
        ) : (
          <table className="c-table">
            <thead>
              <tr>
                <th>Giáo viên</th>
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
                <tr key={t.teacherId}>
                  <td>{t.phoneNumber}</td>
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
      </Card>

      <Card aria-label="Nhân viên">
        <CardTitle>Ngày công nhân viên &amp; giáo viên</CardTitle>
        {report.staff.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có nhân viên được gán cơ sở.</p>
        ) : (
          <table className="c-table">
            <thead>
              <tr>
                <th>SĐT</th>
                <th>Vai trò</th>
                <th>Ngày công</th>
                <th>Giờ công</th>
                <th>Ca chưa check-out</th>
              </tr>
            </thead>
            <tbody>
              {report.staff.map((s) => (
                <tr key={s.userId}>
                  <td>{s.phoneNumber}</td>
                  <td>{s.role === 'teacher' ? 'Giáo viên' : 'Nhân viên'}</td>
                  <td className="font-medium">{s.workDays}</td>
                  <td>{hoursLabel(s.workedMinutes)}</td>
                  <td>{s.openShifts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card aria-label="Chi tiết buổi">
        <CardTitle>Lịch dự kiến vs thực tế</CardTitle>
        <table className="c-table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Lớp</th>
              <th>GV theo lịch</th>
              <th>GV dạy</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {report.sessions.map((s) => (
              <tr key={s.sessionId}>
                <td>
                  {s.sessionDate} {s.startsAt}
                </td>
                <td>{s.className}</td>
                <td>{s.plannedTeacherPhone ?? '—'}</td>
                <td>{s.taughtByPhone ?? '—'}</td>
                <td>
                  <span className="inline-flex items-center gap-1">
                    {WORK_SESSION_STATUS_LABELS[s.status]}
                    {s.isMakeup && <Badge tone="accent">Bù</Badge>}
                    {s.isSubstitute && <Badge tone="warning">Thay</Badge>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
          className="c-input"
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
      {report.isError && <p className="text-sm text-danger-600">{(report.error as Error).message}</p>}
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
    <>
      <PageHeader icon={Clock} title="Ngày công & giờ dạy" />
      {user?.role === 'admin' ? <AdminReportView /> : <MyTimesheetView />}
    </>
  )
}
