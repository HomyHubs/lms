import {
  QuestionImportRow,
  type CommitExamSetImportItem,
  type ExamSetImportIssue,
  type LevelCode,
  type QuestionSkill,
} from '@lms/shared'
import { normalizeAnswer } from '../exams/index.js'

/** One validation rule for every imported item (Word, Excel, CSV and the commit step). */

export type ItemCheck = { ok: true; row: QuestionImportRow } | { ok: false; field: string; message: string }

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/** Objective answer = one of the options (text) or its letter. */
export function answerMatchesOption(options: readonly string[], answer: string): boolean {
  const normalized = normalizeAnswer(answer)
  const letter = normalized.length === 1 ? LETTERS.indexOf(normalized) : -1
  return options.some((o) => normalizeAnswer(o) === normalized) || (letter >= 0 && letter < options.length)
}

export function checkImportItem(item: CommitExamSetImportItem, level: LevelCode, skill: QuestionSkill): ItemCheck {
  const parsed = QuestionImportRow.safeParse({
    level,
    skill,
    question_type: item.questionType,
    difficulty: item.difficulty,
    question_text: item.questionText,
    options: item.options ?? undefined,
    correct_answer: item.correctAnswer,
    points: item.points,
    explanation: item.explanation ?? undefined,
  })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      ok: false,
      field: issue && issue.path.length > 0 ? issue.path.join('.') : '(row)',
      message: issue?.message ?? 'Du lieu khong hop le',
    }
  }
  const row = parsed.data
  const objective = row.question_type === 'multiple_choice' || row.question_type === 'true_false'
  if (objective && row.options !== undefined) {
    if (row.options.length < 2) return { ok: false, field: 'options', message: 'Can it nhat 2 lua chon' }
    if (!answerMatchesOption(row.options, row.correct_answer)) {
      return { ok: false, field: 'correct_answer', message: 'Dap an dung phai khop mot lua chon' }
    }
  } else if (row.question_type === 'multiple_choice') {
    return { ok: false, field: 'options', message: 'Cau trac nghiem can it nhat 2 lua chon' }
  }
  return { ok: true, row }
}

export function issue(
  where: { block?: number | null; row?: number | null },
  field: string,
  message: string,
): ExamSetImportIssue {
  return { block: where.block ?? null, row: where.row ?? null, field, message }
}
