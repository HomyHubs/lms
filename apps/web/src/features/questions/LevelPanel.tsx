import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { QUESTION_DIFFICULTIES, QUESTION_SKILLS, QUESTION_TYPES } from '@lms/shared'
import type { Question } from '@lms/shared'
import { Button } from '@/components/ui/button'

/** LEVEL_LABELS không export được từ @lms/shared nên viết hoa chữ cái đầu tại chỗ. */
function levelTitle(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1)
}

/** Bộ lọc theo cột bên trong một panel (đã bỏ cột/ô lọc Cấp độ vì panel cố định level). */
interface PanelFilters {
  skill: string
  difficulty: string
  questionType: string
  text: string
}

const EMPTY_FILTERS: PanelFilters = { skill: '', difficulty: '', questionType: '', text: '' }

/**
 * Một panel cho một cấp độ (slice-18). Hiển thị câu hỏi của đúng cấp độ, thu gọn/mở được,
 * và có hàng ô lọc theo cột (Kỹ năng / Độ khó / Loại + ô văn bản cho Câu hỏi).
 * Lọc hoàn toàn phía client trên danh sách đã tải — không phát sinh GET /questions.
 */
export function LevelPanel({
  levelCode,
  questions,
  collapsed,
  onToggle,
  onEdit,
  onDelete,
  editDisabled,
  deleteDisabled,
}: {
  levelCode: string
  questions: Question[]
  collapsed: boolean
  onToggle: () => void
  onEdit: (q: Question) => void
  onDelete: (id: string) => void
  editDisabled: boolean
  deleteDisabled: boolean
}): React.ReactElement {
  const [filters, setFilters] = useState<PanelFilters>(EMPTY_FILTERS)

  const text = filters.text.trim().toLowerCase()
  const visible = questions.filter(
    (q) =>
      (!filters.skill || q.skill === filters.skill) &&
      (!filters.difficulty || q.difficulty === filters.difficulty) &&
      (!filters.questionType || q.questionType === filters.questionType) &&
      (!text || q.questionText.toLowerCase().includes(text)),
  )

  const bodyId = `level-panel-body-${levelCode}`

  return (
    <section className="c-card">
      <h2 className="c-section-title">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          className="flex w-full items-center gap-2 text-left text-primary-900"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          )}
          {levelTitle(levelCode)}
          <span className="text-sm font-normal text-slate-500">({questions.length} câu)</span>
        </button>
      </h2>

      {!collapsed && (
        <div id={bodyId}>
          <table className="c-table">
            <thead>
              <tr>
                <th>Kỹ năng</th>
                <th>Loại</th>
                <th>Độ khó</th>
                <th>Câu hỏi</th>
                <th>Điểm</th>
                <th className="text-right">Hành động</th>
              </tr>
              <tr>
                <th>
                  <select
                    className="c-input"
                    aria-label={`Lọc kỹ năng ${levelTitle(levelCode)}`}
                    value={filters.skill}
                    onChange={(e) => setFilters((old) => ({ ...old, skill: e.target.value }))}
                  >
                    <option value="">Tất cả</option>
                    {QUESTION_SKILLS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    className="c-input"
                    aria-label={`Lọc loại câu hỏi ${levelTitle(levelCode)}`}
                    value={filters.questionType}
                    onChange={(e) =>
                      setFilters((old) => ({ ...old, questionType: e.target.value }))
                    }
                  >
                    <option value="">Tất cả</option>
                    {QUESTION_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    className="c-input"
                    aria-label={`Lọc độ khó ${levelTitle(levelCode)}`}
                    value={filters.difficulty}
                    onChange={(e) => setFilters((old) => ({ ...old, difficulty: e.target.value }))}
                  >
                    <option value="">Tất cả</option>
                    {QUESTION_DIFFICULTIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <input
                    className="c-input"
                    aria-label={`Lọc câu hỏi ${levelTitle(levelCode)}`}
                    placeholder="Tìm trong câu hỏi"
                    value={filters.text}
                    onChange={(e) => setFilters((old) => ({ ...old, text: e.target.value }))}
                  />
                </th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((q) => (
                <tr key={q.id}>
                  <td>{q.skill}</td>
                  <td>{q.questionType}</td>
                  <td>{q.difficulty}</td>
                  <td>
                    {q.questionText}
                    {q.source === 'ai_generated' && (
                      <span className="ml-2 rounded bg-accent-100 px-1.5 text-xs text-accent-700">
                        AI
                      </span>
                    )}
                  </td>
                  <td>{q.points}</td>
                  <td className="space-x-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(q)}
                      disabled={editDisabled}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(q.id)}
                      disabled={deleteDisabled}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Xoá
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
