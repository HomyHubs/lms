import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, ListChecks, Trash2, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  CreateQuestionRequest,
  LEVEL_CODES,
  QUESTION_DIFFICULTIES,
  QUESTION_SKILLS,
  QUESTION_TYPES,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { ApiError, parseQuestionsCsv } from '@/lib/api'
import { checkImportFile, parseQuestionsXlsx } from '@/lib/question-import'
import type { Question } from '@lms/shared'
import { useUpdateQuestion } from './useQuestions'
import {
  useCreateQuestion,
  useDeleteQuestion,
  useImportQuestions,
  useQuestions,
} from './useQuestions'

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
  const [explanation, setExplanation] = useState('')
  const [sourceReference, setSourceReference] = useState('')
  const [filters, setFilters] = useState({
    levelCode: '',
    skill: '',
    difficulty: '',
    questionType: '',
  })
  const visibleQuestions = questions.data?.filter((q) =>
    Object.entries(filters).every(
      ([key, value]) => !value || q[key as keyof typeof filters] === value,
    ),
  )

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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <fieldset className="flex flex-wrap gap-3">
        <legend>Lọc danh sách đã tải</legend>
        {(
          [
            ['levelCode', 'Lọc cấp độ', LEVEL_CODES],
            ['skill', 'Lọc kỹ năng', QUESTION_SKILLS],
            ['difficulty', 'Lọc độ khó', QUESTION_DIFFICULTIES],
            ['questionType', 'Lọc loại câu hỏi', QUESTION_TYPES],
          ] as const
        ).map(([key, label, values]) => (
          <label key={key}>
            {label}
            <select
              aria-label={label}
              value={filters[key]}
              onChange={(e) => setFilters((old) => ({ ...old, [key]: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}
        <Button
          variant="outline"
          onClick={() => setFilters({ levelCode: '', skill: '', difficulty: '', questionType: '' })}
        >
          Xóa bộ lọc
        </Button>
      </fieldset>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Ngân hàng câu hỏi</h1>
        <Link to="/" className="flex items-center gap-1 text-sm text-slate-500 underline">
          <ArrowLeft className="h-4 w-4" /> Trang chủ
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-medium text-slate-800">
          <ListChecks className="h-5 w-5" /> Thêm câu hỏi
        </h2>
        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            aria-label="Cấp độ"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Đáp án đúng"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="Đáp án đúng"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Điểm"
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Điểm (mặc định 1)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-medium text-slate-800">
          <Upload className="h-5 w-5" /> Import từ CSV / XLSX
        </h2>
        <p className="text-sm text-slate-500">
          Cột: level, skill, question_type, difficulty, question_text, options, correct_answer,
          points, explanation, source_reference. Lựa chọn phân tách bằng |. Sai field/enum sẽ báo
          lỗi và không lưu.
        </p>
        <input
          aria-label="Chọn file CSV"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={importQuestions.isPending}
          onChange={(e) => void handleImportFile(e)}
          className="text-sm"
        />
        {importInfo && <p className="text-sm text-green-700">{importInfo}</p>}
        {importError && (
          <p role="alert" className="text-sm text-red-600">
            {importError}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-800">Danh sách câu hỏi</h2>
        {questions.data && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="p-2">Cấp độ</th>
                <th className="p-2">Kỹ năng</th>
                <th className="p-2">Loại</th>
                <th className="p-2">Độ khó</th>
                <th className="p-2">Câu hỏi</th>
                <th className="p-2">Điểm</th>
                <th className="p-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuestions?.map((q) => (
                <tr key={q.id} className="border-b border-slate-100">
                  <td className="p-2">{q.levelCode}</td>
                  <td className="p-2">{q.skill}</td>
                  <td className="p-2">{q.questionType}</td>
                  <td className="p-2">{q.difficulty}</td>
                  <td className="p-2">{q.questionText}</td>
                  <td className="p-2">{q.points}</td>
                  <td className="p-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editQuestion(q)}
                      disabled={updateQuestion.isPending}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQuestion.mutate(q.id)}
                      disabled={deleteQuestion.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Xoá
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
