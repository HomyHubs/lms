import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FileDown, ImagePlus, ListChecks, Upload } from 'lucide-react'
import {
  CreateQuestionRequest,
  IMPORT_COLUMNS,
  LEVEL_CODES,
  QUESTION_DIFFICULTIES,
  QUESTION_SKILLS,
  QUESTION_TYPES,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { ApiError, parseQuestionsCsv } from '@/lib/api'
import { checkImportFile, parseQuestionsXlsx } from '@/lib/question-import'
import { buildXlsx, downloadFile, XLSX_MIME } from '@/lib/xlsx-export'
import { QuestionImages } from '@/features/media/QuestionImages'
import { useSession } from '@/features/auth/useAuth'
import type { Question } from '@lms/shared'
import { LevelPanel } from './LevelPanel'
import { readPanelState, writePanelState, type PanelState } from './panel-state'
import { useUpdateQuestion } from './useQuestions'
import {
  useCreateQuestion,
  useDeleteQuestion,
  useImportQuestions,
  useQuestions,
} from './useQuestions'

/** Mẫu Excel: hàng tiêu đề = IMPORT_COLUMNS + 1–2 hàng ví dụ cho user điền theo. */
const TEMPLATE_EXAMPLE_ROWS: ReadonlyArray<ReadonlyArray<string>> = [
  [
    'starter',
    'reading',
    'multiple_choice',
    'easy',
    'What color is the sky?',
    'blue|green|red',
    'blue',
    '1',
    'Bầu trời màu xanh.',
    'Unit 1',
  ],
  [
    'mover',
    'listening',
    'fill_blank',
    'medium',
    'The cat is ___ the table.',
    '',
    'on',
    '2',
    '',
    '',
  ],
]

function downloadTemplate(): void {
  const rows = [IMPORT_COLUMNS as readonly string[], ...TEMPLATE_EXAMPLE_ROWS]
  const bytes = buildXlsx([{ name: 'MauCauHoi', rows }])
  downloadFile(bytes, 'mau-cau-hoi.xlsx', XLSX_MIME)
}

/**
 * Trang Ngan hang cau hoi (slice-3) — Admin/Teacher (route guard theo role, BE thuc thi RBAC that).
 * CRUD cau hoi theo Level/Skill/Type/Difficulty + import hang loat tu CSV (Question Import Schema).
 * Import validate o backend: sai field/enum -> bao loi ro rang, khong luu.
 */
export function QuestionsPage(): React.ReactElement {
  const questions = useQuestions()
  const createQuestion = useCreateQuestion()
  const deleteQuestion = useDeleteQuestion()
  const importQuestions = useImportQuestions()

  const [level, setLevel] = useState<string>(LEVEL_CODES[0])
  const [skill, setSkill] = useState<string>(QUESTION_SKILLS[0])
  const [questionType, setQuestionType] = useState<string>(QUESTION_TYPES[0])
  const [difficulty, setDifficulty] = useState<string>(QUESTION_DIFFICULTIES[0])
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [points, setPoints] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const updateQuestion = useUpdateQuestion()
  const [editingId, setEditingId] = useState<string | null>(null)
  const questionList = questions.data
  const editingQuestion = questionList?.find((q) => q.id === editingId)
  const [explanation, setExplanation] = useState('')
  const [sourceReference, setSourceReference] = useState('')

  // slice-18: nhóm câu hỏi đã tải theo cấp độ (lọc chi tiết nằm trong từng panel).
  const byLevel = (code: string): Question[] =>
    questionList?.filter((q) => q.levelCode === code) ?? []

  // slice-18: panel theo cấp độ + nhớ trạng thái đóng/mở theo user (localStorage).
  const { user } = useSession()
  const userId = user?.id
  const [panelState, setPanelState] = useState<PanelState>(() => readPanelState(userId))
  const [panelStateUser, setPanelStateUser] = useState<string | undefined>(userId)
  // Khi phiên đổi (đăng nhập lại / user khác) nạp lại trạng thái của đúng user đó.
  if (userId !== panelStateUser) {
    setPanelStateUser(userId)
    setPanelState(readPanelState(userId))
  }
  function togglePanel(levelCode: string): void {
    setPanelState((old) => {
      const next = { ...old, [levelCode]: !old[levelCode] }
      writePanelState(userId, next)
      return next
    })
  }

  // slice-18: cuộn lên form khi bấm "Sửa".
  const formRef = useRef<HTMLElement | null>(null)

  function clearForm(): void {
    setEditingId(null)
    setQuestionText('')
    setOptions('')
    setCorrectAnswer('')
    setPoints('')
    setExplanation('')
    setSourceReference('')
    setFormError(null)
  }

  function editQuestion(q: Question): void {
    setEditingId(q.id)
    setLevel(q.levelCode)
    setSkill(q.skill)
    setQuestionType(q.questionType)
    setDifficulty(q.difficulty)
    setQuestionText(q.questionText)
    setOptions(q.options?.join('|') ?? '')
    setCorrectAnswer(q.correctAnswer)
    setPoints(String(q.points))
    setExplanation(q.explanation ?? '')
    setSourceReference(q.sourceReference ?? '')
    setFormError(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [importError, setImportError] = useState<string | null>(null)
  const [importInfo, setImportInfo] = useState<string | null>(null)

  function handleCreate(e: FormEvent): void {
    e.preventDefault()
    setFormError(null)
    const optionList = options
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    const candidate = {
      level,
      skill,
      questionType,
      difficulty,
      questionText,
      correctAnswer,
      explanation,
      sourceReference,
      ...(optionList.length > 0 ? { options: optionList } : {}),
      ...(points.trim() !== '' ? { points: Number(points) } : {}),
    }
    const parsed = CreateQuestionRequest.safeParse(candidate)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    const callbacks = { onSuccess: clearForm, onError: (err: Error) => setFormError(err.message) }
    if (editingId) {
      updateQuestion.mutate(
        {
          id: editingId,
          input: {
            ...parsed.data,
            options: optionList.length ? optionList : null,
            explanation: explanation.trim() || null,
            sourceReference: sourceReference.trim() || null,
          },
        },
        callbacks,
      )
    } else createQuestion.mutate(parsed.data, callbacks)
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportError(null)
    setImportInfo(null)
    try {
      const kind = checkImportFile(file)
      const rows =
        kind === 'csv'
          ? parseQuestionsCsv(await file.text())
          : await parseQuestionsXlsx(await file.arrayBuffer())
      if (!rows.length) {
        setImportError('File rỗng')
        return
      }
      await importQuestions.mutateAsync(rows)
      setImportInfo(`Đã import ${rows.length} câu hỏi`)
    } catch (err) {
      const details =
        err instanceof ApiError
          ? err.errors
              .map((issue) => `Dòng dữ liệu ${issue.row} / ${issue.field}: ${issue.message}`)
              .join('\n')
          : ''
      setImportError(details || (err instanceof Error ? err.message : 'Không đọc được file'))
    }
  }

  return (
    <>
      <PageHeader icon={ListChecks} title="Ngân hàng câu hỏi" />

      <section ref={formRef} className="c-card">
        <h2 className="c-section-title">
          <ListChecks className="h-5 w-5" /> Thêm câu hỏi
        </h2>
        {formError && (
          <p role="alert" className="text-sm text-danger-600">
            {formError}
          </p>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            aria-label="Cấp độ"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="c-input"
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
            onChange={(e) => setSkill(e.target.value)}
            className="c-input"
          >
            {QUESTION_SKILLS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Loại câu hỏi"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="c-input"
          >
            {QUESTION_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Độ khó"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="c-input"
          >
            {QUESTION_DIFFICULTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            aria-label="Nội dung câu hỏi"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Nội dung câu hỏi"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            aria-label="Lựa chọn"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="Lựa chọn, phân tách bằng | (tùy chọn)"
            className="c-input"
          />
          <input
            aria-label="Đáp án đúng"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="Đáp án đúng"
            className="c-input"
          />
          <input
            aria-label="Điểm"
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Điểm (mặc định 1)"
            className="c-input"
          />
          <textarea
            aria-label="Giải thích"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Giải thích"
            className="rounded-md border p-2"
          />
          <input
            aria-label="Nguồn tham khảo"
            value={sourceReference}
            onChange={(e) => setSourceReference(e.target.value)}
            placeholder="Nguồn tham khảo"
            className="rounded-md border p-2"
          />
          <Button type="submit" disabled={createQuestion.isPending || updateQuestion.isPending}>
            {editingId ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={clearForm}
              disabled={updateQuestion.isPending}
            >
              Hủy sửa
            </Button>
          )}
        </form>
        {editingId ? (
          <div>
            <h3 className="flex items-center gap-1 text-sm font-medium"><ImagePlus className="h-4 w-4" />Hình ảnh</h3>
            <QuestionImages questionId={editingId} label="Hình câu đang sửa" options={editingQuestion?.options ?? null} editable />
          </div>
        ) : (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <ImagePlus className="h-4 w-4" />Lưu câu hỏi xong, bấm “Sửa” ở câu đó để chèn hình.
          </p>
        )}
      </section>

      <section className="c-card">
        <h2 className="c-section-title">
          <Upload className="h-5 w-5" /> Import từ CSV / XLSX
        </h2>
        <p className="text-sm text-slate-500">
          Cột: level, skill, question_type, difficulty, question_text, options, correct_answer,
          points, explanation, source_reference. Lựa chọn phân tách bằng |. Sai field/enum sẽ báo
          lỗi và không lưu.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <FileDown className="mr-1 h-4 w-4" /> Tải mẫu Excel
        </Button>
        <input
          aria-label="Chọn file CSV"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={importQuestions.isPending}
          onChange={(e) => void handleImportFile(e)}
          className="text-sm"
        />
        {importInfo && <p className="text-sm text-success-700">{importInfo}</p>}
        {importError && (
          <p role="alert" className="text-sm text-danger-600">
            {importError}
          </p>
        )}
      </section>

      {questionList &&
        LEVEL_CODES.map((code) => (
          <LevelPanel
            key={code}
            levelCode={code}
            questions={byLevel(code)}
            collapsed={panelState[code] ?? false}
            onToggle={() => togglePanel(code)}
            onEdit={editQuestion}
            onDelete={(id) => deleteQuestion.mutate(id)}
            editDisabled={updateQuestion.isPending}
            deleteDisabled={deleteQuestion.isPending}
          />
        ))}
    </>
  )
}
