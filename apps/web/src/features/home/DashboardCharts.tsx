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

/**
 * Sĩ số TỪNG LỚP trong MỘT cơ sở: mỗi cột là một lớp, giá trị = sĩ số riêng của lớp đó.
 * Cao theo số lớp để nhãn tên lớp không chồng nhau (bar ngang).
 */
function BranchClassSizeChart({ group }: { group: BranchClassGroup }): React.ReactElement {
  // 36px mỗi lớp + đệm; tối thiểu 120px để cơ sở ít lớp vẫn cân đối.
  const height = Math.max(120, group.classes.length * 36 + 48)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={group.classes}
        margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
      >
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="className"
          width={120}
          tick={{ fontSize: 12 }}
          interval={0}
        />
        <Tooltip />
        <Bar dataKey="size" name="Sĩ số" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Mỗi cơ sở một thẻ riêng: tiêu đề kèm tổng sĩ số, bên trong là sĩ số từng lớp. */
function ClassSizeByBranch({ groups }: { groups: BranchClassGroup[] }): React.ReactElement {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group: BranchClassGroup) => (
        <Card key={group.branchId}>
          <CardTitle>
            {group.branchName} · {group.classes.length} lớp · {group.total} học viên
          </CardTitle>
          <BranchClassSizeChart group={group} />
        </Card>
      ))}
    </div>
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

      {/* Sĩ số TỪNG LỚP, nhóm theo cơ sở — mỗi lớp một cột với sĩ số riêng */}
      {!stats.isLoading && stats.classesByBranch.length > 0 && (
        <ClassSizeByBranch groups={stats.classesByBranch} />
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
