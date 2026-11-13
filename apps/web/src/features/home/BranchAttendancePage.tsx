import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link, useParams } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/card'
import { useBranchRates } from '@/features/attendance/useAttendance'

const SLICE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#6366f1', '#a855f7', '#0ea5e9', '#db2777']

/**
 * Trang chi tiết cơ sở (slice-16): hiển thị tỉ lệ điểm danh của TẤT CẢ các lớp thuộc
 * một cơ sở, cùng tỉ lệ chung của cơ sở. Mở từ thẻ "Tỉ lệ điểm danh" trên Dashboard.
 */
export function BranchAttendancePage(): React.ReactElement {
  // PERF(slice-16): dùng endpoint gom theo cơ sở; nếu nhiều lớp gây chậm, cân nhắc phân trang/aggregate thêm
  const { branchId } = useParams<{ branchId: string }>()
  const rates = useBranchRates(branchId ?? null)

  const back = (
    <Link to="/" className="text-sm text-primary-600 hover:underline">
      ← Về Dashboard
    </Link>
  )

  if (!branchId) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm text-slate-500">Thiếu mã cơ sở.</p>
      </div>
    )
  }
  if (rates.isLoading) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm text-slate-500">Đang tải…</p>
      </div>
    )
  }

  const data = rates.data
  const classes = data?.classes ?? []

  return (
    <div className="space-y-4">
      {back}
      <Card>
        <CardTitle>Tỉ lệ điểm danh theo cơ sở</CardTitle>
        <p className="mb-3 text-sm text-slate-600">
          Tỉ lệ chung: {data?.overall.ratePercent ?? '—'}%
        </p>
        {classes.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Chưa có dữ liệu điểm danh cho cơ sở này
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classes} margin={{ top: 16, right: 8, bottom: 8, left: 0 }}>
              <XAxis
                dataKey="className"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="ratePercent" name="Tỉ lệ (%)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="ratePercent" position="top" />
                {classes.map((c, i) => (
                  <Cell key={c.classId} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
