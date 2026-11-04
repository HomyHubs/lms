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

/** Tao de (Admin/Teacher). `level` dung ma cap do (starter/mover/flyer). Nguong bo trong -> theo cap do. */
export const CreateExamRequest = z
  .object({
    title: Title,
    level: LevelCode,
    skill: QuestionSkill,
    questionCount: QuestionCount,
    durationMinutes: DurationMinutes,
    opensAt: DateTimeString,
    closesAt: DateTimeString,
    passPercent: optionalFormNumber(PassPercent),
    maxAttempts: optionalFormNumber(MaxAttempts),
    retakeCooldownMinutes: optionalFormNumber(RetakeCooldownMinutes),
  })
  .refine((v) => Date.parse(v.closesAt) > Date.parse(v.opensAt), {
    message: 'Thoi diem dong phai sau thoi diem mo',
    path: ['closesAt'],
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
 * Ket qua cham. `pending_manual`: de Speaking/Writing chua cham tu dong (TODO(slice-9)).
 * Chi tra diem tong — khong lo dung/sai tung cau vi lan thi lai rut tu cung ngan hang.
 */
export const ExamResult = z.object({
  status: z.enum(['graded', 'pending_manual']),
  score: z.number().int().nullable(),
  maxScore: z.number().int(),
  percent: z.number().nullable(),
  passPercent: z.number().int(),
  passed: z.boolean().nullable(),
  gradedAt: z.string().nullable(),
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

/** Full checkpoint, accepted only before the server deadline and at the expected revision. */
export const SaveExamAnswersRequest = z.object({
  answers: z.record(z.string(), z.string().max(10000)),
  revision: z.number().int().nonnegative(),
}).strict()
export type SaveExamAnswersRequest = z.infer<typeof SaveExamAnswersRequest>
