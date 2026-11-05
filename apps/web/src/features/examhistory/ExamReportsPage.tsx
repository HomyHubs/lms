import { useState } from 'react'
import { ClipboardCheck, FileSpreadsheet } from 'lucide-react'
import type { ExamAttemptDetail, ExamAttemptReport, ExamAttemptReportQuery } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { useReportFilters } from '@/features/reports/useReports'
import { buildXlsx, downloadFile, XLSX_MIME } from '@/lib/xlsx-export'
import { examReportToSheets } from './exam-report-export'
import { StudentHistory } from './ExamHistoryPage'
import { formatDateTime, formatDuration, formatPercent, formatScore, submitReasonLabel } from './history-format'
import { ResultBadge } from './HistoryTable'
import { useExamAttemptReport } from './useExamHistory'

function SummaryTable({ report, onPick }: { report: ExamAttemptReport; onPick: (examId: string) => void }): React.ReactElement {
  if (report.byExam.length === 0) return <p className="text-sm text-slate-500">Không có lượt thi trong phạm vi lọc.</p>
  return (
    <table className="c-table">
      <thead>
        <tr>
          <th>Đề thi</th>
          <th>Học viên</th>
          <th>Lượt thi</th>
          <th>Thi lại</th>
          <th>Đạt lần đầu</th>
          <th>Đạt cuối cùng</th>
          <th>Điểm TB</th>
          <th>Cao nhất</th>
        </tr>
      </thead>
      <tbody>
        {report.byExam.map((e) => (
          <tr key={e.examId}>
            <td>
              <Button variant="ghost" size="sm" onClick={() => onPick(e.examId)}>
                {e.examTitle}
              </Button>
              <span className="text-xs text-slate-500">{e.levelCode}</span>
            </td>
            <td>{e.students}</td>
            <td>{e.attempts}</td>
            <td>{e.retakes}</td>
            <td>{formatPercent(e.firstAttemptPassRate)}</td>
            <td>{formatPercent(e.finalPassRate)}</td>
            <td>{formatPercent(e.averagePercent)}</td>
            <td>{formatPercent(e.bestPercent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DetailTable({ rows, onPick }: { rows: readonly ExamAttemptDetail[]; onPick: (row: ExamAttemptDetail) => void }): React.ReactElement {
  return (
    <table className="c-table">
      <thead>
        <tr>
          <th>Học viên</th>
          <th>Đề thi</th>
          <th>Lần</th>
          <th>Nộp bài</th>
          <th>Thời gian làm</th>
          <th>Cách nộp</th>
          <th>Điểm</th>
          <th>Kết quả</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.attemptId}>
            <td>
              <Button variant="ghost" size="sm" onClick={() => onPick(row)}>
                {row.studentPhone}
              </Button>
            </td>
            <td>{row.examTitle}</td>
            <td>Lần {row.attemptNumber}</td>
            <td>{formatDateTime(row.submittedAt)}</td>
            <td>{formatDuration(row.durationSeconds)}</td>
            <td>{submitReasonLabel(row)}</td>
            <td>{formatScore(row)}</td>
            <td>
              <ResultBadge row={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** slice-13 admin/teacher report: per-exam pass rates incl. retakes, attempt detail, a student's full history. */
export function ExamReportsPage(): React.ReactElement {
  const filters = useReportFilters()
  const [query, setQuery] = useState<ExamAttemptReportQuery>({})
  const [student, setStudent] = useState<{ id: string; phone: string } | null>(null)
  const report = useExamAttemptReport(query)
  const set = (key: keyof ExamAttemptReportQuery) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setQuery((q) => ({ ...q, [key]: e.target.value || undefined }))
  const data = report.data
  const pickedExam = data?.byExam.find((e) => e.examId === query.examId)

  function exportExcel(): void {
    if (!data) return
    downloadFile(buildXlsx(examReportToSheets(data)), `bao-cao-thi-${new Date().toISOString().slice(0, 10)}.xlsx`, XLSX_MIME)
  }

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        title="Báo cáo thi"
        description="Tỷ lệ đạt theo đề, số lần thi lại và lịch sử từng học viên."
        actions={
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!data}>
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Xuất Excel
          </Button>
        }
      />

      <section className="c-card" aria-label="Bộ lọc">
        <div className="flex flex-wrap gap-2">
          <select aria-label="Cơ sở" className="c-input" value={query.branchId ?? ''} onChange={set('branchId')}>
            <option value="">Tất cả cơ sở</option>
            {filters.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
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
          {query.examId && (
            <Button variant="outline" size="sm" onClick={() => setQuery((q) => ({ ...q, examId: undefined }))}>
              Bỏ lọc đề: {pickedExam?.examTitle ?? 'đề đã chọn'}
            </Button>
          )}
        </div>
      </section>

      {report.isLoading && <p className="text-sm text-slate-500">Đang tải báo cáo…</p>}
      {report.isError && <p className="text-sm text-danger-600">{(report.error as Error).message}</p>}
      {data && (
        <>
          <section className="c-card" aria-label="Theo đề thi">
            <h2 className="c-section-title">Theo đề thi</h2>
            <SummaryTable report={data} onPick={(examId) => setQuery((q) => ({ ...q, examId }))} />
          </section>
          <section className="c-card" aria-label="Chi tiết lượt thi">
            <h2 className="c-section-title">Chi tiết lượt thi</h2>
            <DetailTable rows={data.attempts} onPick={(row) => setStudent({ id: row.studentId, phone: row.studentPhone })} />
          </section>
        </>
      )}

      {student && (
        <>
          <div className="flex items-center gap-2">
            <h2 className="c-section-title">Lịch sử thi của {student.phone}</h2>
            <Button variant="ghost" size="sm" onClick={() => setStudent(null)}>
              Đóng
            </Button>
          </div>
          <StudentHistory key={student.id} studentId={student.id} />
        </>
      )}
    </>
  )
}
