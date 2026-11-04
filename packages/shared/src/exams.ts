import { z } from 'zod'
import { LevelCode } from './catalog.js'
import { QuestionSkill, QuestionType } from './questions.js'

/**
 * Contract Tao de & Thi online — slice-4. Dung chung FE-BE.
 * - Exam: de/blueprint do Admin/Teacher tao (level + skill + so cau + thoi luong + cua so lich).
 * - ExamQuestionView: cau hoi tra ve cho hoc vien — KHONG kem dap an/giai thich (chong lo de).
 * - ExamAttempt: mot luot lam cua hoc vien (de da sinh + dap an + moc thoi gian).
 * Slice-5: cham tu dong tu snapshot dong bang, pass/fail theo nguong, thi lai co gioi han + thoi gian cho.
 */

const Title = z.string().trim().min(1, 'Ten de khong duoc de trong').max(200)

const QuestionCount = z.coerce
  .number({ invalid_type_error: 'So cau phai la so' })
  .int('So cau phai la so nguyen')
  .min(1, 'It nhat 1 cau')
  .max(200, 'Toi da 200 cau')

const DurationMinutes = z.coerce
  .number({ invalid_type_error: 'Thoi luong phai la so' })
  .int('Thoi luong phai la so nguyen')
  .min(1, 'Thoi luong toi thieu 1 phut')
  .max(600, 'Thoi luong toi da 600 phut')

/** Chuoi thoi diem (ISO hoac datetime-local); phai parse duoc thanh Date hop le. */
const DateTimeString = z
  .string()
  .trim()
  .min(1, 'Thoi diem khong duoc de trong')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Thoi diem khong hop le')

const PassPercent = z.coerce
  .number({ invalid_type_error: 'Nguong dat phai la so' })
  .int('Nguong dat phai la so nguyen')
  .min(0, 'Nguong dat tu 0 den 100')
  .max(100, 'Nguong dat tu 0 den 100')

const MaxAttempts = z.coerce
  .number({ invalid_type_error: 'So lan thi toi da phai la so' })
  .int('So lan thi toi da phai la so nguyen')
  .min(1, 'It nhat 1 lan thi')
  .max(20, 'Toi da 20 lan thi')

const RetakeCooldownMinutes = z.coerce
  .number({ invalid_type_error: 'Thoi gian cho phai la so' })
  .int('Thoi gian cho phai la so nguyen')
  .min(0, 'Thoi gian cho khong am')
  .max(43_200, 'Thoi gian cho toi da 30 ngay')

/** Form fields left blank mean "inherit the level policy". */
function optionalFormNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional())
}

/** Nguong cham diem + thi lai mac dinh cua mot cap do (Admin cau hinh). */
export const GradingPolicy = z.object({
  levelCode: LevelCode,
  passPercent: z.number().int(),
  maxAttempts: z.number().int(),
  retakeCooldownMinutes: z.number().int(),
})
export type GradingPolicy = z.infer<typeof GradingPolicy>

export const GradingPolicyList = z.object({ policies: z.array(GradingPolicy) })
export type GradingPolicyList = z.infer<typeof GradingPolicyList>

export const UpdateGradingPolicyRequest = z
  .object({
    passPercent: PassPercent,
    maxAttempts: MaxAttempts,
    retakeCooldownMinutes: RetakeCooldownMinutes,
  })
  .strict()
export type UpdateGradingPolicyRequest = z.infer<typeof UpdateGradingPolicyRequest>

/** slice-11a: `random` draws from the bank per attempt; `fixed_set` serves published exam sets. */
export const ExamMode = z.enum(['random', 'fixed_set'])
export type ExamMode = z.infer<typeof ExamMode>

/** Fixed-set retake: same questions reshuffled (default) or the next unused linked set. */
export const RetakeStrategy = z.enum(['same_set_shuffled', 'alternate_sets'])
export type RetakeStrategy = z.infer<typeof RetakeStrategy>

export const EXAM_MAX_LINKED_SETS = 10

const ExamBlueprintFields = {
  title: Title,
  level: LevelCode,
  skill: QuestionSkill,
  durationMinutes: DurationMinutes,
  opensAt: DateTimeString,
  closesAt: DateTimeString,
  passPercent: optionalFormNumber(PassPercent),
  maxAttempts: optionalFormNumber(MaxAttempts),
  retakeCooldownMinutes: optionalFormNumber(RetakeCooldownMinutes),
}

const RandomExamRequest = z.object({
  mode: z.literal('random'),
  ...ExamBlueprintFields,
  questionCount: QuestionCount,
})

const FixedSetExamRequest = z.object({
  mode: z.literal('fixed_set'),
  ...ExamBlueprintFields,
  examSetIds: z.array(z.string().uuid('Bo de khong hop le'))
    .min(1, 'Chon it nhat 1 bo de')
    .max(EXAM_MAX_LINKED_SETS, `Toi da ${EXAM_MAX_LINKED_SETS} bo de`),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  retakeStrategy: RetakeStrategy.default('same_set_shuffled'),
})

/**
 * Tao de (Admin/Teacher). `level` dung ma cap do (starter/mover/flyer). Nguong bo trong -> theo cap do.
 * Thieu `mode` -> `random` (client slice-4 cu van hop le).
 */
export const CreateExamRequest = z
  .preprocess(
    (v) => (v !== null && typeof v === 'object' && (v as { mode?: unknown }).mode === undefined ? { ...v, mode: 'random' } : v),
    z.discriminatedUnion('mode', [RandomExamRequest, FixedSetExamRequest]),
  )
  .superRefine((v, ctx) => {
    if (Date.parse(v.closesAt) <= Date.parse(v.opensAt)) {
      ctx.addIssue({ code: 'custom', message: 'Thoi diem dong phai sau thoi diem mo', path: ['closesAt'] })
    }
    if (v.mode !== 'fixed_set') return
    if (new Set(v.examSetIds).size !== v.examSetIds.length) {
      ctx.addIssue({ code: 'custom', message: 'Moi bo de chi chon 1 lan', path: ['examSetIds'] })
    }
    if (v.retakeStrategy === 'alternate_sets' && v.examSetIds.length < 2) {
      ctx.addIssue({ code: 'custom', message: 'Doi bo de khi thi lai can it nhat 2 bo de', path: ['examSetIds'] })
    }
  })
export type CreateExamRequest = z.infer<typeof CreateExamRequest>

/** De tra ve cho client (kem levelCode de hien thi). */
export const Exam = z.object({
  id: z.string().uuid(),
  title: z.string(),
  levelId: z.string().uuid(),
  levelCode: LevelCode,
  skill: QuestionSkill,
  questionCount: z.number().int(),
  durationMinutes: z.number().int(),
  opensAt: z.string(),
  closesAt: z.string(),
  passPercent: z.number().int(),
  maxAttempts: z.number().int(),
  retakeCooldownMinutes: z.number().int(),
  mode: ExamMode.default('random'),
  /** Linked sets in serving order (fixed_set only). */
  examSetIds: z.array(z.string().uuid()).default([]),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  retakeStrategy: RetakeStrategy.default('same_set_shuffled'),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
})
export type Exam = z.infer<typeof Exam>

export const ExamList = z.object({ exams: z.array(Exam) })
export type ExamList = z.infer<typeof ExamList>
export const ExamResponse = z.object({ exam: Exam })
export type ExamResponse = z.infer<typeof ExamResponse>

/** Cau hoi hien thi cho hoc vien khi thi — KHONG chua correctAnswer/explanation. */
export const ExamQuestionView = z.object({
  id: z.string().uuid(),
  questionText: z.string(),
  questionType: QuestionType,
  skill: QuestionSkill,
  points: z.number().int(),
  options: z.array(z.string()).nullable(),
})
export type ExamQuestionView = z.infer<typeof ExamQuestionView>

/** Trang thai luot lam bai. */
export const ExamAttemptStatus = z.enum(['in_progress', 'submitted'])
export type ExamAttemptStatus = z.infer<typeof ExamAttemptStatus>

/**
 * Ket qua cham. `pending_manual`: de Speaking/Writing cho giao vien cham tay (slice-9a).
 * Chi tra diem tong — khong lo dung/sai tung cau vi lan thi lai rut tu cung ngan hang.
 * `feedback`: nhan xet cua giao vien khi cham tay.
 */
export const ExamResult = z.object({
  status: z.enum(['graded', 'pending_manual']),
  score: z.number().int().nullable(),
  maxScore: z.number().int(),
  percent: z.number().nullable(),
  passPercent: z.number().int(),
  passed: z.boolean().nullable(),
  gradedAt: z.string().nullable(),
  feedback: z.string().nullable().default(null),
})
export type ExamResult = z.infer<typeof ExamResult>

/**
 * Quyen thi lai sau khi truot. `available`: duoc bat dau lan `nextAttemptNumber` tu `availableAt`.
 * `reason` khi khong con thi lai: da dat, het luot, de da dong, hoac cho cham tay.
 */
export const RetakeStatus = z.object({
  available: z.boolean(),
  reason: z.enum(['retake_ready', 'passed', 'limit_reached', 'exam_closed', 'pending_manual']),
  nextAttemptNumber: z.number().int().nullable(),
  availableAt: z.string().nullable(),
  attemptsUsed: z.number().int(),
  maxAttempts: z.number().int(),
})
export type RetakeStatus = z.infer<typeof RetakeStatus>

/** Luot lam bai cua hoc vien (view an toan — khong lo dap an cau hoi). */
export const ExamAttemptView = z.object({
  examId: z.string().uuid(),
  examTitle: z.string(),
  attemptNumber: z.number().int().min(1).default(1),
  durationMinutes: z.number().int(),
  status: ExamAttemptStatus,
  startedAt: z.string(),
  deadlineAt: z.string(),
  submittedAt: z.string().nullable(),
  revision: z.number().int().nonnegative().default(0),
  questions: z.array(ExamQuestionView),
  answers: z.record(z.string(), z.string()),
  result: ExamResult.nullable().default(null),
  retake: RetakeStatus.nullable().default(null),
})
export type ExamAttemptView = z.infer<typeof ExamAttemptView>

/** Mot dong lich su luot thi (audit): de nao, diem, thoi gian, lan thu may. */
export const ExamAttemptRecord = z.object({
  attemptId: z.string().uuid(),
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  attemptNumber: z.number().int(),
  questionIds: z.array(z.string()),
  /** Set that served a fixed_set attempt; null for random papers. */
  examSetId: z.string().uuid().nullable().default(null),
  startedAt: z.string(),
  deadlineAt: z.string(),
  submittedAt: z.string().nullable(),
  result: ExamResult.nullable(),
})
export type ExamAttemptRecord = z.infer<typeof ExamAttemptRecord>

export const ExamAttemptHistory = z.object({ attempts: z.array(ExamAttemptRecord) })
export type ExamAttemptHistory = z.infer<typeof ExamAttemptHistory>

export const AttemptResponse = z.object({ attempt: ExamAttemptView })
export type AttemptResponse = z.infer<typeof AttemptResponse>

/** Nop bai: map questionId -> dap an hoc vien chon/nhap. */
export const SubmitExamRequest = z.object({
  answers: z.record(z.string(), z.string().max(10000)),
}).strict()
export type SubmitExamRequest = z.infer<typeof SubmitExamRequest>

/** slice-9a: a submitted Speaking/Writing attempt waiting for (or holding) a manual grade. */
export const ManualGradingItem = z.object({
  attemptId: z.string().uuid(),
  examId: z.string().uuid(),
  examTitle: z.string(),
  levelCode: LevelCode,
  skill: QuestionSkill,
  studentId: z.string().uuid(),
  studentPhone: z.string(),
  attemptNumber: z.number().int(),
  submittedAt: z.string(),
  maxScore: z.number().int(),
})
export type ManualGradingItem = z.infer<typeof ManualGradingItem>

export const ManualGradingQueue = z.object({ attempts: z.array(ManualGradingItem) })
export type ManualGradingQueue = z.infer<typeof ManualGradingQueue>

export const ManualGradingQuestion = ExamQuestionView.extend({ answer: z.string().nullable() })
export type ManualGradingQuestion = z.infer<typeof ManualGradingQuestion>

export const ManualGradingAttempt = ManualGradingItem.extend({
  passPercent: z.number().int(),
  questions: z.array(ManualGradingQuestion),
  result: ExamResult.nullable(),
})
export type ManualGradingAttempt = z.infer<typeof ManualGradingAttempt>

export const ManualGradingAttemptResponse = z.object({ attempt: ManualGradingAttempt })
export type ManualGradingAttemptResponse = z.infer<typeof ManualGradingAttemptResponse>

/** Points per question (every question of the paper, 0..points) + optional feedback for the student. */
export const GradeAttemptRequest = z.object({
  scores: z.record(z.string(), z.number().int('Diem phai la so nguyen').min(0, 'Diem khong duoc am')),
  feedback: z.string().trim().max(2000, 'Nhan xet toi da 2000 ky tu').default(''),
}).strict()
export type GradeAttemptRequest = z.infer<typeof GradeAttemptRequest>

/** Full checkpoint, accepted only before the server deadline and at the expected revision. */
export const SaveExamAnswersRequest = z.object({
  answers: z.record(z.string(), z.string().max(10000)),
  revision: z.number().int().nonnegative(),
}).strict()
export type SaveExamAnswersRequest = z.infer<typeof SaveExamAnswersRequest>
