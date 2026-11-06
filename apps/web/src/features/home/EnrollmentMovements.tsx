import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EnrollmentMovementQuery } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { getEnrollmentMovements } from '@/lib/api'
import { currentMonth } from '@/lib/utils'

function monthRange(month: string): { from: string; to: string } {
  const [year, number] = month.split('-').map(Number) as [number, number]
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

export function EnrollmentMovements(): React.ReactElement {
  const [month, setMonth] = useState(currentMonth)
  const [draft, setDraft] = useState(() => ({ ...monthRange(currentMonth()), branchId: '' }))
  const [query, setQuery] = useState<EnrollmentMovementQuery>(() => monthRange(currentMonth()))
  const [message, setMessage] = useState('')
  const report = useQuery({ queryKey: ['reports', 'enrollment-movements', query], queryFn: () => getEnrollmentMovements(query) })
  const events = report.data?.events ?? []
  const branches = report.data?.branches ?? []
  const visibleBranches = branches.filter((b) => !query.branchId || b.id === query.branchId)

  function apply(): void {
    const parsed = EnrollmentMovementQuery.safeParse({ ...draft, branchId: draft.branchId || undefined })
    if (!parsed.success) { setMessage('Khoảng ngày không hợp lệ.'); return }
    setMessage('')
    setQuery(parsed.data)
  }

  return (
    <Card>
      <CardTitle>Lịch sử đăng ký và ngừng đăng ký</CardTitle>
      <p className="text-sm text-slate-600">Số vào/ra là lượt ghi danh theo lớp, không phải số học viên duy nhất. Lịch sử cũ có thể thiếu; các lượt cũ không xác định được cơ sở không được tính.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">Tháng<input aria-label="Tháng ghi danh" type="month" className="c-input block" value={month} onChange={(e) => { const value = e.target.value; setMonth(value); if (value) setDraft((d) => ({ ...d, ...monthRange(value) })) }} /></label>
        <label className="text-sm">Từ ngày<input aria-label="Từ ngày ghi danh" type="date" className="c-input block" value={draft.from} onChange={(e) => { setMonth(''); setDraft((d) => ({ ...d, from: e.target.value })) }} /></label>
        <label className="text-sm">Đến ngày<input aria-label="Đến ngày ghi danh" type="date" className="c-input block" value={draft.to} onChange={(e) => { setMonth(''); setDraft((d) => ({ ...d, to: e.target.value })) }} /></label>
        <label className="text-sm">Cơ sở<select aria-label="Cơ sở ghi danh" className="c-input block" value={draft.branchId} onChange={(e) => setDraft((d) => ({ ...d, branchId: e.target.value }))}>
          <option value="">Tất cả cơ sở</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select></label>
        <Button onClick={apply}>Xem</Button>
      </div>
      {message && <p role="alert" className="text-sm text-danger-600">{message}</p>}
      {report.isLoading && <p className="text-sm text-slate-500">Đang tải lịch sử…</p>}
      {report.isError && <p role="alert" className="text-sm text-danger-600">{(report.error as Error).message}</p>}
      {report.data && <>
        <div className="overflow-x-auto"><table className="c-table"><thead><tr><th>Cơ sở</th><th>Lượt vào</th><th>Lượt ra</th></tr></thead><tbody>
          {visibleBranches.map((b) => <tr key={b.id}><td>{b.name}</td><td>{events.filter((e) => e.branchId === b.id && e.type === 'enrolled').length}</td><td>{events.filter((e) => e.branchId === b.id && e.type === 'withdrawn').length}</td></tr>)}
        </tbody></table></div>
        {events.length === 0 ? <p className="text-sm text-slate-500">Không có sự kiện trong khoảng chọn.</p> : <div className="overflow-x-auto"><table className="c-table"><thead><tr><th>Thời điểm</th><th>Cơ sở</th><th>Lớp</th><th>Học viên</th><th>Thay đổi</th></tr></thead><tbody>
          {events.map((e) => <tr key={e.id}><td>{new Date(e.occurredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>{e.branchName}</td><td>{e.className ?? 'Không còn lớp'}</td><td>{e.studentPhone ?? 'Không còn tài khoản'}</td><td>{e.type === 'enrolled' ? 'Đăng ký' : 'Ngừng đăng ký'}</td></tr>)}
        </tbody></table></div>}
      </>}
    </Card>
  )
}
