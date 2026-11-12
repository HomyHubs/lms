import { z } from 'zod'
import { LevelCode } from './catalog.js'
import {
  IMPORT_COLUMNS,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  QuestionDifficulty,
  QuestionImportRow,
  QuestionSkill,
  QuestionType,
} from './questions.js'

/**
 * slice-4.5 contract: build a prompt for an external AI tool, paste its output back,
 * review it, then save approved rows to the question bank (ADR 0005).
 * The system never calls an AI provider itself.
 */

export const MAX_AI_SAMPLES = 5
export const MAX_AI_QUESTION_COUNT = 50
export const MAX_AI_RESULT_ROWS = 100

export const AI_REQUEST_STATUSES = ['draft', 'imported', 'reviewed', 'saved_to_bank'] as const
export const AiRequestStatus = z.enum(AI_REQUEST_STATUSES)
export type AiRequestStatus = z.infer<typeof AiRequestStatus>

export const AI_ITEM_STATUSES = ['pending', 'approved', 'rejected', 'saved'] as const
export const AiItemStatus = z.enum(AI_ITEM_STATUSES)
export type AiItemStatus = z.infer<typeof AiItemStatus>

export const CreateAiRequestRequest = z.object({
  level: LevelCode,
  skill: QuestionSkill,
  questionType: QuestionType.optional(),
  difficulty: QuestionDifficulty.optional(),
  count: z.coerce
    .number({ invalid_type_error: 'So luong phai la so' })
    .int('So luong phai la so nguyen')
    .min(1, 'So luong toi thieu la 1')
    .max(MAX_AI_QUESTION_COUNT, `So luong toi da la ${MAX_AI_QUESTION_COUNT}`),
  sampleQuestionIds: z
    .array(z.string().uuid('Ma cau hoi mau khong hop le'))
    .max(MAX_AI_SAMPLES, `Toi da ${MAX_AI_SAMPLES} cau hoi mau`)
    .default([]),
  notes: z.string().trim().max(1000, 'Ghi chu toi da 1000 ky tu').optional(),
})
export type CreateAiRequestRequest = z.input<typeof CreateAiRequestRequest>

export const AiGenerationRequest = z.object({
  id: z.string().uuid(),
  createdBy: z.string().uuid(),
  levelCode: LevelCode,
  skill: QuestionSkill,
  questionType: QuestionType.nullable(),
  difficulty: QuestionDifficulty.nullable(),
  count: z.number().int(),
  sampleQuestionIds: z.array(z.string()),
  prompt: z.string(),
  status: AiRequestStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AiGenerationRequest = z.infer<typeof AiGenerationRequest>

export const AiGeneratedItem = z.object({
  id: z.string().uuid(),
  position: z.number().int(),
  row: QuestionImportRow,
  status: AiItemStatus,
  questionId: z.string().uuid().nullable(),
})
export type AiGeneratedItem = z.infer<typeof AiGeneratedItem>

export const AiRequestDetail = z.object({
  request: AiGenerationRequest,
  items: z.array(AiGeneratedItem),
})
export type AiRequestDetail = z.infer<typeof AiRequestDetail>

export const AiRequestList = z.object({ requests: z.array(AiGenerationRequest) })
export type AiRequestList = z.infer<typeof AiRequestList>

export const SubmitAiResultsRequest = z.object({
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, 'Khong co dong nao de import')
    .max(MAX_AI_RESULT_ROWS, `Toi da ${MAX_AI_RESULT_ROWS} dong`),
})
export type SubmitAiResultsRequest = z.infer<typeof SubmitAiResultsRequest>

export const AiItemReviewStatus = z.enum(['pending', 'approved', 'rejected'])
export type AiItemReviewStatus = z.infer<typeof AiItemReviewStatus>

export const UpdateAiItemRequest = z
  .object({
    row: z.record(z.string(), z.unknown()).optional(),
    status: AiItemReviewStatus.optional(),
  })
  .refine((v) => v.row !== undefined || v.status !== undefined, {
    message: 'Can sua noi dung hoac trang thai',
  })
export type UpdateAiItemRequest = z.infer<typeof UpdateAiItemRequest>

export const SaveAiRequestResult = AiRequestDetail.extend({ saved: z.number().int() })
export type SaveAiRequestResult = z.infer<typeof SaveAiRequestResult>

/** A bank question shown to the AI as a style reference (Question Import Schema field names). */
export interface AiPromptSample {
  question_type: QuestionType
  difficulty: QuestionDifficulty
  question_text: string
  options: string[] | null
  correct_answer: string
  points: number
  explanation: string | null
}

export interface AiPromptInput {
  level: LevelCode
  skill: QuestionSkill
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  count: number
  samples: AiPromptSample[]
  notes?: string
}

const LEVEL_LABELS: Record<LevelCode, string> = {
  starter: 'Pre A1 Starters',
  mover: 'A1 Movers',
  flyer: 'A2 Flyers',
}

function sampleAsImportRow(level: LevelCode, skill: QuestionSkill, s: AiPromptSample) {
  return {
    level,
    skill,
    question_type: s.question_type,
    difficulty: s.difficulty,
    question_text: s.question_text,
    ...(s.options ? { options: s.options } : {}),
    correct_answer: s.correct_answer,
    points: s.points,
    ...(s.explanation ? { explanation: s.explanation } : {}),
  }
}

/**
 * Builds the full prompt that the user copies into an external AI tool. The output format
 * section mirrors the strict Question Import Schema so the pasted answer validates as-is.
 */
export function buildAiPrompt(input: AiPromptInput): string {
  const { level, skill, count } = input
  const typeLine = input.questionType
    ? `"${input.questionType}" for every question`
    : `any of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}`
  const difficultyLine = input.difficulty
    ? `"${input.difficulty}" for every question`
    : `a mix of ${QUESTION_DIFFICULTIES.map((d) => `"${d}"`).join(', ')}`

  const lines = [
    'You are an experienced writer of Cambridge English Young Learners (YLE) test questions.',
    `Write exactly ${count} NEW ${skill} questions for the ${LEVEL_LABELS[level]} level.`,
    `- question_type: ${typeLine}`,
    `- difficulty: ${difficultyLine}`,
    '- Vocabulary and grammar must match the level; questions must be original (do not copy the samples).',
    '',
    'OUTPUT FORMAT (mandatory):',
    'Return ONLY a JSON array, without markdown code fences or any text before/after it.',
    `Each element is an object whose keys are a subset of: ${IMPORT_COLUMNS.join(', ')}. No other keys.`,
    `- "level": always "${level}"`,
    `- "skill": always "${skill}"`,
    `- "question_type": one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}`,
    `- "difficulty": one of ${QUESTION_DIFFICULTIES.map((d) => `"${d}"`).join(', ')}`,
    '- "question_text": the question shown to the student (required, max 4000 characters)',
    '- "options": array of answer choices; required for multiple_choice (3-4 choices) and true_false (["True", "False"]); omit for fill_blank',
    '- "correct_answer": required; for multiple_choice/true_false it must be exactly one of the options',
    '- "points": integer from 1 to 100 (use 1 unless the question is longer)',
    '- "explanation": optional short explanation of the answer',
    '- "source_reference": optional short note on the source/topic',
  ]

  if (input.samples.length > 0) {
    const samples = input.samples.map((s) => sampleAsImportRow(level, skill, s))
    lines.push('', 'Reference questions from our bank (style and format only):', JSON.stringify(samples, null, 2))
  }
  if (input.notes) lines.push('', `Additional requirements: ${input.notes}`)
  return lines.join('\n')
}
