import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/card'
import { useStudentReport } from '@/features/reports/useReports'
import { useBranches } from '@/features/centers/useCenters'
import {
  useDashboardStats,
  type BranchClassGroup,
  type ChartDatum,
  type ClassBarDatum,
} from './useDashboardStats'

// Bảng màu demo: nền xanh dương → tím chủ đạo (xanh dương, trắng, tím), giữ các màu
// ngữ nghĩa (xanh lá = đạt, đỏ = vắng, vàng = trễ) để biểu đồ vẫn dễ đọc đúng ý nghĩa.
const PASS_COLORS = ['#16a34a', '#dc2626']
/** Bảng màu xoay vòng cho pie nhiều lát (cơ sở): ưu tiên xanh dương/tím trước. */
const SLICE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#6366f1', '#a855f7', '#0ea5e9', '#db2777']

// Pie gọn để xếp nhiều cái trên một dòng; bar cao hơn một chút cho dễ đọc nhãn.
const PIE_HEIGHT = 260
const BAR_HEIGHT = 260

function ChartState({ message }: { message: string }): React.ReactElement {
  return <p className="py-10 text-center text-sm text-slate-500">{message}</p>
}

/** Nhãn lát pie dạng "Tên 42%" dựa trên phần trăm trong tổng. */
function percentLabel(entry: { percent?: number }): string {
  const pct = Math.round((entry.percent ?? 0) * 100)
  // Chỉ hiện % trên lát để nhãn không chồng nhau; tên lát đã có ở <Legend/>.
  return `${pct}%`
}

function StudentsBarChart({
  data,
  colors = SLICE_COLORS,
}: {
  data: ChartDatum[]
  colors?: string[]
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={BAR_HEIGHT}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-10} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" name="Học viên" radius={[4, 4, 0, 0]}>
          {data.map((entry: ChartDatum, index: number) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
          <LabelList dataKey="value" position="top" />
        </Bar>
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
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={60}
          label={percentLabel}
          labelLine={false}
        >
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
 * Tỉ lệ điểm danh cho TẤT CẢ cơ sở (slice-16): mỗi cơ sở là một hàng bấm được,
 * điều hướng sang trang chi tiết cơ sở (/attendance/branch/:branchId) để xem đủ các lớp.
 * Bỏ ràng buộc chọn một lớp như bản cũ; branch-scope do backend quyết định (admin chỉ
 * thấy cơ sở trong phạm vi được phân quyền).
 */
function AttendanceByBranch(): React.ReactElement {
  const branches = useBranches()
  if (branches.isLoading) return <ChartState message="Đang tải…" />
  const list = branches.data ?? []
  if (list.length === 0) return <ChartState message="Chưa có cơ sở" />

  return (
    <div className="flex flex-col gap-2">
      {list.map((b) => (
        <Link
          key={b.id}
          to={`/attendance/branch/${b.id}`}
          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
        >
          <span className="font-medium text-slate-800">{b.name}</span>
          <span aria-hidden className="text-slate-400">
            ›
          </span>
        </Link>
      ))}
    </div>
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
    <div className="rounded-lg border border-primary-100 bg-white p-2 text-xs shadow-md">
      <p className="font-medium text-primary-800">{d.className}</p>
      <p className="text-accent-600">{d.branchName}</p>
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
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-700">
        {groups.map((g: BranchClassGroup, i: number) => (
          <span key={g.branchId} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
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
                <LabelList dataKey="size" position="top" />
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

  const renderBar = (data: ChartDatum[], colors: string[] = SLICE_COLORS): React.ReactElement => {
    if (stats.isLoading) return <ChartState message="Đang tải…" />
    if (data.length === 0 || data.every((d: ChartDatum) => d.value === 0)) {
      return <ChartState message="Chưa có dữ liệu" />
    }
    return <StudentsBarChart data={data} colors={colors} />
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
          <CardTitle>Tổng số học viên theo khóa học</CardTitle>
          {/* TODO(slice-16): xác nhận gom theo cấp độ (Starter/Mover/Flyer) hay theo khóa học (studentsByCourse) */}
          {renderBar(stats.studentsByCourse, SLICE_COLORS)}
        </Card>
        <Card>
          <CardTitle>Tổng số học viên theo cơ sở</CardTitle>
          {renderBar(stats.studentsByBranch, SLICE_COLORS)}
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
          <AttendanceByBranch />
        </Card>
      </div>
    </div>
  )
}
