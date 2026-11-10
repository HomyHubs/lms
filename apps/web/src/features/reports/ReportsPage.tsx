import { useEffect, useMemo, useState } from 'react'
import { BarChart3, FileSpreadsheet, Printer } from 'lucide-react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  CLASSIFICATION_LABELS,
  STUDENT_CLASSIFICATIONS,
  UpdateClassificationPolicyRequest,
  type ClassificationPolicy,
  type StudentReport,
  type StudentReportQuery,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { buildXlsx, downloadFile, XLSX_MIME } from '@/lib/xlsx-export'
import { exportStudentReport } from '@/lib/api'
import { useSession } from '@/features/auth/useAuth'
import { reportToSheets } from './report-export'
import {
  useClassificationPolicies,
  useReportFilters,
  useStudentReport,
  useUpdateClassificationPolicy,
} from './useReports'

// Same section/input look as AttendancePage; kept inline (two pages) until a third copy appears.

const fmt = (value: number | null, suffix = ''): string => (value === null ? '—' : `${value}${suffix}`)

function Card({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

/** Plain CSS bar chart: no chart dependency, prints fine (ADR 0006). */
function Bars({ title, items }: { title: string; items: { label: string; value: number; hint?: string }[] }): React.ReactElement {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <section className="c-card" aria-label={title}>
      <h2 className="font-medium text-slate-800">{title}</h2>
      {items.length === 0 && <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-sm">
          <span className="w-40 truncate">{i.label}</span>
          <div className="h-3 flex-1 rounded bg-slate-100">
            {/* Runtime-computed width: the only inline style. */}
            <div className="h-3 rounded bg-sky-500" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          <span className="w-28 text-right text-slate-600">{i.hint ?? i.value}</span>
        </div>
      ))}
    </section>
  )
}

/** Màu cho 4 xếp loại + chưa xếp loại: Giỏi, Khá, Trung bình, Yếu, Chưa xếp loại. */
const CLASSIFICATION_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#94a3b8']

/** Pie tròn tỉ lệ (recharts) — bổ sung cho biểu đồ cột, in được. Dùng chung cho xếp loại và Đậu/Rớt. */
function ClassificationPie({
  data,
  title = 'Tỉ lệ xếp loại',
  colors = CLASSIFICATION_COLORS,
}: {
  data: { name: string; value: number }[]
  title?: string
  colors?: string[]
}): React.ReactElement {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  return (
    <section className="c-card" aria-label={title}>
      <h2 className="font-medium text-slate-800">{title}</h2>
      {total === 0 ? (
        <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(e: { name?: string | number; percent?: number }) =>
                `${e.name} ${Math.round((e.percent ?? 0) * 100)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}

function RankingTable({ rows }: { rows: StudentReport['ranking'] }): React.ReactElement {
  if (rows.length === 0) return <p className="text-sm text-slate-500">Không có học viên trong phạm vi lọc.</p>
  return (
    <table className="c-table">
      <thead>
        <tr>
          <th>Hạng</th>
          <th>Họ tên</th>
          <th>Mã HS (SĐT)</th>
          <th>Lớp</th>
          <th>Điểm thi</th>
          <th>Chuyên cần</th>
          <th>Điểm tổng</th>
          <th>Xếp loại</th>
          <th>Đậu/Rớt</th>
          <th>Đạt / đã thi</th>
          <th>Thi lại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.classId}-${r.studentId}`}>
            <td>{fmt(r.rank)}</td>
            <td>{r.studentName ?? '—'}</td>
            <td>{r.phoneNumber}</td>
            <td>{r.className}</td>
            <td>{fmt(r.examScore, '%')}</td>
            <td>{fmt(r.attendanceRate, '%')}</td>
            <td className="font-medium">{fmt(r.finalScore)}</td>
            <td>{r.classification ? CLASSIFICATION_LABELS[r.classification] : 'Chưa xếp loại'}</td>
            <td>{r.passed === null ? '—' : r.passed ? 'Đậu' : 'Rớt'}</td>
            <td>
              {r.examsPassed} / {r.examsTaken}
            </td>
            <td>
              {r.retakes}
              {r.pendingRetakes > 0 && <span className="ml-1 text-warning-700">(chờ thi lại {r.pendingRetakes})</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const POLICY_FIELDS = [
  ['examWeight', 'Trọng số thi (%)'],
  ['attendanceWeight', 'Trọng số chuyên cần (%)'],
  ['excellentMin', 'Giỏi từ'],
  ['goodMin', 'Khá từ'],
  ['averageMin', 'Trung bình từ'],
  ['passMin', 'Đậu từ'],
] as const

const toDraft = (policy: ClassificationPolicy): Record<string, string> =>
  Object.fromEntries(POLICY_FIELDS.map(([k]) => [k, String(policy[k])]))

/** Edits a local draft; Save validates with the shared schema and writes once. */
function PolicyRow({ policy }: { policy: ClassificationPolicy }): React.ReactElement {
  const update = useUpdateClassificationPolicy()
  const [draft, setDraft] = useState(() => toDraft(policy))
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => setDraft(toDraft(policy)), [policy])

  function save(): void {
    const parsed = UpdateClassificationPolicyRequest.safeParse(
      Object.fromEntries(POLICY_FIELDS.map(([k]) => [k, Number(draft[k])])),
    )
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? 'Cấu hình không hợp lệ')
    setMessage(null)
    update.mutate(
      { levelId: policy.levelId, input: parsed.data },
      { onSuccess: () => setMessage('Đã lưu.'), onError: (err) => setMessage((err as Error).message) },
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2 text-sm">
      <span className="w-24 font-medium">{policy.levelCode}</span>
      {POLICY_FIELDS.map(([key, label]) => (
        <label key={key} className="flex flex-col text-xs text-slate-500">
          {label}
          <input
            aria-label={`${policy.levelCode} ${label}`}
            className="c-input w-24"
            type="number"
            min={0}
            max={100}
            value={draft[key]}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          />
        </label>
      ))}
      <Button size="sm" onClick={save} disabled={update.isPending}>
        Lưu
      </Button>
      {message && <span className="text-slate-600">{message}</span>}
    </div>
  )
}

function PolicyEditor(): React.ReactElement {
  const policies = useClassificationPolicies()
  return (
    <section className="c-card print:hidden">
      <h2 className="font-medium text-slate-800">Cấu hình xếp loại theo cấp độ</h2>
      <p className="text-xs text-slate-500">Điểm tổng = trọng số thi × điểm thi + trọng số chuyên cần × tỷ lệ chuyên cần.</p>
      {policies.isError && <p className="text-sm text-danger-600">{(policies.error as Error).message}</p>}
      {policies.data?.map((p) => <PolicyRow key={p.levelId} policy={p} />)}
    </section>
  )
}

/** slice-7 admin dashboard: classification, ranking, pass/fail by class/level/month, Excel + print/PDF. */
export function ReportsPage(): React.ReactElement {
  const { user } = useSession()
  // Chi superadmin duoc xuat danh sach hoc vien (chong ro ri thong tin — slice-1 revised).
  const canExport = user?.role === 'superadmin'
  const filters = useReportFilters()
  const [query, setQuery] = useState<StudentReportQuery>({})
  const report = useStudentReport(query)
  const set = (key: keyof StudentReportQuery) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setQuery((q) => ({ ...q, [key]: e.target.value || undefined }))
  const data = report.data

  // Tìm theo tên hoặc mã HS (SĐT) — lọc phía client trên bảng xếp hạng.
  const [search, setSearch] = useState('')
  const rankingRows = useMemo(() => {
    const rows = data?.ranking ?? []
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(
      (r) => (r.studentName ?? '').toLowerCase().includes(term) || r.phoneNumber.toLowerCase().includes(term),
    )
  }, [data, search])

  const classificationPie = data
    ? [
        ...STUDENT_CLASSIFICATIONS.map((c) => ({ name: CLASSIFICATION_LABELS[c], value: data.classifications[c] })),
        { name: 'Chưa xếp loại', value: data.classifications.unranked },
      ]
    : []

  const passPie = data
    ? [
        { name: 'Đậu', value: data.totals.studentsPassed },
        { name: 'Rớt', value: data.totals.studentsFailed },
      ]
    : []

  async function exportExcel(): Promise<void> {
    // Lay du lieu qua endpoint export (server chi cho superadmin; vuot branch-scope).
    const full = await exportStudentReport(query)
    downloadFile(buildXlsx(reportToSheets(full)), `bao-cao-hoc-vien-${new Date().toISOString().slice(0, 10)}.xlsx`, XLSX_MIME)
  }

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title="Báo cáo & xếp loại học viên"
        actions={
          <div className="flex gap-2 print:hidden">
            {canExport && (
              <Button variant="outline" size="sm" onClick={() => void exportExcel()} disabled={!data}>
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Xuất Excel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!data}>
              <Printer className="mr-1 h-4 w-4" /> In / Xuất PDF
            </Button>
          </div>
        }
      />

      <section className="c-card print:hidden" aria-label="Bộ lọc">
        <div className="flex flex-wrap gap-2">
          <select aria-label="Cơ sở" className="c-input" value={query.branchId ?? ''} onChange={set('branchId')}>
            <option value="">Tất cả cơ sở</option>
            {filters.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select aria-label="Cấp độ" className="c-input" value={query.levelId ?? ''} onChange={set('levelId')}>
            <option value="">Tất cả cấp độ</option>
            {filters.levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>
          <select aria-label="Lớp" className="c-input" value={query.classId ?? ''} onChange={set('classId')}>
            <option value="">Tất cả lớp</option>
            {filters.classes
              .filter((c) => !query.branchId || c.branchId === query.branchId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            Từ <input aria-label="Từ ngày" type="date" className="c-input" value={query.from ?? ''} onChange={set('from')} />
          </label>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            Đến <input aria-label="Đến ngày" type="date" className="c-input" value={query.to ?? ''} onChange={set('to')} />
          </label>
        </div>
      </section>

      {report.isLoading && <p className="text-sm text-slate-500">Đang tải báo cáo…</p>}
      {report.isError && <p className="text-sm text-danger-600">{(report.error as Error).message}</p>}
      {data && (
        <>
          <section className="c-card" aria-label="Tổng quan">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <Card label="Học viên" value={String(data.totals.students)} />
              <Card label="Điểm thi TB" value={fmt(data.totals.averageExamScore, '%')} />
              <Card label="Chuyên cần TB" value={fmt(data.totals.averageAttendanceRate, '%')} />
              <Card label="Tỷ lệ đạt" value={fmt(data.totals.passRate, '%')} />
              <Card label="Đậu / Rớt" value={`${data.totals.studentsPassed} / ${data.totals.studentsFailed}`} />
            </div>
            <p className="text-sm text-slate-600">
              Lượt thi đạt {data.totals.passed} · trượt {data.totals.failed} · điểm tổng TB {fmt(data.totals.averageFinal)}
            </p>
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            <Bars
              title="Xếp loại"
              items={[
                ...STUDENT_CLASSIFICATIONS.map((c) => ({ label: CLASSIFICATION_LABELS[c], value: data.classifications[c] })),
                { label: 'Chưa xếp loại', value: data.classifications.unranked },
              ]}
            />
            <ClassificationPie data={classificationPie} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ClassificationPie data={passPie} title="Tỉ lệ Đậu/Rớt" colors={['#16a34a', '#dc2626']} />
          </div>
          <Bars
            title="Đạt / trượt theo lớp"
            items={data.byClass.map((c) => ({ label: c.className, value: c.passed, hint: `đạt ${c.passed} · trượt ${c.failed}` }))}
          />
          <Bars
            title="Đạt / trượt theo cấp độ"
            items={data.byLevel.map((l) => ({ label: l.levelCode, value: l.passed, hint: `đạt ${l.passed} · trượt ${l.failed}` }))}
          />
          <Bars
            title="Đạt / trượt theo tháng"
            items={data.byMonth.map((m) => ({ label: m.month, value: m.passed, hint: `đạt ${m.passed} · trượt ${m.failed}` }))}
          />
          <section className="c-card" aria-label="Xếp hạng">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-slate-800">Xếp hạng học viên</h2>
              <input
                aria-label="Tìm theo tên hoặc mã học sinh"
                className="c-input w-64 max-w-full print:hidden"
                placeholder="Tìm theo tên hoặc mã HS (SĐT)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <RankingTable rows={rankingRows} />
          </section>
        </>
      )}
      <PolicyEditor />
    </>
  )
}
