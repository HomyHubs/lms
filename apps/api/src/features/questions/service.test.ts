import { describe, expect, it } from 'vitest'
import type { CreateQuestionFields, LevelRef, QuestionRow, QuestionsStore } from './service.js'
import {
  createQuestion,
  deleteQuestion,
  importQuestions,
  listQuestions,
  updateQuestion,
} from './service.js'

const LEVELS: LevelRef[] = [
  { id: 'lvl-starter', code: 'starter' },
  { id: 'lvl-mover', code: 'mover' },
  { id: 'lvl-flyer', code: 'flyer' },
]

/** Store gia lap trong bo nho de test logic ma khong can Postgres. */
function makeFakeStore(): QuestionsStore {
  const rows: QuestionRow[] = []
  let seq = 0
  const now = new Date('2026-09-21T00:00:00.000Z')

  function insert(input: CreateQuestionFields): QuestionRow {
    const level = LEVELS.find((l) => l.id === input.levelId)
    const row: QuestionRow = {
      id: `q-${(seq += 1)}`,
      level_id: input.levelId,
      level_code: level?.code ?? 'starter',
      skill: input.skill,
      question_type: input.questionType,
      difficulty: input.difficulty,
      question_text: input.questionText,
      options: input.options === null ? null : JSON.stringify(input.options),
      correct_answer: input.correctAnswer,
      points: input.points ?? 1,
      explanation: input.explanation,
      source_reference: input.sourceReference,
      created_at: now,
    }
    rows.push(row)
    return row
  }

  return {
    async listQuestions() {
      return [...rows]
    },
    async findQuestionById(id) {
      return rows.find((r) => r.id === id)
    },
    async findLevelByCode(code) {
      return LEVELS.find((l) => l.code === code)
    },
    async createQuestion(input) {
      return insert(input)
    },
    async createQuestions(inputs) {
      return inputs.map(insert)
    },
    async updateQuestion(id, input) {
      const row = rows.find((r) => r.id === id)
      if (!row) return undefined
      if (input.levelId !== undefined) {
        row.level_id = input.levelId
        row.level_code = LEVELS.find((l) => l.id === input.levelId)?.code ?? row.level_code
      }
      if (input.skill !== undefined) row.skill = input.skill
      if (input.questionType !== undefined) row.question_type = input.questionType
      if (input.difficulty !== undefined) row.difficulty = input.difficulty
      if (input.questionText !== undefined) row.question_text = input.questionText
      if (input.options !== undefined) {
        row.options = input.options === null ? null : JSON.stringify(input.options)
      }
      if (input.correctAnswer !== undefined) row.correct_answer = input.correctAnswer
      if (input.points !== undefined) row.points = input.points
      if (input.explanation !== undefined) row.explanation = input.explanation
      if (input.sourceReference !== undefined) row.source_reference = input.sourceReference
      return row
    },
    async deleteQuestion(id) {
      const idx = rows.findIndex((r) => r.id === id)
      if (idx < 0) return false
      rows.splice(idx, 1)
      return true
    },
  }
}

/** Mot dong import hop le (dung ten cot Question Import Schema). */
function validRow(): Record<string, unknown> {
  return {
    level: 'starter',
    skill: 'reading',
    question_type: 'multiple_choice',
    difficulty: 'easy',
    question_text: 'What color is the sky?',
    options: 'blue|green|red',
    correct_answer: 'blue',
    points: '2',
    explanation: '',
    source_reference: '',
  }
}

describe('questions CRUD', () => {
  it('creates a question and maps level code + options', async () => {
    const store = makeFakeStore()
    const out = await createQuestion(store, {
      level: 'mover',
      skill: 'reading',
      questionType: 'multiple_choice',
      difficulty: 'medium',
      questionText: 'Pick one',
      options: ['a', 'b'],
      correctAnswer: 'a',
    })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.question.levelCode).toBe('mover')
    expect(out.question.levelId).toBe('lvl-mover')
    expect(out.question.options).toEqual(['a', 'b'])
    expect(out.question.points).toBe(1)
    expect(await listQuestions(store)).toHaveLength(1)
  })

  it('rejects create when the level code cannot be resolved', async () => {
    const store = makeFakeStore()
    // findLevelByCode gia lap chi biet 3 ma; ep mot ma la de di qua nhanh level_not_found.
    const broken: QuestionsStore = { ...store, findLevelByCode: async () => undefined }
    expect(
      await createQuestion(broken, {
        level: 'starter',
        skill: 'reading',
        questionType: 'true_false',
        difficulty: 'easy',
        questionText: 'Q?',
        correctAnswer: 'yes',
      }),
    ).toEqual({ ok: false, reason: 'level_not_found' })
  })

  it('updates and deletes a question', async () => {
    const store = makeFakeStore()
    const created = await createQuestion(store, {
      level: 'starter',
      skill: 'writing',
      questionType: 'fill_blank',
      difficulty: 'hard',
      questionText: 'Fill ___',
      correctAnswer: 'x',
    })
    if (!created.ok) throw new Error('setup failed')

    expect(await updateQuestion(store, 'nope', { points: 3 })).toEqual({
      ok: false,
      reason: 'not_found',
    })

    const updated = await updateQuestion(store, created.question.id, { questionText: 'Fill YYY' })
    expect(updated.ok).toBe(true)
    if (updated.ok) expect(updated.question.questionText).toBe('Fill YYY')

    expect(await deleteQuestion(store, created.question.id)).toBe(true)
    expect(await deleteQuestion(store, created.question.id)).toBe(false)
  })
})

describe('questions import (Question Import Schema, validate that)', () => {
  it('imports valid rows and splits piped options', async () => {
    const store = makeFakeStore()
    const outcome = await importQuestions(store, [validRow()])
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.imported).toBe(1)
    expect(outcome.result.questions[0]?.options).toEqual(['blue', 'green', 'red'])
    expect(outcome.result.questions[0]?.points).toBe(2)
    expect(await listQuestions(store)).toHaveLength(1)
  })

  it('rejects a file with a wrong/extra field and saves nothing', async () => {
    const store = makeFakeStore()
    // Sai ten cot: `question` thay vi `question_text` -> strict() tu choi.
    const bad = { ...validRow(), question: 'oops' }
    delete (bad as Record<string, unknown>).question_text
    const outcome = await importQuestions(store, [bad])
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.errors.length).toBeGreaterThan(0)
    expect(outcome.errors[0]?.row).toBe(1)
    // Khong luu bat ky dong nao khi co loi.
    expect(await listQuestions(store)).toHaveLength(0)
  })

  it('rejects a bad enum value (skill) and saves nothing', async () => {
    const store = makeFakeStore()
    const outcome = await importQuestions(store, [{ ...validRow(), skill: 'singing' }])
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.errors[0]?.field).toBe('skill')
    expect(await listQuestions(store)).toHaveLength(0)
  })
})
