import { z } from 'zod'
import { LevelCode } from './catalog.js'
import { Question, QuestionDifficulty, QuestionSkill } from './questions.js'

/**
 * Contract Bo de co dinh — slice-11a (ADR 0011). Chi Admin/Teacher doc/ghi; hoc vien chi thay cau hoi
 * qua luot thi trong cua so thi. Bo de `published` bat bien; chi duoc chuyen sang `archived`.
 */

export const EXAM_SET_STATUSES = ['draft', 'published', 'archived'] as const
export const ExamSetStatus = z.enum(EXAM_SET_STATUSES)
export type ExamSetStatus = z.infer<typeof ExamSetStatus>

/** Max questions in one set; matches the exam question limit. */
export const EXAM_SET_MAX_ITEMS = 200

const Title = z.string().trim().min(1, 'Ten bo de khong duoc de trong').max(200, 'Ten bo de toi da 200 ky tu')
const Description = z.string().trim().max(2000, 'Mo ta toi da 2000 ky tu')

export const ExamSet = z.object({
  id: z.string().uuid(),
  title: z.string(),
  levelId: z.string().uuid(),
  levelCode: LevelCode,
  skill: QuestionSkill,
  description: z.string().nullable(),
  status: ExamSetStatus,
  itemCount: z.number().int(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
})
export type ExamSet = z.infer<typeof ExamSet>

/** Set + its ordered questions WITH answers — manager-only view. */
export const ExamSetDetail = ExamSet.extend({ items: z.array(Question) })
export type ExamSetDetail = z.infer<typeof ExamSetDetail>

export const ExamSetList = z.object({ examSets: z.array(ExamSet) })
export type ExamSetList = z.infer<typeof ExamSetList>
export const ExamSetResponse = z.object({ examSet: ExamSetDetail })
export type ExamSetResponse = z.infer<typeof ExamSetResponse>

export const ExamSetListQuery = z.object({
  level: LevelCode.optional(),
  skill: QuestionSkill.optional(),
  status: ExamSetStatus.optional(),
})
export type ExamSetListQuery = z.infer<typeof ExamSetListQuery>

export const CreateExamSetRequest = z.object({
  title: Title,
  level: LevelCode,
  skill: QuestionSkill,
  description: Description.optional(),
}).strict()
export type CreateExamSetRequest = z.infer<typeof CreateExamSetRequest>

export const UpdateExamSetRequest = z.object({
  title: Title.optional(),
  description: Description.nullable().optional(),
}).strict().refine((v) => v.title !== undefined || v.description !== undefined, {
  message: 'Can it nhat mot truong de cap nhat',
})
export type UpdateExamSetRequest = z.infer<typeof UpdateExamSetRequest>

/** Replaces the whole ordered list (position = index + 1). */
export const ReplaceExamSetItemsRequest = z.object({
  questionIds: z.array(z.string().uuid()).max(EXAM_SET_MAX_ITEMS, `Toi da ${EXAM_SET_MAX_ITEMS} cau`)
    .refine((ids) => new Set(ids).size === ids.length, 'Mot cau hoi chi xuat hien 1 lan trong bo de'),
}).strict()
export type ReplaceExamSetItemsRequest = z.infer<typeof ReplaceExamSetItemsRequest>

/** Inline authoring supports objective types only; fill_blank/matching come from the bank. */
export const EXAM_SET_AUTHORING_TYPES = ['multiple_choice', 'true_false'] as const

export const AddExamSetQuestionRequest = z.object({
  questionType: z.enum(EXAM_SET_AUTHORING_TYPES),
  difficulty: QuestionDifficulty.default('medium'),
  questionText: z.string().trim().min(1, 'Noi dung cau hoi khong duoc de trong').max(4000),
  options: z.array(z.string().trim().min(1, 'Lua chon khong duoc rong')).max(26).optional(),
  correctAnswer: z.string().trim().min(1, 'Dap an dung khong duoc de trong').max(2000),
  points: z.coerce.number().int('Diem phai la so nguyen').min(1, 'Diem toi thieu la 1').max(100).optional(),
  explanation: z.string().trim().max(4000).optional(),
}).strict()
export type AddExamSetQuestionRequest = z.infer<typeof AddExamSetQuestionRequest>

/** Why a set cannot be published; `position` is 1-based, null for set-level problems. */
export const ExamSetPublishIssue = z.object({
  position: z.number().int().nullable(),
  questionId: z.string().uuid().nullable(),
  message: z.string(),
})
export type ExamSetPublishIssue = z.infer<typeof ExamSetPublishIssue>
