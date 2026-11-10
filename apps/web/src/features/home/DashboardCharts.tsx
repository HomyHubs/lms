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
import {
  useDashboardStats,
  type BranchClassGroup,
  type ChartDatum,
  type ClassBarDatum,
} from './useDashboardStats'

const BAR_COLOR = '#2563eb'
const PASS_COLORS = ['#16a34a', '#dc2626']
/** Bảng màu xoay vòng cho pie nhiều lát (cơ sở). */
const SLICE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#0891b2', '#db2777']
/** Đi học (xanh lá) · Đi trễ (vàng) · Vắng (đỏ) · Khác/có phép (xám). */
const ATTENDANCE_COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#94a3b8']

// Pie gọn để xếp nhiều cái trên một dòng; bar cao hơn một chút cho dễ đọc nhãn.
const PIE_HEIGHT = 240
const BAR_HEIGHT = 260

function ChartState({ message }: { message: string }): React.ReactElement {
  return <p className="py-10 text-center text-sm text-slate-500">{message}</p>
}

/** Nhãn lát pie dạng "Tên 42%" dựa trên phần trăm trong tổng. */
function percentLabel(entry: { name?: string | number; percent?: number }): string {
  const pct = Math.round((entry.percent ?? 0) * 100)
  return `${entry.name} ${pct}%`
}

function StudentsBarChart({ data }: { data: ChartDatum[] }): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={BAR_HEIGHT}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-10} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" name="Học viên" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Pie chung: hiển thị tỉ lệ % của từng lát trên tổng, nhãn kèm tên. */
function SharePieChart({
  data,
  colors,
}: {
  data: ChartDatum[]
  colors: string[]
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={PIE_HEIGHT}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={percentLabel}>
          {data.map((entry: ChartDatum, index: number) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
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
  return <SharePieChart data={data} colors={PASS_COLORS} />
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
        <SharePieChart data={data} colors={ATTENDANCE_COLORS} />
      )}
    </>
  )
}

/** Tooltip của chart gom theo cơ sở: hiện tên lớp, cơ sở và sĩ số. */
function ClassBarTooltip({ active, payload }: {
  active?: boolean
  payload?: { payload: ClassBarDatum }[]
}): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]!.payload
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2 text-xs shadow-sm">
      <p className="font-medium text-slate-800">{d.className}</p>
      <p className="text-slate-500">{d.branchName}</p>
      <p className="text-slate-700">Sĩ số: {d.size}</p>
    </div>
  )
}

/**
 * MỘT biểu đồ cột duy nhất: mỗi cột là một lớp (sĩ số riêng), các lớp được GOM THEO CƠ SỞ
 * (cùng cơ sở đứng liền nhau và cùng màu). Chú thích màu = cơ sở. Nhãn trục X là tên lớp.
 */
function ClassSizeByBranchChart({ groups, bars }: {
  groups: BranchClassGroup[]
  bars: ClassBarDatum[]
}): React.ReactElement {
  // Rộng theo số lớp để nhãn không chồng; cuộn ngang khi quá nhiều lớp.
  const minWidth = Math.max(520, bars.length * 56)
  return (
    <Card>
      <CardTitle>Sĩ số từng lớp theo cơ sở</CardTitle>
      {/* Chú thích màu theo cơ sở */}
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-600">
        {groups.map((g: BranchClassGroup, i: number) => (
          <span key={g.branchId} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
            />
            {g.branchName} ({g.total})
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={BAR_HEIGHT}>
            <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <XAxis dataKey="className" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ClassBarTooltip />} />
              <Bar dataKey="size" name="Sĩ số" radius={[4, 4, 0, 0]}>
                {bars.map((b: ClassBarDatum) => (
                  <Cell key={b.classId} fill={SLICE_COLORS[b.branchIndex % SLICE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}

/**
 * Các biểu đồ tổng hợp trên trang chủ Admin.
 * Bố cục: 1 hàng bar (khóa học, cơ sở), sĩ số từng lớp theo cơ sở, rồi 1 hàng gồm nhiều pie gọn
 * (tỉ lệ cơ sở, tỉ lệ hoàn thành, tỉ lệ điểm danh) nằm trên cùng một dòng ở màn hình rộng.
 */
export function DashboardCharts(): React.ReactElement {
  const stats = useDashboardStats()

  const renderBar = (data: ChartDatum[]): React.ReactElement => {
    if (stats.isLoading) return <ChartState message="Đang tải…" />
    if (data.length === 0 || data.every((d: ChartDatum) => d.value === 0)) {
      return <ChartState message="Chưa có dữ liệu" />
    }
    return <StudentsBarChart data={data} />
  }

  const renderBranchPie = (): React.ReactElement => {
    if (stats.isLoading) return <ChartState message="Đang tải…" />
    if (stats.totalStudents === 0) return <ChartState message="Chưa có dữ liệu" />
    return <SharePieChart data={stats.studentsByBranch} colors={SLICE_COLORS} />
  }

  return (
    <div className="space-y-4">
      {/* Hàng biểu đồ cột */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Học viên theo khóa học</CardTitle>
          {renderBar(stats.studentsByCourse)}
        </Card>
        <Card>
          <CardTitle>Học viên theo cơ sở</CardTitle>
          {renderBar(stats.studentsByBranch)}
        </Card>
      </div>

      {/* Sĩ số TỪNG LỚP gom theo cơ sở — một chart, mỗi lớp một cột (sĩ số riêng), màu theo cơ sở */}
      {!stats.isLoading && stats.classBars.length > 0 && (
        <ClassSizeByBranchChart groups={stats.classesByBranch} bars={stats.classBars} />
      )}

      {/* Hàng biểu đồ tròn gọn: nhiều pie trên cùng một dòng */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle>Tỉ lệ học viên theo cơ sở</CardTitle>
          {renderBranchPie()}
        </Card>
        <Card>
          <CardTitle>Tỉ lệ hoàn thành bài</CardTitle>
          <CompletionPieChart />
        </Card>
        <Card>
          <CardTitle>Tỉ lệ điểm danh</CardTitle>
          <AttendancePieChart />
        </Card>
      </div>
    </div>
  )
}
