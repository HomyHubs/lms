import { useMemo, useState } from 'react'
import {
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  type ExamSetDetail,
  type Question,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { useQuestions } from '@/features/questions/useQuestions'

/**
 * slice-21 (4.4): Ngân hàng câu hỏi để liên kết vào bộ đề.
 * Tách ra file riêng từ BankPicker nội bộ cũ của ExamSetsPage, nâng cấp:
 * tìm theo nội dung + lọc loại/độ khó + chọn nhiều câu rồi thêm một lần (onAddMany).
 * Vẫn auto-lọc theo levelId/skill của bộ đề và loại các câu đã thuộc bộ đề.
 */
export function BankPicker({
  set,
  onAdd,
  onAddMany,
}: {
  set: ExamSetDetail
  onAdd: (q: Question) => void
  onAddMany: (ids: string[]) => void
}): React.ReactElement {
  const bank = useQuestions()
  const [text, setText] = useState('')
  const [type, setType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const used = useMemo(() => new Set(set.items.map((q) => q.id)), [set.items])
  const search = text.trim().toLowerCase()
  const candidates = useMemo(
    () =>
      (bank.data ?? []).filter(
        (q) =>
          q.levelId === set.levelId &&
          q.skill === set.skill &&
          !used.has(q.id) &&
          (!type || q.questionType === type) &&
          (!difficulty || q.difficulty === difficulty) &&
          (!search || q.questionText.toLowerCase().includes(search)),
      ),
    [bank.data, set.levelId, set.skill, used, type, difficulty, search],
  )

  const visibleIds = candidates.map((q) => q.id)
  const chosen = selected.filter((id) => visibleIds.includes(id))
  const toggle = (id: string): void =>
    setSelected((old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]))
  const addChosen = (): void => {
    if (chosen.length === 0) return
    onAddMany(chosen)
    setSelected([])
  }

  if (bank.isPending) return <p className="text-sm text-slate-500">Đang tải ngân hàng…</p>

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-sm">
        <input
          type="search"
          aria-label="Tìm câu hỏi"
          placeholder="Tìm câu hỏi"
          value={text}
          className="c-input flex-1"
          onChange={(e) => setText(e.target.value)}
        />
        <select
          aria-label="Lọc loại câu hỏi"
          value={type}
          className="c-input"
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Tất cả loại</option>
          {QUESTION_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc độ khó"
          value={difficulty}
          className="c-input"
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">Tất cả độ khó</option>
          {QUESTION_DIFFICULTIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">Không còn câu cùng cấp độ/kỹ năng trong ngân hàng.</p>
      ) : (
        <>
          <ul className="max-h-72 divide-y overflow-y-auto text-sm">
            {candidates.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2 py-1.5">
                <label className="flex flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Chọn: ${q.questionText}`}
                    checked={selected.includes(q.id)}
                    onChange={() => toggle(q.id)}
                  />
                  <span>{q.questionText}</span>
                </label>
                <Button size="sm" variant="outline" aria-label={`Thêm: ${q.questionText}`} onClick={() => onAdd(q)}>
                  Thêm
                </Button>
              </li>
            ))}
          </ul>
          <Button size="sm" disabled={chosen.length === 0} onClick={addChosen}>
            Thêm {chosen.length} câu đã chọn vào bộ đề
          </Button>
        </>
      )}
    </div>
  )
}
