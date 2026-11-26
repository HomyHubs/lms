import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AttendanceStatus, TodayAttendance } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { ReportCharts } from '@/features/reports/ReportCharts'
import { getTodayAttendance, markSessionAttendance } from '@/lib/api'

type TodaySession = TodayAttendance['sessions'][number]
type Draft = Record<string, { status: AttendanceStatus | null; note: string; arrivedAt: string | null; lateMinutes: 5 | 10 | 15 | 20 | null }>

function arrivalTime(iso: string | null): string {
  return iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : ''
}

function SessionBoard({ item }: { item: TodaySession }): React.ReactElement {
  const qc = useQueryClient()
  const { attendance, teachers } = item
  const [teacherId, setTeacherId] = useState('')
  const [draft, setDraft] = useState<Draft>({})
  const [message, setMessage] = useState('')
  useEffect(() => {
    const next: Draft = {}
    for (const r of attendance.roster) {
      const minutes = r.lateMinutes
      next[r.studentId] = { status: r.status, note: r.note ?? '', arrivedAt: r.arrivedAt ?? null, lateMinutes: minutes === 5 || minutes === 10 || minutes === 15 || minutes === 20 ? minutes : null }
    }
    setDraft(next)
  }, [attendance])
  const save = useMutation({
    mutationFn: () => markSessionAttendance(attendance.session.id, {
      actualTeacherId: teacherId,
      records: attendance.roster.map((r) => {
        const d = draft[r.studentId]!
        return { studentId: r.studentId, status: d.status!, ...(d.note.trim() ? { note: d.note.trim() } : {}), arrivedAt: d.arrivedAt, lateMinutes: d.lateMinutes }
      }),
    }),
    onSuccess: (result) => {
      qc.setQueryData<TodayAttendance>(['attendance', 'today'], (data) => data && ({ ...data, sessions: data.sessions.map((s) => s.attendance.session.id === result.session.id ? { ...s, attendance: result } : s) }))
      void qc.invalidateQueries({ queryKey: ['attendance', 'rates'] })
      setMessage('Đã lưu điểm danh.')
    },
    onError: (err) => setMessage((err as Error).message),
  })
  function update(id: string, patch: Partial<Draft[string]>): void {
    setDraft((old) => ({ ...old, [id]: { ...old[id]!, ...patch } }))
  }
  const unmarked = attendance.roster.some((r) => !draft[r.studentId]?.status)
  return (
    <section className="c-card">
      <h3 className="c-section-title">{item.className} · {attendance.session.startsAt} · {item.branchName}</h3>
      <p>Đã ghi nhận: {attendance.roster.filter((r) => r.status === 'present' || r.status === 'late').length} có mặt, trong đó {attendance.roster.filter((r) => r.status === 'late').length} đi trễ · {attendance.roster.filter((r) => r.status === null).length} chưa điểm danh.</p>
      <label>Giáo viên thực dạy{' '}
        <select aria-label={`Giáo viên thực dạy ${item.className}`} className="c-input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">— Chọn giáo viên —</option>
          {teachers.map((t) => <option key={t.teacherId} value={t.teacherId}>{t.phoneNumber}</option>)}
        </select>
      </label>
      {teachers.length === 0 && <p>Chưa có giáo viên được gán cho lớp.</p>}
      <div><Button size="sm" variant="outline" onClick={() => setDraft((old) => Object.fromEntries(attendance.roster.map((r) => [r.studentId, { ...old[r.studentId]!, status: 'present', lateMinutes: null }]))) } disabled={!attendance.roster.length}>Chọn tất cả có mặt</Button></div>
      {attendance.roster.length === 0 ? <p>Chưa có học viên ghi danh.</p> : (
        <div className="overflow-x-auto"><table className="c-table">
          <thead><tr><th>Học viên (SĐT)</th><th>Có mặt</th><th>Trạng thái / đi trễ</th><th>Giờ đến</th><th>Ghi chú (kể cả về sớm)</th></tr></thead>
          <tbody>{attendance.roster.map((r) => {
            const d = draft[r.studentId]
            const present = d?.status === 'present' || d?.status === 'late'
            return <tr key={r.studentId}>
              <td>{r.phoneNumber}</td>
              <td><input type="checkbox" aria-label={`Có mặt ${r.phoneNumber}`} checked={present} onChange={(e) => update(r.studentId, e.target.checked ? { status: 'present', lateMinutes: null } : { status: 'absent', arrivedAt: null, lateMinutes: null })} /></td>
              <td><select className="c-input" aria-label={`Trạng thái ${r.phoneNumber}`} value={d?.status === null || !d ? '' : d.status === 'late' ? String(d.lateMinutes ?? 'late') : d.status} onChange={(e) => {
                const value = e.target.value
                if (value === 'absent' || value === 'excused') update(r.studentId, { status: value, arrivedAt: null, lateMinutes: null })
                else if (value === 'present') update(r.studentId, { status: 'present', lateMinutes: null })
                else if (value === 'late') update(r.studentId, { status: 'late', lateMinutes: null })
                else update(r.studentId, { status: 'late', lateMinutes: Number(value) as 5 | 10 | 15 | 20 })
              }}>
                <option value="" disabled>Chưa điểm danh</option><option value="present">Có mặt, đúng giờ</option><option value="late">Đi trễ (chưa rõ phút)</option>
                {[5, 10, 15, 20].map((m) => <option key={m} value={m}>Trễ {m} phút</option>)}
                <option value="absent">Vắng</option><option value="excused">Có phép</option>
              </select></td>
              <td><input type="time" className="c-input" aria-label={`Giờ đến ${r.phoneNumber}`} disabled={!present} value={arrivalTime(d?.arrivedAt ?? null)} onChange={(e) => update(r.studentId, { arrivedAt: e.target.value ? new Date(`${attendance.session.sessionDate}T${e.target.value}:00+07:00`).toISOString() : null })} /></td>
              <td><input className="c-input" aria-label={`Ghi chú ${r.phoneNumber}`} value={d?.note ?? ''} onChange={(e) => update(r.studentId, { note: e.target.value })} /></td>
            </tr>
          })}</tbody>
        </table></div>
      )}
      {unmarked && <p>Hãy chọn trạng thái cho tất cả học viên trước khi lưu.</p>}
      <div><Button size="sm" disabled={!teacherId || unmarked || !attendance.roster.length || save.isPending} onClick={() => { setMessage(''); save.mutate() }}>Lưu điểm danh</Button> {message && <span role="status">{message}</span>}</div>
    </section>
  )
}

export function TodayAttendanceBoard(): React.ReactElement {
  const today = useQuery({ queryKey: ['attendance', 'today'], queryFn: getTodayAttendance, refetchOnWindowFocus: false })
  const [branchId, setBranchId] = useState('')
  const sessions = today.data?.sessions ?? []
  const branches = [...new Map(sessions.map((s) => [s.branchId, s.branchName])).entries()]
  const visible = sessions.filter((s) => !branchId || s.branchId === branchId)

  // slice-dashboard-movements (mục 3): biểu đồ thanh + tròn theo bộ lọc cơ sở đang chọn.
  // Các nhóm rời nhau (chưa điểm danh không nằm trong có mặt/muộn/vắng/phép).
  const counts = visible.reduce(
    (acc, s) => {
      for (const r of s.attendance.roster) {
        if (r.status === 'present') acc.present += 1
        else if (r.status === 'late') acc.late += 1
        else if (r.status === 'absent') acc.absent += 1
        else if (r.status === 'excused') acc.excused += 1
        else acc.notMarked += 1
      }
      return acc
    },
    { present: 0, late: 0, absent: 0, excused: 0, notMarked: 0 },
  )

  return <section className="flex flex-col gap-3">
    <h2 className="c-section-title">Điểm danh các lớp hôm nay</h2>
    <p>Danh sách thể hiện điểm danh đã ghi nhận, không xác nhận học viên còn ở lớp. Ghi chú khi học viên về sớm.</p>
    <p>Đã ghi nhận {counts.present + counts.late} lượt học viên có mặt trong các buổi học.</p>
    <label>Cơ sở{' '}<select className="c-input" value={branchId} onChange={(e) => setBranchId(e.target.value)}><option value="">Tất cả cơ sở</option>{branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    {today.data && visible.length > 0 && (
      <ReportCharts
        title="Biểu đồ điểm danh các lớp hôm nay"
        unit="lượt"
        items={[
          { label: 'Có mặt', value: counts.present },
          { label: 'Đi muộn', value: counts.late },
          { label: 'Vắng', value: counts.absent },
          { label: 'Có phép', value: counts.excused },
          { label: 'Chưa điểm danh', value: counts.notMarked },
        ]}
      />
    )}
    {today.isLoading && <p>Đang tải…</p>}
    {today.isError && <p role="alert">{(today.error as Error).message}</p>}
    {today.data && visible.length === 0 && <p>Không có buổi học hôm nay tại cơ sở này.</p>}
    {visible.map((s) => <SessionBoard key={s.attendance.session.id} item={s} />)}
  </section>
}
