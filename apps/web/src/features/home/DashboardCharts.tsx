import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/card'
import { useStudentReport } from '@/features/reports/useReports'
import { useClassRates } from '@/features/attendance/useAttendance'
import { useClasses } from '@/features/catalog/useCatalog'
import { useDashboardStats, type ChartDatum } from './useDashboardStats'

const BAR_COLOR = '#2563eb'
const PIE_COLORS = ['#16a34a', '#dc2626']
/** Đi học (xanh lá) · Đi trễ (vàng) · Vắng (đỏ) · Khác/có phép (xám). */
const ATTENDANCE_COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#94a3b8']

const CHART_HEIGHT = 260

function ChartState({ message }: { message: string }): React.ReactElement {
  return <p className="py-10 text-center text-sm text-slate-500">{message}</p>
}

function StudentsBarChart({ data }: { data: ChartDatum[] }): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-10} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" name="Học viên" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Tỉ lệ hoàn thành bài = số bài đã chấm Đạt / Chưa đạt (StudentReport.totals). */
function CompletionPieChart(): React.ReactElement {
  const report = useStudentReport({})
  if (report.isLoading) return <ChartState message="Đang tải…" />
  const totals = report.data?.totals
  const passed = totals?.passed ?? 0
  const failed = totals?.failed ?? 0
  if (passed + failed === 0) return <ChartState message="Chưa có dữ liệu bài thi" />

  const data: ChartDatum[] = [
    { name: 'Đạt', value: passed },
    { name: 'Chưa đạt', value: failed },
  ]
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
          {data.map((entry: ChartDatum, index: number) => (
            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

/**
 * Tỉ lệ điểm danh của một lớp: Đi học / Đi trễ / Vắng / Khác (có phép).
 * API getAttendanceRates bắt buộc một bộ lọc nên cho Admin chọn lớp (mặc định lớp đầu tiên).
 */
function AttendancePieChart(): React.ReactElement {
  const classes = useClasses()
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const classList = classes.data ?? []
  const activeClassId = selectedClassId ?? classList[0]?.id ?? null
  const rates = useClassRates(activeClassId)

  if (classes.isLoading) return <ChartState message="Đang tải…" />
  if (classList.length === 0) return <ChartState message="Chưa có lớp học" />

  const overall = rates.data?.overall
  const data: ChartDatum[] = [
    { name: 'Đi học', value: overall?.present ?? 0 },
    { name: 'Đi trễ', value: overall?.late ?? 0 },
    { name: 'Vắng', value: overall?.absent ?? 0 },
    { name: 'Khác', value: overall?.excused ?? 0 },
  ]
  const total = data.reduce((sum: number, d: ChartDatum) => sum + d.value, 0)

  return (
    <>
      <select
        aria-label="Chọn lớp"
        className="c-input mb-3 max-w-xs"
        value={activeClassId ?? ''}
        onChange={(e) => setSelectedClassId(e.target.value)}
      >
        {classList.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>
      {rates.isLoading ? (
        <ChartState message="Đang tải…" />
      ) : total === 0 ? (
        <ChartState message="Chưa có dữ liệu điểm danh" />
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {data.map((entry: ChartDatum, index: number) => (
                <Cell key={entry.name} fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </>
  )
}

/** Các biểu đồ tổng hợp trên trang chủ Admin: theo khóa học, theo trung tâm, tỉ lệ hoàn thành, điểm danh. */
export function DashboardCharts(): React.ReactElement {
  const stats = useDashboardStats()

  const renderBar = (data: ChartDatum[]): React.ReactElement => {
    if (stats.isLoading) return <ChartState message="Đang tải…" />
    if (data.every((d: ChartDatum) => d.value === 0)) return <ChartState message="Chưa có dữ liệu" />
    return <StudentsBarChart data={data} />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle>Học viên theo khóa học</CardTitle>
        {renderBar(stats.studentsByCourse)}
      </Card>
      <Card>
        <CardTitle>Học viên theo trung tâm</CardTitle>
        {renderBar(stats.studentsByCenter)}
      </Card>
      <Card className="lg:col-span-2">
        <CardTitle>Tỉ lệ hoàn thành bài</CardTitle>
        <CompletionPieChart />
      </Card>
      <Card className="lg:col-span-2">
        <CardTitle>Tỉ lệ điểm danh</CardTitle>
        <AttendancePieChart />
      </Card>
    </div>
  )
}
