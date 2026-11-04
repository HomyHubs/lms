import type { ColumnType, Generated } from 'kysely'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

/** Cot do Postgres sinh gia tri (default) va app khong ghi tay khi insert. */
type Timestamp = ColumnType<Date, string | undefined, string | undefined>

/** Bang `users` — Task 2 (slice-0): dang nhap SDT + mat khau. */
export interface UsersTable {
  id: Generated<string>
  phone_number: string
  // Task 3 (slice-0): email de nhan OTP dat lai mat khau (nullable, unique khi co).
  email: ColumnType<string | null, string | null | undefined, string | null>
  password_hash: string
  // TODO(slice-1): thay `role` text bang lien ket Branch/role day du.
  role: ColumnType<string, string | undefined, string>
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `sessions` — co che Session opaque (luu SHA-256 hash cua token phien). */
export interface SessionsTable {
  token_hash: string
  user_id: string
  created_at: Timestamp
  expires_at: ColumnType<Date, string, string>
}

/** Bang `password_reset_otps` — Task 3 (slice-0): quen mat khau qua OTP Email. */
export interface PasswordResetOtpsTable {
  id: Generated<string>
  user_id: string
  // Luu SHA-256 hash cua ma OTP (khong luu ma tho).
  otp_hash: string
  // Slice-2: kenh da gui OTP (email | whatsapp | telegram). DB default 'email' (migration additive).
  channel: ColumnType<string, string | undefined, string>
  attempts: ColumnType<number, number | undefined, number>
  consumed_at: ColumnType<Date | null, string | null | undefined, string | null>
  created_at: Timestamp
  expires_at: ColumnType<Date, string, string>
}

/** Bang `centers` — slice-1 Task 2: trung tam (1 Center co nhieu Branch). */
export interface CentersTable {
  id: Generated<string>
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `branches` — slice-1 Task 2: co so truc thuoc mot Center. */
export interface BranchesTable {
  id: Generated<string>
  center_id: string
  address: ColumnType<string | null, string | null | undefined, string | null>
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `levels` — slice-1 Task 3: cap do co dinh (Starter/Mover/Flyer), seed san. */
export interface LevelsTable {
  id: Generated<string>
  code: string
  name: string
}

/** Bang `courses` — slice-1 Task 3: khoa hoc thuoc mot Level. */
export interface CoursesTable {
  id: Generated<string>
  level_id: string
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `classes` — slice-1 Task 3: lop hoc thuoc mot Course va gan dung 1 Branch. */
export interface ClassesTable {
  id: Generated<string>
  course_id: string
  branch_id: string
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `enrollments` — slice-1 Task 3: ghi danh hoc vien vao lop (unique class+student). */
export interface EnrollmentsTable {
  id: Generated<string>
  class_id: string
  student_id: string
  created_at: Timestamp
}

/** Bang `user_branches` — slice-1 Task 4: gan Branch cho User (branch-scoped access). */
export interface UserBranchesTable {
  user_id: string
  branch_id: string
  created_at: Timestamp
}

/** Bang `questions` — slice-3: ngan hang cau hoi theo Level/Skill/Type/Difficulty. */
export interface QuestionsTable {
  id: Generated<string>
  level_id: string
  skill: string
  question_type: string
  difficulty: string
  question_text: string
  // Chuoi JSON string[] (cau nhieu lua chon); null neu khong co.
  options: ColumnType<string | null, string | null | undefined, string | null>
  correct_answer: string
  points: ColumnType<number, number | undefined, number>
  explanation: ColumnType<string | null, string | null | undefined, string | null>
  source_reference: ColumnType<string | null, string | null | undefined, string | null>
  // slice-4.5: 'manual' | 'ai_generated' (DB default 'manual').
  source: ColumnType<string, string | undefined, string>
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `exams` — slice-4: de thi (blueprint) do Admin/Teacher tao. */
export interface ExamsTable {
  id: Generated<string>
  title: string
  level_id: string
  skill: string
  // So cau rut ngau nhien tu ngan hang + thoi luong lam bai (phut).
  question_count: number
  duration_minutes: number
  // Cua so lich thi (mo/dong). Insert bang chuoi ISO; doc ra Date.
  opens_at: ColumnType<Date, string, string>
  closes_at: ColumnType<Date, string, string>
  // Slice-5: nguong dat (%) + so lan thi toi da + thoi gian cho thi lai, chot luc tao de.
  pass_percent: ColumnType<number, number | undefined, number>
  max_attempts: ColumnType<number, number | undefined, number>
  retake_cooldown_minutes: ColumnType<number, number | undefined, number>
  // slice-11a: random bank draw vs fixed exam sets (ADR 0011).
  mode: ColumnType<string, string | undefined, string>
  exam_set_id: ColumnType<string | null, string | null | undefined, string | null>
  shuffle_questions: ColumnType<boolean, boolean | undefined, boolean>
  shuffle_options: ColumnType<boolean, boolean | undefined, boolean>
  retake_strategy: ColumnType<string, string | undefined, string>
  created_by: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Table `exam_sets` — slice-11a: fixed exam set (draft -> published -> archived). */
export interface ExamSetsTable {
  id: Generated<string>
  title: string
  level_id: string
  skill: string
  description: ColumnType<string | null, string | null | undefined, string | null>
  status: ColumnType<string, string | undefined, string>
  created_by: string
  created_at: Timestamp
  updated_at: Timestamp
  published_at: ColumnType<Date | null, string | null | undefined, string | null>
}

/** Table `exam_set_items` — slice-11a: ordered questions of a set. */
export interface ExamSetItemsTable {
  exam_set_id: string
  position: number
  question_id: string
}

/** Table `exam_set_links` — slice-11a: sets an exam serves, in order. */
export interface ExamSetLinksTable {
  exam_id: string
  exam_set_id: string
  position: number
}

/** Bang `exam_grading_policies` — slice-5: chinh sach cham/thi lai mac dinh theo cap do. */
export interface ExamGradingPoliciesTable {
  level_id: string
  pass_percent: ColumnType<number, number | undefined, number>
  max_attempts: ColumnType<number, number | undefined, number>
  retake_cooldown_minutes: ColumnType<number, number | undefined, number>
  updated_at: Timestamp
}

/** Bang `exam_attempts` — slice-4: mot luot lam bai cua hoc vien; slice-5: nhieu lan thi. */
export interface ExamAttemptsTable {
  id: Generated<string>
  exam_id: string
  student_id: string
  // De da sinh: chuoi JSON string[] cac question id (giu thu tu).
  question_ids: string
  question_snapshot: ColumnType<string | null, string | null | undefined, string | null>
  session_key: ColumnType<string | null, string | null | undefined, string | null>
  answer_revision: Generated<number>
  // Dap an hoc vien: chuoi JSON object; null cho toi khi nop.
  answers: ColumnType<string | null, string | null | undefined, string | null>
  started_at: ColumnType<Date, string | undefined, string>
  deadline_at: ColumnType<Date, string, string>
  submitted_at: ColumnType<Date | null, string | null | undefined, string | null>
  // Slice-5: lan thi thu may (unique exam+student+attempt_number) + ket qua cham (ghi 1 lan).
  attempt_number: ColumnType<number, number | undefined, never>
  score: ColumnType<number | null, number | null | undefined, number | null>
  max_score: ColumnType<number | null, number | null | undefined, number | null>
  passed: ColumnType<boolean | null, boolean | null | undefined, boolean | null>
  graded_at: ColumnType<Date | null, string | null | undefined, string | null>
  grading_detail: ColumnType<string | null, string | null | undefined, string | null>
  // slice-9a: manual Speaking/Writing grade (part of the immutable grade).
  graded_by: ColumnType<string | null, string | null | undefined, string | null>
  grader_feedback: ColumnType<string | null, string | null | undefined, string | null>
  // slice-11a: set that served the attempt (null for random papers).
  exam_set_id: ColumnType<string | null, string | null | undefined, string | null>
}

/** Table `class_teachers` — slice-6: teachers assigned to a class (attendance RBAC). */
export interface ClassTeachersTable {
  class_id: string
  teacher_id: string
  created_at: Timestamp
}

/** Table `class_sessions` — slice-6: one session of a class (date + local start time). */
export interface ClassSessionsTable {
  id: Generated<string>
  class_id: string
  // Postgres `date`/`time`: written as 'YYYY-MM-DD' / 'HH:MM'; read back via to_char in the store.
  session_date: string
  starts_at: ColumnType<string, string | undefined, string>
  topic: ColumnType<string | null, string | null | undefined, string | null>
  created_by: string
  created_at: Timestamp
  updated_at: Timestamp
  // slice-8: planned vs actual schedule (teaching hours).
  duration_minutes: ColumnType<number, number | undefined, number>
  planned_teacher_id: ColumnType<string | null, string | null | undefined, string | null>
  makeup_for_session_id: ColumnType<string | null, string | null | undefined, string | null>
  cancelled_at: ColumnType<Date | null, string | null | undefined, string | null>
}

/** Table `staff_shifts` — slice-8: one check-in/check-out of a staff member or teacher. */
export interface StaffShiftsTable {
  id: Generated<string>
  user_id: string
  check_in_at: Timestamp
  check_out_at: ColumnType<Date | null, string | null | undefined, string | null>
}

/** Table `attendance_records` — slice-6: status of one student in one session. */
export interface AttendanceRecordsTable {
  session_id: string
  student_id: string
  status: string
  note: ColumnType<string | null, string | null | undefined, string | null>
  recorded_by: string
  recorded_at: Timestamp
}

/** Table `ai_generation_requests` — slice-4.5: a prompt generated for an external AI tool. */
export interface AiGenerationRequestsTable {
  id: Generated<string>
  created_by: string
  level_id: string
  skill: string
  question_type: string | null
  difficulty: string | null
  question_count: number
  // JSON string[] of sample question ids (display only).
  sample_question_ids: ColumnType<string, string | undefined, string>
  prompt: string
  status: ColumnType<string, string | undefined, string>
  created_at: Timestamp
  updated_at: Timestamp
}

/** Table `ai_generated_items` — slice-4.5: one pasted AI row in the review queue. */
export interface AiGeneratedItemsTable {
  id: Generated<string>
  request_id: string
  position: number
  // JSON object in Question Import Schema shape (validated before insert).
  payload: string
  status: ColumnType<string, string | undefined, string>
  question_id: ColumnType<string | null, string | null | undefined, string | null>
  created_at: Timestamp
  updated_at: Timestamp
}

/** Table `student_grading_policies` — slice-7: classification weights + bands per level. */
export interface StudentGradingPoliciesTable {
  level_id: string
  exam_weight: ColumnType<number, number | undefined, number>
  attendance_weight: ColumnType<number, number | undefined, number>
  excellent_min: ColumnType<number, number | undefined, number>
  good_min: ColumnType<number, number | undefined, number>
  average_min: ColumnType<number, number | undefined, number>
  updated_at: Timestamp
}

/** Table `notifications` — slice-9b: in-app notification + outbox row for the external channel. */
export interface NotificationsTable {
  id: Generated<string>
  user_id: string
  kind: string
  title: string
  body: string
  dedupe_key: string
  channel: string
  delivery_status: ColumnType<string, string | undefined, string>
  delivery_attempts: ColumnType<number, number | undefined, number>
  last_error: ColumnType<string | null, string | null | undefined, string | null>
  sent_at: ColumnType<Date | null, string | null | undefined, string | null>
  read_at: ColumnType<Date | null, string | null | undefined, string | null>
  created_at: Timestamp
}

export interface Database {
  users: UsersTable
  sessions: SessionsTable
  password_reset_otps: PasswordResetOtpsTable
  centers: CentersTable
  branches: BranchesTable
  levels: LevelsTable
  courses: CoursesTable
  classes: ClassesTable
  enrollments: EnrollmentsTable
  user_branches: UserBranchesTable
  questions: QuestionsTable
  exams: ExamsTable
  exam_sets: ExamSetsTable
  exam_set_items: ExamSetItemsTable
  exam_set_links: ExamSetLinksTable
  exam_attempts: ExamAttemptsTable
  exam_grading_policies: ExamGradingPoliciesTable
  class_teachers: ClassTeachersTable
  class_sessions: ClassSessionsTable
  attendance_records: AttendanceRecordsTable
  ai_generation_requests: AiGenerationRequestsTable
  ai_generated_items: AiGeneratedItemsTable
  student_grading_policies: StudentGradingPoliciesTable
  staff_shifts: StaffShiftsTable
  notifications: NotificationsTable
}

export function createDb(connectionString: string): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString, max: 10 }),
  })
  return new Kysely<Database>({ dialect })
}

export type AppDb = Kysely<Database>
