import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardList, Clock3, Send } from 'lucide-react'
import type { ExamAttemptView } from '@lms/shared'
import { saveExamAnswers } from '@/lib/api'
import { useSession } from '@/features/auth/useAuth'
import { BlueprintForm } from './BlueprintForm'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { useExams, useStartExamAttempt, useSubmitExamAttempt } from './useExams'

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN')
}

/** Aggregate score, pass/fail and retake eligibility only; per-question correctness stays hidden. */
function AttemptOutcome(props: {
  attempt: ExamAttemptView
  retaking: boolean
  onRetake: () => void
  onBack: () => void
}): React.ReactElement {
  const { result, retake, attemptNumber } = props.attempt
  const [now, setNow] = useState(() => Date.now())
  const availableAt = retake?.available && retake.availableAt ? Date.parse(retake.availableAt) : null
  useEffect(() => {
    if (availableAt === null || availableAt <= now) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(availableAt - now, 60_000))
    return () => window.clearTimeout(timer)
  }, [availableAt, now])
  const passed = result?.passed === true
  const tone = result?.status === 'pending_manual' ? 'bg-slate-50 text-slate-800'
    : passed ? 'bg-success-50 text-success-800' : 'bg-warning-50 text-warning-900'
  return (
    <section aria-label="Kết quả bài thi" className={`flex flex-col gap-3 rounded-lg p-4 ${tone}`}>
      <p className="font-medium">Lần thi {attemptNumber}{retake ? `/${retake.maxAttempts}` : ''}</p>
      {result?.status === 'graded' && (
        <p>
          Điểm: {result.score}/{result.maxScore} ({result.percent}%) · Ngưỡng đạt {result.passPercent}% ·{' '}
          <strong>{passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</strong>
        </p>
      )}
      {result?.status === 'pending_manual' && <p>Đã nộp bài. Bài Speaking/Writing chờ giáo viên chấm.</p>}
      {!result && <p>Đã nộp bài. Đang chờ kết quả chấm.</p>}
      {retake?.reason === 'limit_reached' && <p>Bạn đã dùng hết {retake.maxAttempts} lần thi cho đề này.</p>}
      {retake?.reason === 'exam_closed' && <p>Đề thi đã đóng, không thể thi lại.</p>}
      <div className="flex flex-wrap items-center gap-3">
        {retake?.available && (
          availableAt !== null && availableAt > now ? (
            <span>Được thi lại từ {formatTime(retake.availableAt!)}</span>
          ) : (
            <Button onClick={props.onRetake} disabled={props.retaking}>
              Thi lại (lần {retake.nextAttemptNumber})
            </Button>
          )
        )}
        <Button variant="outline" onClick={props.onBack}>
          Về danh sách
        </Button>
      </div>
    </section>
  )
}

/** UI hoc vien: list de dang mo -> start/resume -> dem nguoc -> nop bai -> ket qua/thi lai. */
export function ExamsPage(): React.ReactElement {
  const exams = useExams()
  const { user } = useSession()
  const manager = user?.role === 'admin' || user?.role === 'teacher'
  const revision = useRef(0)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const [checkpointMessage, setCheckpointMessage] = useState('')
  const start = useStartExamAttempt()
  const submit = useSubmitExamAttempt()
  const [attempt, setAttempt] = useState<ExamAttemptView | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const autoSubmitting = useRef(false)

  useEffect(() => {
    if (!attempt) return
    setAnswers(attempt.answers)
    revision.current = attempt.revision
    autoSubmitting.current = attempt.status === 'submitted'
  }, [attempt])

  const submitNow = useCallback(
    (automatic: boolean) => {
      if (!attempt || attempt.status === 'submitted' || submit.isPending || autoSubmitting.current)
        return
      autoSubmitting.current = true
      submit.mutate(
        { examId: attempt.examId, input: { answers } },
        {
          onSuccess: (saved) => {
            setAttempt(saved)
            setMessage(automatic ? 'Hết giờ — bài đã được tự động nộp.' : 'Đã nộp bài thành công.')
          },
          onError: (error) => {
            autoSubmitting.current = false
            setMessage((error as Error).message)
          },
        },
      )
    },
    [answers, attempt, submit],
  )

  useEffect(() => {
    if (!attempt || attempt.status === 'submitted') return
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((Date.parse(attempt.deadlineAt) - Date.now()) / 1000))
      setRemaining(seconds)
      if (seconds === 0) submitNow(true)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [attempt, submitNow])

  function changeAnswer(id: string, value: string): void {
    if (!attempt || attempt.status === 'submitted' || autoSubmitting.current || Date.now() >= Date.parse(attempt.deadlineAt)) return
    const next = { ...answers, [id]: value }
    setAnswers(next)
    setCheckpointMessage('Đang lưu…')
    saveQueue.current = saveQueue.current.then(async () => {
      const saved = await saveExamAnswers(attempt.examId, { answers: next, revision: revision.current })
      revision.current = saved.revision
      if (saved.status === 'submitted') setAttempt(saved)
      setCheckpointMessage('Đã lưu đáp án')
    }).catch((error: unknown) => {
      setCheckpointMessage(`Chưa lưu: ${(error as Error).message}. Chỉ đáp án lưu trước hạn được tính.`)
    })
  }

  function begin(examId: string): void {
    setMessage(null)
    start.mutate(examId, {
      onSuccess: setAttempt,
      onError: (error) => setMessage((error as Error).message),
    })
  }

  if (attempt) {
    const submitted = attempt.status === 'submitted'
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Bài thi đang làm</p>
            <h1 className="text-2xl font-semibold text-slate-900">{attempt.examTitle}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 font-mono text-white">
            <Clock3 className="h-4 w-4" /> {submitted ? 'Đã nộp' : formatRemaining(remaining)}
          </div>
        </div>

        {message && (
          <p role="status" className={submitted ? 'text-success-700' : 'text-slate-700'}>
            {message}
          </p>
        )}

        {checkpointMessage && <p role="status">{checkpointMessage}</p>}
        {attempt.questions.map((question, index) => (
          <section key={question.id} className="c-card">
            <h2 className="mb-3 font-medium text-slate-900">
              Câu {index + 1}. {question.questionText}
            </h2>
            {question.options ? (
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      disabled={submitted || remaining === 0 || submit.isPending}
                      onChange={() => changeAnswer(question.id, option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                aria-label={`Trả lời câu ${index + 1}`}
                value={answers[question.id] ?? ''}
                disabled={submitted || remaining === 0 || submit.isPending}
                onChange={(event) =>
                  changeAnswer(question.id, event.target.value)
                }
                className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm"
              />
            )}
          </section>
        ))}

        {!submitted && (
          <Button onClick={() => submitNow(false)} disabled={submit.isPending}>
            <Send className="mr-2 h-4 w-4" /> {submit.isPending ? 'Đang nộp…' : 'Nộp bài'}
          </Button>
        )}
        {submitted && <AttemptOutcome attempt={attempt} retaking={start.isPending}
          onRetake={() => begin(attempt.examId)} onBack={() => setAttempt(null)} />}
      </>
    )
  }

  return (
    <>
      <PageHeader icon={ClipboardList} title="Bài thi đang mở" />
      {manager && <BlueprintForm onCreated={() => void exams.refetch()} />}
      {exams.isLoading && <p>Đang tải danh sách đề…</p>}
      {exams.isError && <p role="alert">Không tải được danh sách đề thi.</p>}
      {exams.data?.length === 0 && <p>Hiện không có đề thi nào đang mở.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {exams.data?.map((exam) => (
          <article key={exam.id} className="c-card">
            <h2 className="text-lg font-medium text-slate-900">{exam.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {exam.levelCode} · {exam.skill} · {exam.questionCount} câu · {exam.durationMinutes} phút
            </p>
            <Button className="mt-4" onClick={() => begin(exam.id)} disabled={start.isPending}>
              Bắt đầu / Tiếp tục
            </Button>
          </article>
        ))}
      </div>
      {message && <p role="alert">{message}</p>}
    </>
  )
}
