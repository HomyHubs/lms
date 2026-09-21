import {
  QuestionImportRow,
  type CreateQuestionRequest,
  type ImportQuestionsResult,
  type LevelCode,
  type Question,
  type QuestionDifficulty,
  type QuestionImportError,
  type QuestionSkill,
  type QuestionType,
  type UpdateQuestionRequest,
} from '@lms/shared'

/**
 * Logic Ngan hang cau hoi — slice-3. Thuan, khong phu thuoc Fastify de test de.
 * `options` luu duoi dang chuoi JSON (string[]) o tang du lieu; service tu ma hoa/giai ma.
 * Level nhan bang ma cap do (LevelCode) va duoc resolve sang level_id qua store.
 */

/** Ban ghi cau hoi doc tu DB (kem level_code qua join levels). */
export interface QuestionRow {
  id: string
  level_id: string
  level_code: string
  skill: string
  question_type: string
  difficulty: string
  question_text: string
  options: string | null
  correct_answer: string
  points: number
  explanation: string | null
  source_reference: string | null
  created_at: Date | string
}

/** Tham chieu cap do (levels) khi resolve ma -> id. */
export interface LevelRef {
  id: string
  code: string
}

export interface CreateQuestionFields {
  levelId: string
  skill: QuestionSkill
  questionType: QuestionType
  difficulty: QuestionDifficulty
  questionText: string
  options: string[] | null
  correctAnswer: string
  points?: number
  explanation: string | null
  sourceReference: string | null
}

export interface UpdateQuestionFields {
  levelId?: string
  skill?: QuestionSkill
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  questionText?: string
  options?: string[] | null
  correctAnswer?: string
  points?: number
  explanation?: string | null
  sourceReference?: string | null
}

/** Cong ra DB ma service can — cho phep test bang cach tiem gia lap. */
export interface QuestionsStore {
  listQuestions: () => Promise<QuestionRow[]>
  findQuestionById: (id: string) => Promise<QuestionRow | undefined>
  findLevelByCode: (code: string) => Promise<LevelRef | undefined>
  createQuestion: (input: CreateQuestionFields) => Promise<QuestionRow>
  createQuestions: (inputs: CreateQuestionFields[]) => Promise<QuestionRow[]>
  updateQuestion: (id: string, input: UpdateQuestionFields) => Promise<QuestionRow | undefined>
  deleteQuestion: (id: string) => Promise<boolean>
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

/** `options` luu chuoi JSON string[]; giai ma an toan (loi -> null). */
function parseOptions(raw: string | null): string[] | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((x) => String(x))
    return null
  } catch {
    return null
  }
}

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    levelId: row.level_id,
    levelCode: row.level_code as LevelCode,
    skill: row.skill as QuestionSkill,
    questionType: row.question_type as QuestionType,
    difficulty: row.difficulty as QuestionDifficulty,
    questionText: row.question_text,
    options: parseOptions(row.options),
    correctAnswer: row.correct_answer,
    points: row.points,
    explanation: row.explanation,
    sourceReference: row.source_reference,
    createdAt: toIso(row.created_at),
  }
}

export async function listQuestions(store: QuestionsStore): Promise<Question[]> {
  const rows = await store.listQuestions()
  return rows.map(toQuestion)
}

export type CreateQuestionOutcome =
  | { ok: true; question: Question }
  | { ok: false; reason: 'level_not_found' }

export async function createQuestion(
  store: QuestionsStore,
  input: CreateQuestionRequest,
): Promise<CreateQuestionOutcome> {
  const level = await store.findLevelByCode(input.level)
  if (!level) return { ok: false, reason: 'level_not_found' }
  const row = await store.createQuestion({
    levelId: level.id,
    skill: input.skill,
    questionType: input.questionType,
    difficulty: input.difficulty,
    questionText: input.questionText,
    options: input.options ?? null,
    correctAnswer: input.correctAnswer,
    points: input.points,
    explanation: input.explanation ?? null,
    sourceReference: input.sourceReference ?? null,
  })
  return { ok: true, question: toQuestion(row) }
}

export type UpdateQuestionOutcome =
  | { ok: true; question: Question }
  | { ok: false; reason: 'not_found' | 'level_not_found' }

export async function updateQuestion(
  store: QuestionsStore,
  id: string,
  input: UpdateQuestionRequest,
): Promise<UpdateQuestionOutcome> {
  const fields: UpdateQuestionFields = {}
  if (input.level !== undefined) {
    const level = await store.findLevelByCode(input.level)
    if (!level) return { ok: false, reason: 'level_not_found' }
    fields.levelId = level.id
  }
  if (input.skill !== undefined) fields.skill = input.skill
  if (input.questionType !== undefined) fields.questionType = input.questionType
  if (input.difficulty !== undefined) fields.difficulty = input.difficulty
  if (input.questionText !== undefined) fields.questionText = input.questionText
  if (input.options !== undefined) fields.options = input.options
  if (input.correctAnswer !== undefined) fields.correctAnswer = input.correctAnswer
  if (input.points !== undefined) fields.points = input.points
  if (input.explanation !== undefined) fields.explanation = input.explanation
  if (input.sourceReference !== undefined) fields.sourceReference = input.sourceReference

  const row = await store.updateQuestion(id, fields)
  return row ? { ok: true, question: toQuestion(row) } : { ok: false, reason: 'not_found' }
}

export async function deleteQuestion(store: QuestionsStore, id: string): Promise<boolean> {
  return store.deleteQuestion(id)
}

export type ImportQuestionsOutcome =
  | { ok: true; result: ImportQuestionsResult }
  | { ok: false; errors: QuestionImportError[] }

/**
 * Import hang loat theo Question Import Schema. Validate THUC (strict) tung dong:
 * chi can MOT dong sai field/enum -> tra loi ro rang va KHONG luu bat ky dong nao (all-or-nothing).
 */
export async function importQuestions(
  store: QuestionsStore,
  rows: unknown[],
): Promise<ImportQuestionsOutcome> {
  const errors: QuestionImportError[] = []
  const valid: CreateQuestionFields[] = []
  // Cache ma cap do -> id de tranh truy van lap.
  const levelCache = new Map<string, string>()

  for (let i = 0; i < rows.length; i += 1) {
    const parsed = QuestionImportRow.safeParse(rows[i])
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      errors.push({
        row: i + 1,
        field: issue && issue.path.length > 0 ? issue.path.join('.') : '(row)',
        message: issue?.message ?? 'Du lieu khong hop le',
      })
      continue
    }
    const data = parsed.data
    let levelId = levelCache.get(data.level)
    if (levelId === undefined) {
      const level = await store.findLevelByCode(data.level)
      if (!level) {
        errors.push({ row: i + 1, field: 'level', message: `Cap do khong ton tai: ${data.level}` })
        continue
      }
      levelId = level.id
      levelCache.set(data.level, levelId)
    }
    valid.push({
      levelId,
      skill: data.skill,
      questionType: data.question_type,
      difficulty: data.difficulty,
      questionText: data.question_text,
      options: data.options ?? null,
      correctAnswer: data.correct_answer,
      points: data.points,
      explanation: data.explanation ?? null,
      sourceReference: data.source_reference ?? null,
    })
  }

  if (errors.length > 0) return { ok: false, errors }

  const created = await store.createQuestions(valid)
  return { ok: true, result: { imported: created.length, questions: created.map(toQuestion) } }
}
