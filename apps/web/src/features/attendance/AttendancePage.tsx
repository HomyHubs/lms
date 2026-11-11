import { useEffect, useState, type FormEvent } from 'react'
import { CalendarCheck, Trash2 } from 'lucide-react'
import {
  AttendanceStatus,
  CreateClassSessionRequest,
  type AttendanceSummary,
  type ClassSession,
  type StudentAttendance,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { useSession } from '@/features/auth/useAuth'
import {
  useAdminClasses,
  useAssignTeacher,
  useCancelSession,
  useClassRates,
  useClassSessions,
  useClassTeachers,
  useCreateSession,
  useMarkAttendance,
  useMyAttendance,
  useRemoveTeacher,
  useSessionAttendance,
  useStudentAttendance,
  useTeachers,
  useTeachingClasses,
  useTodayAttendanceSummary,
} from './useAttendance'

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Có mặt',
  late: 'Đi muộn',
  absent: 'Vắng',
  excused: 'Có phép',
}


function formatRate(summary: AttendanceSummary): string {
  return summary.ratePercent === null ? '—' : `${summary.ratePercent}%`
}

function SummaryLine({ summary }: { summary: AttendanceSummary }): React.ReactElement {
  return (
    <p className="text-sm text-slate-700">
      Tỷ lệ chuyên cần: <strong>{formatRate(summary)}</strong> · Có mặt {summary.present} · Đi muộn{' '}
      {summary.late} · Vắng {summary.absent} · Có phép {summary.excused}
    </p>
  )
}

function HistoryTable({ data }: { data: StudentAttendance }): React.ReactElement {
  if (data.history.length === 0) return <p className="text-sm text-slate-500">Chưa có buổi học nào được điểm danh.</p>
  return (
    <table className="c-table">
      <thead>
        <tr>
          <th>Ngày</th>
          <th>Giờ</th>
          <th>Lớp</th>
          <th>Chủ đề</th>
          <th>Trạng thái</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        {data.history.map((h) => (
          <tr key={h.sessionId}>
            <td>{h.sessionDate}</td>
            <td>{h.startsAt}</td>
            <td>{h.className}</td>
            <td>{h.topic ?? ''}</td>
            <td>{STATUS_LABEL[h.status]}</td>
            <td>{h.note ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type Draft = Record<string, { status: AttendanceStatus; note: string }>

/** Roster of one session: editable for the assigned teacher, read-only for admins. */
function SessionRoster({ sessionId, editable }: { sessionId: string; editable: boolean }): React.ReactElement {
  const attendance = useSessionAttendance(sessionId)
  const mark = useMarkAttendance(sessionId)
  const [draft, setDraft] = useState<Draft>({})
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!attendance.data) return
    const next: Draft = {}
    for (const r of attendance.data.roster) next[r.studentId] = { status: r.status ?? 'present', note: r.note ?? '' }
    setDraft(next)
  }, [attendance.data])

  if (attendance.isLoading) return <p className="text-sm text-slate-500">Đang tải danh sách…</p>
  if (attendance.isError) return <p className="text-sm text-danger-600">{(attendance.error as Error).message}</p>
  const roster = attendance.data?.roster ?? []
  if (roster.length === 0) return <p className="text-sm text-slate-500">Lớp chưa có học viên ghi danh.</p>

  function update(studentId: string, patch: Partial<Draft[string]>): void {
    setDraft((d) => ({ ...d, [studentId]: { status: 'present', note: '', ...d[studentId], ...patch } }))
  }

  function save(): void {
    setMessage(null)
    mark.mutate(
      {
        records: roster.map((r) => {
          const d = draft[r.studentId] ?? { status: 'present' as const, note: '' }
          return { studentId: r.studentId, status: d.status, ...(d.note.trim() ? { note: d.note.trim() } : {}) }
        }),
      },
      {
        onSuccess: () => setMessage('Đã lưu điểm danh.'),
        onError: (err) => setMessage((err as Error).message),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <table className="c-table">
        <thead>
          <tr>
            <th>Học viên</th>
            <th>Trạng thái</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((r) => {
            // Hien ho ten (lastName + firstName); neu chua co ten thi fallback ve SDT.
            const fullName = [r.lastName, r.firstName].filter(Boolean).join(' ').trim()
            return (
            <tr key={r.studentId}>
              <td>
                {fullName ? (
                  <div className="flex flex-col">
                    <span>{fullName}</span>
                    <span className="text-xs text-slate-400">{r.phoneNumber}</span>
                  </div>
                ) : (
                  r.phoneNumber
                )}
              </td>
              <td>
                {editable ? (
                  <select
                    aria-label={`Trạng thái ${r.phoneNumber}`}
                    className="c-input"
                    value={draft[r.studentId]?.status ?? 'present'}
                    onChange={(e) => update(r.studentId, { status: e.target.value as AttendanceStatus })}
                  >
                    {AttendanceStatus.options.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                ) : r.status ? (
                  STATUS_LABEL[r.status]
                ) : (
                  <span className="text-slate-400">Chưa điểm danh</span>
                )}
              </td>
              <td>
                {editable ? (
                  <input
                    aria-label={`Ghi chú ${r.phoneNumber}`}
                    className="c-input"
                    value={draft[r.studentId]?.note ?? ''}
                    onChange={(e) => update(r.studentId, { note: e.target.value })}
                  />
                ) : (
                  (r.note ?? '')
                )}
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
      {editable && (
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={save} disabled={mark.isPending}>
            Lưu điểm danh
          </Button>
          {message && (
            <span role="status" className="text-sm text-slate-600">
              {message}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function sessionLabel(s: ClassSession): string {
  const flags = `${s.cancelledAt ? ' (đã huỷ)' : ''}${s.makeupForSessionId ? ' (bù)' : ''}`
  return `${s.sessionDate} ${s.startsAt}${s.topic ? ` · ${s.topic}` : ''}${flags}`
}

function SessionsSection({ classId, canCreate }: { classId: string; canCreate: boolean }): React.ReactElement {
  const sessions = useClassSessions(classId)
  const create = useCreateSession(classId)
  const cancel = useCancelSession(classId)
  const [selected, setSelected] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState('90')
  const [makeupFor, setMakeupFor] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setSelected(null), [classId])

  const cancelled = sessions.data?.filter((s) => s.cancelledAt !== null) ?? []
  const selectedSession = sessions.data?.find((s) => s.id === selected)

  function handleCancel(sessionId: string): void {
    setError(null)
    cancel.mutate(sessionId, { onError: (err) => setError((err as Error).message) })
  }

  function handleCreate(e: FormEvent): void {
    e.preventDefault()
    setError(null)
    const parsed = CreateClassSessionRequest.safeParse({
      sessionDate: date,
      ...(time ? { startsAt: time } : {}),
      ...(topic.trim() ? { topic } : {}),
      ...(duration ? { durationMinutes: Number(duration) } : {}),
      ...(makeupFor ? { makeupForSessionId: makeupFor } : {}),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ')
      return
    }
    create.mutate(parsed.data, {
      onSuccess: (s) => {
        setSelected(s.id)
        setTopic('')
        setMakeupFor('')
      },
      onError: (err) => setError((err as Error).message),
    })
  }

  return (
    <section className="c-card">
      <h2 className="c-section-title">Buổi học</h2>
      {canCreate && (
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input aria-label="Ngày học" type="date" className="c-input" value={date} onChange={(e) => setDate(e.target.value)} />
          <input aria-label="Giờ bắt đầu" type="time" className="c-input" value={time} onChange={(e) => setTime(e.target.value)} />
          <input
            aria-label="Chủ đề"
            placeholder="Chủ đề (tuỳ chọn)"
            className="c-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <input
            aria-label="Thời lượng (phút)"
            type="number"
            min={15}
            max={480}
            step={15}
            className="c-input"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          {cancelled.length > 0 && (
            <select aria-label="Dạy bù cho buổi" className="c-input" value={makeupFor} onChange={(e) => setMakeupFor(e.target.value)}>
              <option value="">— Buổi thường —</option>
              {cancelled.map((s) => (
                <option key={s.id} value={s.id}>
                  Bù cho {s.sessionDate} {s.startsAt}
                </option>
              ))}
            </select>
          )}
          <Button type="submit" size="sm" disabled={create.isPending}>
            Tạo buổi học
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
      {sessions.isError && <p className="text-sm text-danger-600">{(sessions.error as Error).message}</p>}
      {sessions.data?.length === 0 && <p className="text-sm text-slate-500">Chưa có buổi học.</p>}
      <ul className="flex flex-wrap gap-2">
        {sessions.data?.map((s) => (
          <li key={s.id}>
            <Button size="sm" variant={selected === s.id ? 'default' : 'outline'} onClick={() => setSelected(s.id)}>
              {sessionLabel(s)}
            </Button>
          </li>
        ))}
      </ul>
      {canCreate && selectedSession && selectedSession.cancelledAt === null && (
        <div>
          <Button size="sm" variant="outline" onClick={() => handleCancel(selectedSession.id)} disabled={cancel.isPending}>
            Huỷ buổi (chưa dạy)
          </Button>
        </div>
      )}
      {selectedSession && selectedSession.cancelledAt === null && (
        <SessionRoster sessionId={selectedSession.id} editable={canCreate} />
      )}
      {selectedSession?.cancelledAt && <p className="text-sm text-slate-500">Buổi này đã huỷ — tạo buổi dạy bù ở trên.</p>}
    </section>
  )
}

function RatesSection({ classId, showHistory }: { classId: string; showHistory: boolean }): React.ReactElement {
  const rates = useClassRates(classId)
  const [studentId, setStudentId] = useState<string | null>(null)
  const history = useStudentAttendance(showHistory ? studentId : null)

  useEffect(() => setStudentId(null), [classId])

  return (
    <section className="c-card">
      <h2 className="c-section-title">Tỷ lệ chuyên cần của lớp</h2>
      {rates.isError && <p className="text-sm text-danger-600">{(rates.error as Error).message}</p>}
      {rates.data && (
        <>
          <SummaryLine summary={rates.data.overall} />
          <table className="c-table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Tỷ lệ</th>
                <th>Có mặt</th>
                <th>Đi muộn</th>
                <th>Vắng</th>
                <th>Có phép</th>
                {showHistory && <th />}
              </tr>
            </thead>
            <tbody>
              {rates.data.students.map((s) => (
                <tr key={s.studentId}>
                  <td>
                    {[s.lastName, s.firstName].filter(Boolean).join(' ').trim() || s.phoneNumber}
                    {(s.firstName || s.lastName) && <div className="text-xs text-slate-400">{s.phoneNumber}</div>}
                  </td>
                  <td>{formatRate(s.summary)}</td>
                  <td>{s.summary.present}</td>
                  <td>{s.summary.late}</td>
                  <td>{s.summary.absent}</td>
                  <td>{s.summary.excused}</td>
                  {showHistory && (
                    <td>
                      <Button size="sm" variant="outline" onClick={() => setStudentId(s.studentId)}>
                        Lịch sử
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {history.data && (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          <SummaryLine summary={history.data.summary} />
          <HistoryTable data={history.data} />
        </div>
      )}
    </section>
  )
}

function TeachersSection({ classId }: { classId: string }): React.ReactElement {
  const assigned = useClassTeachers(classId)
  const teachers = useTeachers(true)
  const assign = useAssignTeacher(classId)
  const remove = useRemoveTeacher(classId)
  const [teacherId, setTeacherId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAssign(e: FormEvent): void {
    e.preventDefault()
    setError(null)
    if (!teacherId) return
    assign.mutate(teacherId, { onSuccess: () => setTeacherId(''), onError: (err) => setError((err as Error).message) })
  }

  return (
    <section className="c-card">
      <h2 className="c-section-title">Giáo viên phụ trách</h2>
      <form onSubmit={handleAssign} className="flex gap-2">
        <select aria-label="Chọn giáo viên" className="c-input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">— Chọn giáo viên —</option>
          {teachers.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.phoneNumber}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={!teacherId || assign.isPending}>
          Gán giáo viên
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-1 text-sm">
        {assigned.data?.length === 0 && <li className="text-slate-500">Chưa gán giáo viên nào.</li>}
        {assigned.data?.map((t) => (
          <li key={t.teacherId} className="flex items-center justify-between">
            <span>{t.phoneNumber}</span>
            <Button
              size="sm"
              variant="outline"
              aria-label={`Gỡ ${t.phoneNumber}`}
              onClick={() => remove.mutate(t.teacherId)}
              disabled={remove.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Bar chart (admin): các lớp có buổi học hôm nay + tỷ lệ điểm danh theo trạng thái. */
function TodayBarChart(): React.ReactElement {
  const today = useTodayAttendanceSummary(true)
  if (today.isLoading)
    return (
      <section className="c-card">
        <p className="text-sm text-slate-500">Đang tải dữ liệu hôm nay…</p>
      </section>
    )
  if (today.isError)
    return (
      <section className="c-card">
        <p className="text-sm text-danger-600">{(today.error as Error).message}</p>
      </section>
    )
  const classes = today.data?.classes ?? []
  return (
    <section className="c-card">
      <h2 className="c-section-title">Điểm danh hôm nay{today.data?.date ? ` — ${today.data.date}` : ''}</h2>
      {classes.length === 0 ? (
        <p className="text-sm text-slate-500">Hôm nay không có lớp nào có buổi học.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((c) => {
            const seg = (n: number): number => (c.total > 0 ? (n / c.total) * 100 : 0)
            return (
              <div key={c.classId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {c.className} <span className="text-xs text-slate-400">{c.startsAt}</span>
                  </span>
                  <span className="text-xs text-slate-600">
                    {c.ratePercent !== null ? `${c.ratePercent}%` : '—'} · Có mặt {c.present} · Muộn {c.late} · Vắng{' '}
                    {c.absent} · Phép {c.excused}
                    {c.notMarked > 0 ? ` · Chưa ĐD ${c.notMarked}` : ''}
                  </span>
                </div>
                <div
                  className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100"
                  role="img"
                  aria-label={`Điểm danh ${c.className}: ${c.ratePercent ?? 0}%`}
                >
                  {seg(c.present) > 0 && <div className="h-full bg-success-500" style={{ width: `${seg(c.present)}%` }} />}
                  {seg(c.late) > 0 && <div className="h-full bg-warning-400" style={{ width: `${seg(c.late)}%` }} />}
                  {seg(c.absent) > 0 && <div className="h-full bg-danger-400" style={{ width: `${seg(c.absent)}%` }} />}
                  {seg(c.excused) > 0 && <div className="h-full bg-accent-300" style={{ width: `${seg(c.excused)}%` }} />}
                  {seg(c.notMarked) > 0 && <div className="h-full bg-slate-300" style={{ width: `${seg(c.notMarked)}%` }} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function StaffView({ isAdmin }: { isAdmin: boolean }): React.ReactElement {
  const teaching = useTeachingClasses(!isAdmin)
  const adminClasses = useAdminClasses(isAdmin)
  const classes = (isAdmin ? adminClasses.data : teaching.data) ?? []
  const [classId, setClassId] = useState<string | null>(null)

  return (
    <>
      {isAdmin && <TodayBarChart />}
      <section className="c-card">
        <label className="flex items-center gap-3 text-sm text-slate-700">
          Lớp
          <select
            aria-label="Chọn lớp"
            className="c-input"
            value={classId ?? ''}
            onChange={(e) => setClassId(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">— Chọn lớp —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {!isAdmin && teaching.data?.length === 0 && (
          <p className="text-sm text-slate-500">Bạn chưa được gán phụ trách lớp nào.</p>
        )}
      </section>
      {classId && isAdmin && <TeachersSection classId={classId} />}
      {classId && <SessionsSection classId={classId} canCreate={!isAdmin} />}
      {classId && <RatesSection classId={classId} showHistory={isAdmin} />}
    </>
  )
}

function StudentView(): React.ReactElement {
  const mine = useMyAttendance(true)
  return (
    <section className="c-card">
      <h2 className="c-section-title">Lịch sử điểm danh của tôi</h2>
      {mine.isError && <p className="text-sm text-danger-600">{(mine.error as Error).message}</p>}
      {mine.data && (
        <>
          <SummaryLine summary={mine.data.summary} />
          <HistoryTable data={mine.data} />
        </>
      )}
    </section>
  )
}

/**
 * slice-6 attendance page. Teacher: mark sessions of assigned classes. Admin: assign teachers,
 * review sessions, rates and student history. Student: own history + rate.
 */
export function AttendancePage(): React.ReactElement {
  const { user } = useSession()
  return (
    <>
      <PageHeader icon={CalendarCheck} title="Điểm danh" />
      {user?.role === 'student' ? <StudentView /> : <StaffView isAdmin={user?.role === 'admin'} />}
    </>
  )
}
