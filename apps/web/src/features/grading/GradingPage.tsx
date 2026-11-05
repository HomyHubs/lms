import { useState } from 'react'
import { CheckCircle2, PenLine } from 'lucide-react'
import type { ManualGradingAttempt, ManualGradingItem } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardTitle, PageHeader } from '@/components/ui/card'
import { ExamImage } from '@/features/media/ExamImage'
import { useGradeAttempt, useGradingAttempt, useGradingQueue } from './useGrading'

const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'Có lỗi xảy ra')

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
            <td>{item.studentPhone}</td>
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
