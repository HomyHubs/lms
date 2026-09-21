import type { AppDb } from '../../platform/db.js'
import type { CreateQuestionFields, LevelRef, QuestionRow, QuestionsStore } from './service.js'

/** Cot doc kem level_code (join levels) — dung chung cho list/find/re-select sau ghi. */
const QUESTION_COLUMNS = [
  'questions.id',
  'questions.level_id',
  'levels.code as level_code',
  'questions.skill',
  'questions.question_type',
  'questions.difficulty',
  'questions.question_text',
  'questions.options',
  'questions.correct_answer',
  'questions.points',
  'questions.explanation',
  'questions.source_reference',
  'questions.created_at',
] as const

/** `options` (string[]) luu duoi dang chuoi JSON o cot text; null neu khong co. */
function serializeOptions(options: string[] | null | undefined): string | null {
  return options === null || options === undefined ? null : JSON.stringify(options)
}

function insertValues(input: CreateQuestionFields): {
  level_id: string
  skill: string
  question_type: string
  difficulty: string
  question_text: string
  options: string | null
  correct_answer: string
  explanation: string | null
  source_reference: string | null
  points: number | undefined
} {
  return {
    level_id: input.levelId,
    skill: input.skill,
    question_type: input.questionType,
    difficulty: input.difficulty,
    question_text: input.questionText,
    options: serializeOptions(input.options),
    correct_answer: input.correctAnswer,
    explanation: input.explanation,
    source_reference: input.sourceReference,
    // undefined -> Postgres dung DEFAULT (points = 1).
    points: input.points,
  }
}

/** Hien thuc QuestionsStore bang Kysely tren Postgres THUC (khong mock). */
export function makeQuestionsStore(db: AppDb): QuestionsStore {
  function selectQuestions() {
    return db
      .selectFrom('questions')
      .innerJoin('levels', 'levels.id', 'questions.level_id')
      .select(QUESTION_COLUMNS)
  }

  async function requireById(id: string): Promise<QuestionRow> {
    return selectQuestions().where('questions.id', '=', id).executeTakeFirstOrThrow()
  }

  return {
    async listQuestions() {
      return selectQuestions().orderBy('questions.created_at', 'asc').execute()
    },

    async findQuestionById(id) {
      return selectQuestions().where('questions.id', '=', id).executeTakeFirst()
    },

    async findLevelByCode(code): Promise<LevelRef | undefined> {
      return db
        .selectFrom('levels')
        .select(['id', 'code'])
        .where('code', '=', code)
        .executeTakeFirst()
    },

    async createQuestion(input) {
      const inserted = await db
        .insertInto('questions')
        .values(insertValues(input))
        .returning('id')
        .executeTakeFirstOrThrow()
      return requireById(inserted.id)
    },

    async createQuestions(inputs) {
      if (inputs.length === 0) return []
      const inserted = await db
        .insertInto('questions')
        .values(inputs.map(insertValues))
        .returning('id')
        .execute()
      const ids = inserted.map((r) => r.id)
      return selectQuestions().where('questions.id', 'in', ids).execute()
    },

    async updateQuestion(id, input) {
      const updated = await db
        .updateTable('questions')
        .set({
          updated_at: new Date().toISOString(),
          ...(input.levelId !== undefined ? { level_id: input.levelId } : {}),
          ...(input.skill !== undefined ? { skill: input.skill } : {}),
          ...(input.questionType !== undefined ? { question_type: input.questionType } : {}),
          ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
          ...(input.questionText !== undefined ? { question_text: input.questionText } : {}),
          ...(input.options !== undefined ? { options: serializeOptions(input.options) } : {}),
          ...(input.correctAnswer !== undefined ? { correct_answer: input.correctAnswer } : {}),
          ...(input.points !== undefined ? { points: input.points } : {}),
          ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
          ...(input.sourceReference !== undefined
            ? { source_reference: input.sourceReference }
            : {}),
        })
        .where('id', '=', id)
        .returning('id')
        .executeTakeFirst()
      if (!updated) return undefined
      return requireById(updated.id)
    },

    async deleteQuestion(id) {
      const res = await db.deleteFrom('questions').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },
  }
}
