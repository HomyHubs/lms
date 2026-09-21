import { z } from 'zod'
import { LevelCode } from './catalog.js'

/**
 * Contract Ngan hang cau hoi — slice-3. Dung chung FE-BE.
 * Cau hoi phan loai theo Level (Starter/Mover/Flyer) / Skill / Type / Difficulty.
 * Question Import Schema (Task 1) dung chung cho import thu cong VA import tu AI (slice-4.5).
 */

export const LEVEL_CODES = ['starter', 'mover', 'flyer'] as const
export const QUESTION_SKILLS = ['listening', 'speaking', 'reading', 'writing'] as const
export const QUESTION_TYPES = ['multiple_choice', 'fill_blank', 'matching', 'true_false'] as const
export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

// `LevelCode` (Starter/Mover/Flyer) is defined once in catalog.ts and imported above.
// questions.ts must NOT re-declare it, or the @lms/shared barrel would re-export two
// members named `LevelCode` and fail to build (TS2308).
export const QuestionSkill = z.enum(QUESTION_SKILLS)
export type QuestionSkill = z.infer<typeof QuestionSkill>
export const QuestionType = z.enum(QUESTION_TYPES)
export type QuestionType = z.infer<typeof QuestionType>
export const QuestionDifficulty = z.enum(QUESTION_DIFFICULTIES)
export type QuestionDifficulty = z.infer<typeof QuestionDifficulty>

const QuestionText = z.string().trim().min(1, 'Noi dung cau hoi khong duoc de trong').max(4000)
const CorrectAnswer = z.string().trim().min(1, 'Dap an dung khong duoc de trong').max(2000)
const Options = z.array(z.string().trim().min(1, 'Lua chon khong duoc rong')).max(26)
const Points = z.coerce
  .number({ invalid_type_error: 'Diem phai la so' })
  .int('Diem phai la so nguyen')
  .min(1, 'Diem toi thieu la 1')
  .max(100, 'Diem toi da la 100')
const Explanation = z.string().trim().max(4000)
const SourceReference = z.string().trim().max(500)

/** Cau hoi tra ve cho client (kem levelCode de hien thi). */
export const Question = z.object({
  id: z.string().uuid(),
  levelId: z.string().uuid(),
  levelCode: LevelCode,
  skill: QuestionSkill,
  questionType: QuestionType,
  difficulty: QuestionDifficulty,
  questionText: z.string(),
  options: z.array(z.string()).nullable(),
  correctAnswer: z.string(),
  points: z.number().int(),
  explanation: z.string().nullable(),
  sourceReference: z.string().nullable(),
  createdAt: z.string(),
})
export type Question = z.infer<typeof Question>

/** Tao cau hoi thu cong (UI). `level` dung ma cap do (starter/mover/flyer). */
export const CreateQuestionRequest = z.object({
  level: LevelCode,
  skill: QuestionSkill,
  questionType: QuestionType,
  difficulty: QuestionDifficulty,
  questionText: QuestionText,
  options: Options.optional(),
  correctAnswer: CorrectAnswer,
  points: Points.optional(),
  explanation: Explanation.optional(),
  sourceReference: SourceReference.optional(),
})
export type CreateQuestionRequest = z.infer<typeof CreateQuestionRequest>

export const UpdateQuestionRequest = z
  .object({
    level: LevelCode.optional(),
    skill: QuestionSkill.optional(),
    questionType: QuestionType.optional(),
    difficulty: QuestionDifficulty.optional(),
    questionText: QuestionText.optional(),
    options: Options.nullable().optional(),
    correctAnswer: CorrectAnswer.optional(),
    points: Points.optional(),
    explanation: Explanation.nullable().optional(),
    sourceReference: SourceReference.nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Can it nhat mot truong de cap nhat',
  })
export type UpdateQuestionRequest = z.infer<typeof UpdateQuestionRequest>

/** Ten cot chuan cua Question Import Schema (dung lam header CSV). */
export const IMPORT_COLUMNS = [
  'level',
  'skill',
  'question_type',
  'difficulty',
  'question_text',
  'options',
  'correct_answer',
  'points',
  'explanation',
  'source_reference',
] as const

/** Cell CSV -> string[]: tach theo '|'. Chuoi rong -> undefined. */
const OptionsFromCell = z.preprocess((v) => {
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (trimmed === '') return undefined
    return trimmed
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  return v
}, Options.optional())

/** Cell chuoi rong -> undefined (de field optional khong bat loi). */
function emptyToUndefined(v: unknown): unknown {
  return typeof v === 'string' && v.trim() === '' ? undefined : v
}

const PointsFromCell = z.preprocess(emptyToUndefined, Points.optional())
const ExplanationFromCell = z.preprocess(emptyToUndefined, Explanation.optional())
const SourceReferenceFromCell = z.preprocess(emptyToUndefined, SourceReference.optional())

/**
 * Question Import Schema chuan (Task 1). Field theo dung ten cot spec.
 * `.strict()`: sai ten field / thua cot bi tu choi ro rang -> khong import du lieu sai dinh dang.
 */
export const QuestionImportRow = z
  .object({
    level: LevelCode,
    skill: QuestionSkill,
    question_type: QuestionType,
    difficulty: QuestionDifficulty,
    question_text: QuestionText,
    options: OptionsFromCell,
    correct_answer: CorrectAnswer,
    points: PointsFromCell,
    explanation: ExplanationFromCell,
    source_reference: SourceReferenceFromCell,
  })
  .strict()
export type QuestionImportRow = z.infer<typeof QuestionImportRow>

export const ImportQuestionsRequest = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, 'Khong co dong nao de import'),
})
export type ImportQuestionsRequest = z.infer<typeof ImportQuestionsRequest>

export const QuestionImportError = z.object({
  row: z.number().int(),
  field: z.string(),
  message: z.string(),
})
export type QuestionImportError = z.infer<typeof QuestionImportError>

export const ImportQuestionsResult = z.object({
  imported: z.number().int(),
  questions: z.array(Question),
})
export type ImportQuestionsResult = z.infer<typeof ImportQuestionsResult>

export const QuestionList = z.object({ questions: z.array(Question) })
export type QuestionList = z.infer<typeof QuestionList>
export const QuestionResponse = z.object({ question: Question })
export type QuestionResponse = z.infer<typeof QuestionResponse>
