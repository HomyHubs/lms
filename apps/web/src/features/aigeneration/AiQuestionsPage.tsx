import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ClipboardCopy, Sparkles, Upload } from 'lucide-react'
import {
  LEVEL_CODES,
  MAX_AI_SAMPLES,
  QUESTION_DIFFICULTIES,
  QUESTION_SKILLS,
  QUESTION_TYPES,
  type AiGeneratedItem,
  type AiRequestStatus,
  type LevelCode,
  type QuestionDifficulty,
  type QuestionSkill,
  type QuestionType,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { ApiError, parseAiResultText } from '@/lib/api'
import { ImportFileError } from '@/lib/question-import'
import { useQuestions } from '@/features/questions/useQuestions'
import {
  useAiRequest,
  useAiRequests,
  useCreateAiRequest,
  useSaveAiRequest,
  useSubmitAiResults,
  useUpdateAiItem,
} from './useAiGeneration'

const STATUS_LABELS: Record<AiRequestStatus, string> = {
  draft: 'Đã sinh prompt',
  imported: 'Đang chờ duyệt',
  reviewed: 'Đã duyệt xong',
  saved_to_bank: 'Đã lưu vào ngân hàng',
}

const ITEM_LABELS: Record<AiGeneratedItem['status'], string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Loại',
  saved: 'Đã lưu',
}

const fieldClass = 'rounded-md border border-slate-300 px-3 py-2 text-sm'
const headingClass = 'flex items-center gap-2 text-lg font-medium text-slate-800'

function describeError(error: unknown): string {
  if (error instanceof ApiError || error instanceof ImportFileError) {
    const details = error.errors.map((e) => `Dòng ${e.row} / ${e.field}: ${e.message}`)
    return error instanceof ApiError && details.length > 0
      ? [error.message, ...details].join('\n')
      : error.message
  }
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra'
}

/**
 * slice-4.5: build a prompt for an external AI tool, paste its JSON/CSV answer back, review each
 * row, then save approved rows to the bank. The app never calls an AI provider itself.
 */
export function AiQuestionsPage(): React.ReactElement {
  const [level, setLevel] = useState<LevelCode>('starter')
  const [skill, setSkill] = useState<QuestionSkill>('reading')
  const [questionType, setQuestionType] = useState<QuestionType | ''>('')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>('')
  const [count, setCount] = useState('10')
  const [notes, setNotes] = useState('')
  const [sampleIds, setSampleIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const questions = useQuestions()
  const requests = useAiRequests()
  const detail = useAiRequest(selectedId)
  const createRequest = useCreateAiRequest()
  const submitResults = useSubmitAiResults(selectedId)
  const updateItem = useUpdateAiItem(selectedId)
  const saveRequest = useSaveAiRequest(selectedId)

  const candidates = (questions.data ?? []).filter((q) => q.levelCode === level && q.skill === skill)
  const request = detail.data?.request
  const items = detail.data?.items ?? []
  const canImport = request?.status === 'draft' || request?.status === 'imported'
  const canReview = request?.status === 'imported' || request?.status === 'reviewed'

  function report(err: unknown): void {
    setMessage(null)
    setError(describeError(err))
  }

  function changeScope(nextLevel: LevelCode, nextSkill: QuestionSkill): void {
    setLevel(nextLevel)
    setSkill(nextSkill)
    setSampleIds([])
  }

  function toggleSample(id: string): void {
    setSampleIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return prev.length < MAX_AI_SAMPLES ? [...prev, id] : prev
    })
  }

  function handleCreate(e: FormEvent): void {
    e.preventDefault()
    setError(null)
    createRequest.mutate(
      {
        level,
        skill,
        questionType: questionType || undefined,
        difficulty: difficulty || undefined,
        count: Number(count),
        sampleQuestionIds: sampleIds,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (created) => {
          setSelectedId(created.request.id)
          setPasted('')
          setMessage('Đã sinh prompt. Sao chép và dán vào công cụ AI bên ngoài.')
        },
        onError: report,
      },
    )
  }

  async function copyPrompt(): Promise<void> {
    if (!request) return
    try {
      await navigator.clipboard.writeText(request.prompt)
      setMessage('Đã sao chép prompt')
    } catch {
      setError('Trình duyệt chặn sao chép; hãy chọn và sao chép thủ công')
    }
  }

  function importText(text: string): void {
    setError(null)
    let rows: Record<string, unknown>[]
    try {
      rows = parseAiResultText(text)
    } catch (err) {
      return report(err)
    }
    submitResults.mutate(rows, {
      onSuccess: (d) => setMessage(`Đã đưa ${d.items.length} câu hỏi vào hàng chờ duyệt`),
      onError: report,
    })
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) importText(await file.text())
  }

  function handleSave(): void {
    setError(null)
    saveRequest.mutate(undefined, {
      onSuccess: (result) => setMessage(`Đã lưu ${result.saved} câu hỏi vào ngân hàng (nguồn AI)`),
      onError: report,
    })
  }

  return (
    <>
      <PageHeader icon={Sparkles} title="Sinh câu hỏi bằng AI" />

      {message && <p className="text-sm text-success-700">{message}</p>}
      {error && (
        <p role="alert" className="whitespace-pre-line text-sm text-danger-600">
          {error}
        </p>
      )}

      <section className="c-card">
        <h2 className={headingClass}>1. Tạo prompt</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            aria-label="Cấp độ"
            value={level}
            onChange={(e) => changeScope(e.target.value as LevelCode, skill)}
            className={fieldClass}
          >
            {LEVEL_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Kỹ năng"
            value={skill}
            onChange={(e) => changeScope(level, e.target.value as QuestionSkill)}
            className={fieldClass}
          >
            {QUESTION_SKILLS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            aria-label="Số lượng"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={fieldClass}
          />
          <select
            aria-label="Loại câu hỏi"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType | '')}
            className={fieldClass}
          >
            <option value="">Loại: bất kỳ</option>
            {QUESTION_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Độ khó"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty | '')}
            className={fieldClass}
          >
            <option value="">Độ khó: trộn</option>
            {QUESTION_DIFFICULTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            aria-label="Yêu cầu thêm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Yêu cầu thêm (chủ đề, từ vựng…)"
            className={fieldClass}
          />
          <fieldset className="text-sm sm:col-span-3">
            <legend className="text-slate-600">
              Đề mẫu tham khảo từ ngân hàng ({sampleIds.length}/{MAX_AI_SAMPLES})
            </legend>
            {candidates.length === 0 && (
              <p className="text-slate-400">Chưa có câu hỏi cùng cấp độ/kỹ năng.</p>
            )}
            <ul className="max-h-40 overflow-y-auto">
              {candidates.map((q) => (
                <li key={q.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sampleIds.includes(q.id)}
                      onChange={() => toggleSample(q.id)}
                    />
                    {q.questionText}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <Button type="submit" disabled={createRequest.isPending}>
            Sinh prompt
          </Button>
        </form>
      </section>

      <section className="c-card">
        <h2 className={headingClass}>Yêu cầu đã tạo</h2>
        {requests.data?.length === 0 && <p className="text-sm text-slate-400">Chưa có yêu cầu nào.</p>}
        <ul className="flex flex-col gap-1 text-sm">
          {requests.data?.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={r.id === selectedId ? 'font-semibold text-slate-900' : 'text-slate-600 underline'}
              >
                {new Date(r.createdAt).toLocaleString('vi-VN')} · {r.levelCode} / {r.skill} · {r.count} câu ·{' '}
                {STATUS_LABELS[r.status]}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {request && (
        <section className="c-card">
          <div className="flex items-center justify-between">
            <h2 className={headingClass}>2. Prompt — {STATUS_LABELS[request.status]}</h2>
            <Button variant="outline" size="sm" onClick={() => void copyPrompt()}>
              <ClipboardCopy className="mr-1 h-4 w-4" /> Sao chép prompt
            </Button>
          </div>
          <textarea
            aria-label="Prompt"
            readOnly
            value={request.prompt}
            rows={10}
            className="rounded-md border p-2 font-mono text-xs"
          />

          {canImport && (
            <>
              <h2 className={headingClass}>
                <Upload className="h-5 w-5" /> 3. Dán / tải lên kết quả từ AI (JSON hoặc CSV)
              </h2>
              <textarea
                aria-label="Kết quả từ AI"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                placeholder='[{"level": "starter", "skill": "reading", ...}]'
                className="rounded-md border p-2 font-mono text-xs"
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => importText(pasted)}
                  disabled={submitResults.isPending || pasted.trim() === ''}
                >
                  Đưa vào hàng chờ duyệt
                </Button>
                <input
                  aria-label="Chọn file kết quả AI"
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  disabled={submitResults.isPending}
                  onChange={(e) => void handleFile(e)}
                  className="text-sm"
                />
              </div>
            </>
          )}
        </section>
      )}

      {request && items.length > 0 && (
        <section className="c-card">
          <div className="flex items-center justify-between">
            <h2 className={headingClass}>4. Hàng chờ duyệt</h2>
            <Button onClick={handleSave} disabled={request.status !== 'reviewed' || saveRequest.isPending}>
              Lưu vào ngân hàng
            </Button>
          </div>
          <table className="c-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Câu hỏi</th>
                <th>Đáp án</th>
                <th>Trạng thái</th>
                <th className="text-right">Duyệt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ReviewRow
                  key={item.id}
                  item={item}
                  editable={canReview && item.status !== 'saved'}
                  busy={updateItem.isPending}
                  onChange={(input) => updateItem.mutate({ itemId: item.id, input }, { onError: report })}
                />
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}

interface ReviewRowProps {
  item: AiGeneratedItem
  editable: boolean
  busy: boolean
  onChange: (input: { row?: Record<string, unknown>; status?: 'approved' | 'rejected' }) => void
}

interface RowDraft {
  text: string
  options: string
  answer: string
}

/** Edits stay in a local draft; one PATCH is sent on "Lưu sửa". */
function ReviewRow({ item, editable, busy, onChange }: ReviewRowProps): React.ReactElement {
  const [draft, setDraft] = useState<RowDraft | null>(null)
  const { row } = item

  function commitEdit(): void {
    if (!draft) return
    onChange({
      row: {
        ...row,
        question_text: draft.text,
        options: draft.options.trim() === '' ? undefined : draft.options,
        correct_answer: draft.answer,
      },
    })
    setDraft(null)
  }

  return (
    <tr className="border-b border-slate-100 align-top">
      <td>{item.position}</td>
      <td>
        {draft ? (
          <div className="flex flex-col gap-1">
            <input
              aria-label={`Nội dung câu ${item.position}`}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              className={fieldClass}
            />
            <input
              aria-label={`Lựa chọn câu ${item.position}`}
              value={draft.options}
              onChange={(e) => setDraft({ ...draft, options: e.target.value })}
              placeholder="A|B|C"
              className={fieldClass}
            />
          </div>
        ) : (
          <>
            <p>{row.question_text}</p>
            {row.options && <p className="text-xs text-slate-500">{row.options.join(' | ')}</p>}
            <p className="text-xs text-slate-400">
              {row.question_type} · {row.difficulty}
            </p>
          </>
        )}
      </td>
      <td>
        {draft ? (
          <input
            aria-label={`Đáp án câu ${item.position}`}
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            className={fieldClass}
          />
        ) : (
          row.correct_answer
        )}
      </td>
      <td>{ITEM_LABELS[item.status]}</td>
      <td className="flex justify-end gap-1 p-2">
        {editable && !draft && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onChange({ status: 'approved' })}>
              Duyệt câu {item.position}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onChange({ status: 'rejected' })}>
              Loại câu {item.position}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                setDraft({
                  text: row.question_text,
                  options: (row.options ?? []).join('|'),
                  answer: row.correct_answer,
                })
              }
            >
              Sửa câu {item.position}
            </Button>
          </>
        )}
        {draft && (
          <>
            <Button size="sm" disabled={busy} onClick={commitEdit}>
              Lưu sửa
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
              Hủy
            </Button>
          </>
        )}
      </td>
    </tr>
  )
}
