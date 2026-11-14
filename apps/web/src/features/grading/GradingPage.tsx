import { useState } from 'react'
import { CheckCircle2, PenLine, Upload } from 'lucide-react'
import type { Exam, GradeImportPreview, GradeImportResult, ManualGradingAttempt, ManualGradingItem } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardTitle, PageHeader } from '@/components/ui/card'
import { ExamImage } from '@/features/media/ExamImage'
import { useExams } from '@/features/exams/useExams'
import { useGradeAttempt, useGradingAttempt, useGradingQueue, useImportGrades, usePreviewGrades } from './useGrading'

/** Ky nang cham tay (import bang diem chi ap dung cho cac ky nang nay). */
const MANUAL_SKILLS = ['speaking', 'writing']

const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'Có lỗi xảy ra')

/** Ho ten hoc vien (lastName + firstName); fallback SDT khi chua co ten. */
function studentName(s: { studentFirstName?: string | null; studentLastName?: string | null; studentPhone: string }): string {
  const full = [s.studentLastName, s.studentFirstName].filter(Boolean).join(' ').trim()
  return full === '' ? s.studentPhone : full
}

function QueueTable(props: {
  items: ManualGradingItem[]
  selected: string | null
  onSelect: (attemptId: string) => void
}): React.ReactElement {
  if (props.items.length === 0) return <p className="text-sm text-slate-500">Không còn bài nào chờ chấm.</p>
  return (
    <table className="c-table">
      <thead>
        <tr>
          <th>Đề thi</th>
          <th>Kỹ năng</th>
          <th>Học viên</th>
          <th>Lần</th>
          <th>Nộp lúc</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {props.items.map((item) => (
          <tr key={item.attemptId}>
            <td>{item.examTitle}</td>
            <td className="capitalize">{item.skill}</td>
            <td>
              <div className="flex flex-col">
                <span>{studentName(item)}</span>
                {studentName(item) !== item.studentPhone && (
                  <span className="text-xs text-slate-400">{item.studentPhone}</span>
                )}
              </div>
            </td>
            <td>{item.attemptNumber}</td>
            <td>{timeLabel(item.submittedAt)}</td>
            <td>
              <Button
                size="sm"
                variant={props.selected === item.attemptId ? 'default' : 'outline'}
                onClick={() => props.onSelect(item.attemptId)}
              >
                Chấm
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** One whole-number score per question (0..points) plus optional feedback; saved once. */
function GradeForm(props: { attempt: ManualGradingAttempt; onGraded: (attempt: ManualGradingAttempt) => void }): React.ReactElement {
  const { attempt } = props
  const [scores, setScores] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const grade = useGradeAttempt()

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    const input = { scores: Object.fromEntries(attempt.questions.map((q) => [q.id, Number(scores[q.id])])), feedback }
    grade.mutate({ attemptId: attempt.attemptId, input }, { onSuccess: props.onGraded })
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-slate-500">
        {attempt.examTitle} · {attempt.studentPhone} · lần {attempt.attemptNumber} · đạt khi ≥ {attempt.passPercent}%
      </p>
      <ol className="space-y-4">
        {attempt.questions.map((q, index) => (
          <li key={q.id} className="space-y-2 border-b border-slate-100 pb-4">
            {q.stemImages && q.stemImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {q.stemImages.map((src) => (
                  <ExamImage key={src} src={src} alt={`Hình câu ${index + 1}`} />
                ))}
              </div>
            )}
            <p className="font-medium text-slate-800">
              Câu {index + 1}. {q.questionText}
            </p>
            <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {q.answer ?? <span className="italic text-slate-400">(Học viên không trả lời)</span>}
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Điểm
              <input
                aria-label={`Điểm câu ${index + 1}`}
                type="number"
                required
                min={0}
                max={q.points}
                step={1}
                className="c-input w-24"
                value={scores[q.id] ?? ''}
                onChange={(e) => setScores((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
              / {q.points}
            </label>
          </li>
        ))}
      </ol>
      <label className="block space-y-1 text-sm text-slate-600">
        <span>Nhận xét cho học viên</span>
        <textarea
          aria-label="Nhận xét cho học viên"
          maxLength={2000}
          rows={3}
          className="c-input w-full"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>
      {grade.error && <p className="text-sm text-danger-600">{errorText(grade.error)}</p>}
      <Button type="submit" disabled={grade.isPending}>
        Lưu điểm
      </Button>
    </form>
  )
}

function AttemptPanel({ attemptId, onGraded }: { attemptId: string; onGraded: (a: ManualGradingAttempt) => void }): React.ReactElement {
  const attempt = useGradingAttempt(attemptId)
  if (attempt.isPending) return <p className="text-sm text-slate-500">Đang tải bài làm…</p>
  if (attempt.error) return <p className="text-sm text-danger-600">{errorText(attempt.error)}</p>
  return <GradeForm key={attemptId} attempt={attempt.data} onGraded={onGraded} />
}

/** Bang tom tat ket qua import: so dong da ap, bo qua (kem ly do), loi dinh dang. */
const SKIP_REASON_LABELS: Record<string, string> = {
  student_not_found: 'Không tìm thấy học viên (mã/SĐT)',
  already_graded: 'Bài đã được chấm trước đó',
  out_of_scope: 'Ngoài phạm vi cơ sở của bạn',
  score_exceeds_max: 'Điểm vượt quá điểm tối đa',
  duplicate_in_file: 'Trùng mã học viên trong file',
}

function ImportResultSummary({ result }: { result: GradeImportResult }): React.ReactElement {
  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-2 text-success-700">
        <CheckCircle2 className="h-4 w-4" /> Đã nhập <strong>{result.applied}</strong> điểm.
      </p>
      {result.skipped.length > 0 && (
        <div>
          <p className="font-medium text-slate-700">Bỏ qua {result.skipped.length} dòng:</p>
          <ul className="ml-4 list-disc text-slate-600">
            {result.skipped.map((s) => (
              <li key={`${s.row}-${s.studentCode}`}>
                Dòng {s.row} — {s.studentCode}: {SKIP_REASON_LABELS[s.reason] ?? s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.errors.length > 0 && (
        <div>
          <p className="font-medium text-danger-700">Lỗi định dạng {result.errors.length} dòng:</p>
          <ul className="ml-4 list-disc text-danger-600">
            {result.errors.map((e) => (
              <li key={e.row}>Dòng {e.row}: {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** slice-22: bang XEM TRUOC tung dong truoc khi dua diem vao lop (chua ghi gi). */
function PreviewTable({ preview }: { preview: GradeImportPreview }): React.ReactElement {
  return (
    <div className="space-y-2">
      <table className="c-table" aria-label="Xem trước bảng điểm">
        <thead>
          <tr>
            <th>Dòng</th>
            <th>Mã học viên</th>
            <th>Học viên</th>
            <th>Điểm</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((r) => (
            <tr key={`${r.row}-${r.studentCode}`}>
              <td>{r.row}</td>
              <td>{r.studentCode}</td>
              <td>{r.studentName ?? '—'}</td>
              <td>{r.willApply && r.maxScore != null ? `${r.score}/${r.maxScore}` : '—'}</td>
              <td>
                {r.willApply ? (
                  <Badge tone={r.passed ? 'success' : 'danger'}>
                    Sẽ nhập{r.passed === null ? '' : r.passed ? ' · Đạt' : ' · Chưa đạt'}
                  </Badge>
                ) : (
                  <span className="text-danger-600">{SKIP_REASON_LABELS[r.reason ?? ''] ?? r.reason}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {preview.errors.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-danger-700">Lỗi định dạng {preview.errors.length} dòng:</p>
          <ul className="ml-4 list-disc text-danger-600">
            {preview.errors.map((e) => (
              <li key={e.row}>Dòng {e.row}: {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * slice-22: Staff/Admin nhập bảng điểm Speaking/Writing — luồng XEM TRƯỚC → XÁC NHẬN. Chọn kỳ thi,
 * tải file, bấm "Xem trước" (không ghi gì) để kiểm tra từng dòng; nếu không còn lỗi thì "Xác nhận
 * đưa vào lớp" mới ghi điểm. Có link tải file mẫu.
 */
function GradeImportCard(): React.ReactElement {
  const exams = useExams()
  const [examId, setExamId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<GradeImportPreview | null>(null)
  const [result, setResult] = useState<GradeImportResult | null>(null)
  const previewMut = usePreviewGrades()
  const importMut = useImportGrades()

  const manualExams: Exam[] = (exams.data ?? []).filter((e: Exam) => MANUAL_SKILLS.includes(e.skill))
  // Khoa xac nhan khi co loi dinh dang hoac khong co dong nao se duoc ghi.
  const canConfirm = preview !== null && preview.errors.length === 0 && preview.applicable > 0

  function resetPreview(): void {
    setPreview(null)
    setResult(null)
  }

  function runPreview(event?: React.FormEvent): void {
    event?.preventDefault()
    if (!examId || !file) return
    setResult(null)
    previewMut.mutate({ examId, file }, { onSuccess: setPreview })
  }

  function confirm(): void {
    if (!examId || !file) return
    importMut.mutate({ examId, file }, {
      onSuccess: (r) => {
        setResult(r)
        setPreview(null)
      },
    })
  }

  return (
    <Card>
      <CardTitle>Nhập bảng điểm từ Excel/CSV</CardTitle>
      <p className="mb-3 text-sm text-slate-500">
        File cần cột <strong>mã học viên</strong> (= số điện thoại) và cột <strong>điểm</strong>; cột{' '}
        <strong>nhận xét</strong> là tuỳ chọn. Hỗ trợ .xlsx và .csv.{' '}
        <a className="text-accent-700 underline" href="/templates/mau-bang-diem.csv" download>
          Tải file mẫu
        </a>
        .
      </p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={runPreview}>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Kỳ thi (Speaking/Writing)
          <select
            aria-label="Kỳ thi"
            className="c-input min-w-[16rem]"
            value={examId}
            onChange={(e) => {
              setExamId(e.target.value)
              resetPreview()
            }}
            required
          >
            <option value="">— Chọn kỳ thi —</option>
            {manualExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} ({exam.skill})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          File bảng điểm
          <input
            aria-label="File bảng điểm"
            type="file"
            accept=".xlsx,.csv"
            className="c-input"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              resetPreview()
            }}
            required
          />
        </label>
        <Button type="button" variant="outline" onClick={() => runPreview()} disabled={!examId || !file || previewMut.isPending}>
          <Upload className="mr-1 h-4 w-4" />
          {previewMut.isPending ? 'Đang xem trước…' : 'Xem trước'}
        </Button>
      </form>
      {exams.data && manualExams.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">Chưa có kỳ thi Speaking/Writing nào.</p>
      )}
      {previewMut.error && <p className="mt-3 text-sm text-danger-600">{errorText(previewMut.error)}</p>}
      {importMut.error && <p className="mt-3 text-sm text-danger-600">{errorText(importMut.error)}</p>}
      {preview && (
        <div className="mt-4 space-y-3">
          <PreviewTable preview={preview} />
          <div className="flex items-center gap-3">
            <Button onClick={confirm} disabled={!canConfirm || importMut.isPending}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {importMut.isPending ? 'Đang đưa vào lớp…' : `Xác nhận đưa vào lớp (${preview.applicable})`}
            </Button>
            {!canConfirm && (
              <span className="text-sm text-slate-500">
                {preview.errors.length > 0 ? 'Sửa hết lỗi định dạng rồi xem trước lại.' : 'Không có dòng nào để nhập.'}
              </span>
            )}
          </div>
        </div>
      )}
      {result && (
        <div className="mt-4">
          <ImportResultSummary result={result} />
        </div>
      )}
    </Card>
  )
}

/** Admin/Teacher: grade submitted Speaking/Writing attempts; the student sees score + feedback. */
export function GradingPage(): React.ReactElement {
  const queue = useGradingQueue()
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState<ManualGradingAttempt | null>(null)

  function graded(attempt: ManualGradingAttempt): void {
    setSelected(null)
    setDone(attempt)
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={PenLine} title="Chấm bài" description="Bài Speaking/Writing học viên đã nộp, chờ giáo viên chấm." />
      {done?.result && (
        <p className="flex items-center gap-2 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4" /> Đã lưu điểm {done.result.score}/{done.result.maxScore} cho {done.studentPhone} —{' '}
          <Badge tone={done.result.passed ? 'success' : 'danger'}>{done.result.passed ? 'Đạt' : 'Chưa đạt'}</Badge>
        </p>
      )}
      <GradeImportCard />
      <Card>
        <CardTitle>Bài chờ chấm</CardTitle>
        {queue.isPending && <p className="text-sm text-slate-500">Đang tải…</p>}
        {queue.error && <p className="text-sm text-danger-600">{errorText(queue.error)}</p>}
        {queue.data && <QueueTable items={queue.data} selected={selected} onSelect={setSelected} />}
      </Card>
      {selected && (
        <Card>
          <CardTitle>Chấm bài làm</CardTitle>
          <AttemptPanel attemptId={selected} onGraded={graded} />
        </Card>
      )}
    </div>
  )
}
