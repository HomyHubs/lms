import { useEffect, useState } from 'react'
import { BarChart3, FileSpreadsheet, Printer } from 'lucide-react'
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

function RankingTable({ report }: { report: StudentReport }): React.ReactElement {
  if (report.ranking.length === 0) return <p className="text-sm text-slate-500">Không có học viên trong phạm vi lọc.</p>
  return (
    <table className="c-table">
      <thead>
        <tr>
          <th>Hạng</th>
          <th>Học viên</th>
          <th>Lớp</th>
          <th>Điểm thi</th>
          <th>Chuyên cần</th>
          <th>Điểm tổng</th>
          <th>Xếp loại</th>
          <th>Đạt / đã thi</th>
          <th>Thi lại</th>
        </tr>
      </thead>
      <tbody>
        {report.ranking.map((r) => (
          <tr key={`${r.classId}-${r.studentId}`}>
            <td>{fmt(r.rank)}</td>
            <td>{r.phoneNumber}</td>
            <td>{r.className}</td>
            <td>{fmt(r.examScore, '%')}</td>
            <td>{fmt(r.attendanceRate, '%')}</td>
            <td className="font-medium">{fmt(r.finalScore)}</td>
            <td>{r.classification ? CLASSIFICATION_LABELS[r.classification] : 'Chưa xếp loại'}</td>
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
  const filters = useReportFilters()
  const [query, setQuery] = useState<StudentReportQuery>({})
  const report = useStudentReport(query)
  const set = (key: keyof StudentReportQuery) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setQuery((q) => ({ ...q, [key]: e.target.value || undefined }))
  const data = report.data

  function exportExcel(): void {
    if (!data) return
    downloadFile(buildXlsx(reportToSheets(data)), `bao-cao-hoc-vien-${new Date().toISOString().slice(0, 10)}.xlsx`, XLSX_MIME)
  }

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title="Báo cáo & xếp loại học viên"
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={!data}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Xuất Excel
            </Button>
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
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Card label="Học viên" value={String(data.totals.students)} />
              <Card label="Điểm thi TB" value={fmt(data.totals.averageExamScore, '%')} />
              <Card label="Chuyên cần TB" value={fmt(data.totals.averageAttendanceRate, '%')} />
              <Card label="Tỷ lệ đạt" value={fmt(data.totals.passRate, '%')} />
            </div>
            <p className="text-sm text-slate-600">
              Lượt thi đạt {data.totals.passed} · trượt {data.totals.failed} · điểm tổng TB {fmt(data.totals.averageFinal)}
            </p>
          </section>
          <Bars
            title="Xếp loại"
            items={[
              ...STUDENT_CLASSIFICATIONS.map((c) => ({ label: CLASSIFICATION_LABELS[c], value: data.classifications[c] })),
              { label: 'Chưa xếp loại', value: data.classifications.unranked },
            ]}
          />
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
            <h2 className="font-medium text-slate-800">Xếp hạng học viên</h2>
            <RankingTable report={data} />
          </section>
        </>
      )}
      <PolicyEditor />
    </>
  )
}
