import { z } from 'zod'
import { LevelCode } from './catalog.js'
import { QuestionSkill, QuestionType } from './questions.js'

/**
 * Contract Tao de & Thi online — slice-4. Dung chung FE-BE.
 * - Exam: de/blueprint do Admin/Teacher tao (level + skill + so cau + thoi luong + cua so lich).
 * - ExamQuestionView: cau hoi tra ve cho hoc vien — KHONG kem dap an/giai thich (chong lo de).
 * - ExamAttempt: mot luot lam cua hoc vien (de da sinh + dap an + moc thoi gian).
 * Cham diem la slice-5; slice-4 chi sinh de, lam bai, nop bai.
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

/** Tao de (Admin/Teacher). `level` dung ma cap do (starter/mover/flyer). */
export const CreateExamRequest = z
  .object({
    title: Title,
    level: LevelCode,
    skill: QuestionSkill,
    questionCount: QuestionCount,
    durationMinutes: DurationMinutes,
    opensAt: DateTimeString,
    closesAt: DateTimeString,
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

/** Luot lam bai cua hoc vien (view an toan — khong lo dap an cau hoi). */
export const ExamAttemptView = z.object({
  examId: z.string().uuid(),
  examTitle: z.string(),
  durationMinutes: z.number().int(),
  status: ExamAttemptStatus,
  startedAt: z.string(),
  deadlineAt: z.string(),
  submittedAt: z.string().nullable(),
  questions: z.array(ExamQuestionView),
  answers: z.record(z.string(), z.string()),
})
export type ExamAttemptView = z.infer<typeof ExamAttemptView>

export const AttemptResponse = z.object({ attempt: ExamAttemptView })
export type AttemptResponse = z.infer<typeof AttemptResponse>

/** Nop bai: map questionId -> dap an hoc vien chon/nhap. */
export const SubmitExamRequest = z.object({
  answers: z.record(z.string(), z.string()),
})
export type SubmitExamRequest = z.infer<typeof SubmitExamRequest>
