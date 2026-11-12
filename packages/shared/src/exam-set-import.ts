import { z } from 'zod'
import { LevelCode } from './catalog.js'
import { EXAM_SET_MAX_ITEMS } from './exam-sets.js'
import { QUESTION_MEDIA_MAX } from './media.js'
import { QuestionDifficulty, QuestionSkill, QuestionType } from './questions.js'

/**
 * Contract Import bo de tu Word/Excel — slice-11b. Hai buoc: preview (doc file, chi luu hinh nhung thanh
 * media asset — slice-12.2) roi commit (validate lai, tao bo de draft + gan hinh trong 1 transaction).
 * Dinh dang file: docs/feat/exam-import-format.md.
 */

export const EXAM_IMPORT_FORMATS = ['docx', 'xlsx', 'csv'] as const
export const ExamImportFormat = z.enum(EXAM_IMPORT_FORMATS)
export type ExamImportFormat = z.infer<typeof ExamImportFormat>

/** Upload limit for one import file. */
export const EXAM_IMPORT_MAX_BYTES = 10 * 1024 * 1024

const Title = z.string().trim().min(1, 'Ten bo de khong duoc de trong').max(200, 'Ten bo de toi da 200 ky tu')

/** Query string of `POST /exam-sets/import/preview`; the body is the raw file (application/octet-stream). */
export const ExamSetImportPreviewQuery = z.object({
  title: Title,
  level: LevelCode,
  skill: QuestionSkill,
  fileName: z.string().trim().min(1, 'Thieu ten file').max(255),
})
export type ExamSetImportPreviewQuery = z.infer<typeof ExamSetImportPreviewQuery>

export const ExamSetImportItem = z.object({
  order: z.number().int().min(1),
  questionType: QuestionType,
  difficulty: QuestionDifficulty,
  questionText: z.string(),
  options: z.array(z.string()).nullable(),
  correctAnswer: z.string(),
  points: z.number().int(),
  explanation: z.string().nullable(),
  warnings: z.array(z.string()),
  /** Embedded images found in the block (docx relationship ids). */
  imageRefs: z.array(z.string()),
  /** Uploaded embedded images (media ids) that commit attaches to the question stem. */
  mediaIds: z.array(z.string()),
})
export type ExamSetImportItem = z.infer<typeof ExamSetImportItem>

/** `block` = question number (Word), `row` = real spreadsheet row; one of them is set for item problems. */
export const ExamSetImportIssue = z.object({
  block: z.number().int().nullable(),
  row: z.number().int().nullable(),
  field: z.string(),
  message: z.string(),
})
export type ExamSetImportIssue = z.infer<typeof ExamSetImportIssue>

export const ExamSetImportPreview = z.object({
  title: z.string(),
  level: LevelCode,
  skill: QuestionSkill,
  format: ExamImportFormat,
  items: z.array(ExamSetImportItem),
  errors: z.array(ExamSetImportIssue),
  warnings: z.array(z.string()),
})
export type ExamSetImportPreview = z.infer<typeof ExamSetImportPreview>

export const CommitExamSetImportItem = z.object({
  questionType: QuestionType,
  difficulty: QuestionDifficulty.default('medium'),
  questionText: z.string(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string(),
  points: z.number().int().optional(),
  explanation: z.string().nullable().optional(),
  mediaIds: z.array(z.string().uuid('Hinh anh khong hop le'))
    .max(QUESTION_MEDIA_MAX, `Toi da ${QUESTION_MEDIA_MAX} anh moi cau`).optional(),
})
export type CommitExamSetImportItem = z.infer<typeof CommitExamSetImportItem>

/** The confirmed preview; the server validates every item again before writing. */
export const CommitExamSetImportRequest = z.object({
  title: Title,
  level: LevelCode,
  skill: QuestionSkill,
  items: z.array(CommitExamSetImportItem)
    .min(1, 'Khong co cau hoi nao de import')
    .max(EXAM_SET_MAX_ITEMS, `Toi da ${EXAM_SET_MAX_ITEMS} cau`),
})
export type CommitExamSetImportRequest = z.infer<typeof CommitExamSetImportRequest>
