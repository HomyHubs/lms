import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Clock3, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ExamAttemptView } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { useExams, useStartExamAttempt, useSubmitExamAttempt } from './useExams'

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/** UI hoc vien cho slice-4: list de dang mo -> start/resume -> dem nguoc -> nop bai. */
export function ExamsPage(): React.ReactElement {
  const exams = useExams()
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
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Bài thi đang làm</p>
            <h1 className="text-2xl font-semibold text-slate-900">{attempt.examTitle}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 font-mono text-white">
            <Clock3 className="h-4 w-4" /> {submitted ? 'Đã nộp' : formatRemaining(remaining)}
          </div>
        </div>

        {message && (
          <p role="status" className={submitted ? 'text-green-700' : 'text-slate-700'}>
            {message}
          </p>
        )}

        {attempt.questions.map((question, index) => (
          <section key={question.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                      disabled={submitted}
                      onChange={() => setAnswers((old) => ({ ...old, [question.id]: option }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                aria-label={`Trả lời câu ${index + 1}`}
                value={answers[question.id] ?? ''}
                disabled={submitted}
                onChange={(event) =>
                  setAnswers((old) => ({ ...old, [question.id]: event.target.value }))
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
        {submitted && (
          <div className="flex items-center justify-between rounded-lg bg-green-50 p-4 text-green-800">
            <span>Đã nộp bài. Bạn không thể làm lại đề này.</span>
            <Button variant="outline" onClick={() => setAttempt(null)}>
              Về danh sách
            </Button>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Bài thi đang mở</h1>
        <Link to="/" className="flex items-center gap-1 text-sm text-slate-500 underline">
          <ArrowLeft className="h-4 w-4" /> Trang chủ
        </Link>
      </div>
      {exams.isLoading && <p>Đang tải danh sách đề…</p>}
      {exams.isError && <p role="alert">Không tải được danh sách đề thi.</p>}
      {exams.data?.length === 0 && <p>Hiện không có đề thi nào đang mở.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {exams.data?.map((exam) => (
          <article key={exam.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
    </main>
  )
}
