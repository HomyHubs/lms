import {
  type CreateExamRequest,
  type Exam,
  type ExamAttemptView,
  type ExamQuestionView,
  type LevelCode,
  type QuestionSkill,
  type QuestionType,
} from '@lms/shared'

/**
 * Logic Tao de & Thi online — slice-4. Thuan, khong phu thuoc Fastify de test de.
 * - Sinh de: rut ngau nhien tu ngan hang cau hoi theo Level + Skill (`generatePaper`, rng tiem duoc).
 *   Chong sinh 2 de giong nhau LIEN TIEP cho cung hoc vien (so voi luot gan nhat).
 * - Thi: co deadline (start + duration) de dem nguoc; het gio -> ep nop (tinh cau da lam); nop 1 lan; vao lai sau nop khong lam lai.
 * - Bao mat: view tra ve cho hoc vien KHONG kem dap an dung/giai thich (cham diem o slice-5).
 */

/** De doc tu DB (kem level_code qua join levels). */
export interface ExamRow {
  id: string
  title: string
  level_id: string
  level_code: string
  skill: string
  question_count: number
  duration_minutes: number
  opens_at: Date | string
  closes_at: Date | string
  created_by: string
  created_at: Date | string
}

/** Tham chieu cap do khi resolve ma -> id. */
export interface LevelRef {
  id: string
  code: string
}

/** Cau hoi rut gon dung de dung view cho hoc vien (khong lay correct_answer). */
export interface QuestionLite {
  id: string
  question_text: string
  question_type: string
  skill: string
  points: number
  options: string | null
}

/** Luot lam bai doc tu DB. */
export interface AttemptRow {
  id: string
  exam_id: string
  student_id: string
  question_ids: string
  answers: string | null
  started_at: Date | string
  deadline_at: Date | string
  submitted_at: Date | string | null
}

export interface CreateExamFields {
  title: string
  levelId: string
  skill: QuestionSkill
  questionCount: number
  durationMinutes: number
  opensAt: string
  closesAt: string
  createdBy: string
}

export interface CreateAttemptFields {
  examId: string
  studentId: string
  questionIds: string[]
  startedAt: string
  deadlineAt: string
}

/** Cong ra DB ma service can — cho phep test bang cach tiem gia lap. */
export interface ExamsStore {
  findLevelByCode: (code: string) => Promise<LevelRef | undefined>
  createExam: (input: CreateExamFields) => Promise<ExamRow>
  listExams: () => Promise<ExamRow[]>
  findExamById: (id: string) => Promise<ExamRow | undefined>
  listQuestionIdsFor: (levelId: string, skill: string) => Promise<string[]>
  findQuestionsByIds: (ids: string[]) => Promise<QuestionLite[]>
  findAttempt: (examId: string, studentId: string) => Promise<AttemptRow | undefined>
  findLatestAttemptForStudent: (studentId: string) => Promise<AttemptRow | undefined>
  createAttempt: (input: CreateAttemptFields) => Promise<AttemptRow>
  saveSubmission: (
    attemptId: string,
    answersJson: string,
    submittedAtIso: string,
  ) => Promise<AttemptRow>
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v)
}

function toIso(v: Date | string): string {
  return toDate(v).toISOString()
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

function parseIds(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((x) => String(x))
    return []
  } catch {
    return []
  }
}

function parseAnswers(raw: string | null): Record<string, string> {
  if (raw === null) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) out[k] = String(v)
      return out
    }
    return {}
  } catch {
    return {}
  }
}

function toExam(row: ExamRow): Exam {
  return {
    id: row.id,
    title: row.title,
    levelId: row.level_id,
    levelCode: row.level_code as LevelCode,
    skill: row.skill as QuestionSkill,
    questionCount: row.question_count,
    durationMinutes: row.duration_minutes,
    opensAt: toIso(row.opens_at),
    closesAt: toIso(row.closes_at),
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
  }
}

/** Chi tra field an toan cho hoc vien — KHONG co correct_answer/explanation. */
function toQuestionView(q: QuestionLite): ExamQuestionView {
  return {
    id: q.id,
    questionText: q.question_text,
    questionType: q.question_type as QuestionType,
    skill: q.skill as QuestionSkill,
    points: q.points,
    options: parseOptions(q.options),
  }
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((x, i) => x === sb[i])
}

/**
 * Sinh de: rut ngau nhien `count` cau tu `poolIds`. Neu tap cau trung y het de gan nhat
 * (`previousPaper`) va con to hop khac (pool > count), rut lai de KHONG trung lien tiep.
 * Thuan + rng tiem duoc => test tat dinh.
 */
export function generatePaper(
  poolIds: string[],
  count: number,
  previousPaper: string[] | null,
  rng: () => number = Math.random,
): string[] {
  function draw(): string[] {
    return poolIds
      .map((id) => ({ id, k: rng() }))
      .sort((a, b) => a.k - b.k)
      .slice(0, count)
      .map((x) => x.id)
  }
  let paper = draw()
  if (previousPaper !== null && poolIds.length > count) {
    let tries = 0
    while (sameSet(paper, previousPaper) && tries < 20) {
      paper = draw()
      tries += 1
    }
  }
  return paper
}

async function buildAttemptView(
  store: ExamsStore,
  exam: ExamRow,
  attempt: AttemptRow,
): Promise<ExamAttemptView> {
  const paperIds = parseIds(attempt.question_ids)
  const byId = new Map((await store.findQuestionsByIds(paperIds)).map((q) => [q.id, q]))
  const questions: ExamQuestionView[] = paperIds
    .map((id) => byId.get(id))
    .filter((q): q is QuestionLite => q !== undefined)
    .map(toQuestionView)
  const submittedAt = attempt.submitted_at !== null ? toIso(attempt.submitted_at) : null
  return {
    examId: exam.id,
    examTitle: exam.title,
    durationMinutes: exam.duration_minutes,
    status: submittedAt !== null ? 'submitted' : 'in_progress',
    startedAt: toIso(attempt.started_at),
    deadlineAt: toIso(attempt.deadline_at),
    submittedAt,
    questions,
    answers: parseAnswers(attempt.answers),
  }
}

export async function listExams(store: ExamsStore): Promise<Exam[]> {
  const rows = await store.listExams()
  return rows.map(toExam)
}

export type CreateExamOutcome = { ok: true; exam: Exam } | { ok: false; reason: 'level_not_found' }

export async function createExam(
  store: ExamsStore,
  input: CreateExamRequest,
  createdBy: string,
): Promise<CreateExamOutcome> {
  const level = await store.findLevelByCode(input.level)
  if (!level) return { ok: false, reason: 'level_not_found' }
  const row = await store.createExam({
    title: input.title,
    levelId: level.id,
    skill: input.skill,
    questionCount: input.questionCount,
    durationMinutes: input.durationMinutes,
    opensAt: new Date(input.opensAt).toISOString(),
    closesAt: new Date(input.closesAt).toISOString(),
    createdBy,
  })
  return { ok: true, exam: toExam(row) }
}

export type StartAttemptOutcome =
  | { ok: true; attempt: ExamAttemptView }
  | {
      ok: false
      reason: 'not_found' | 'not_open' | 'closed' | 'already_submitted' | 'not_enough_questions'
    }

/**
 * Bat dau (hoac tiep tuc) mot luot thi. Neu da co luot chua nop -> tra ve luot cu (resume,
 * "1 thiet bi/luot"). Neu da nop -> khong cho lam lai. Chi sinh de moi khi chua co luot nao.
 */
export async function startAttempt(
  store: ExamsStore,
  examId: string,
  studentId: string,
  now: Date,
  rng: () => number = Math.random,
): Promise<StartAttemptOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  const nowMs = now.getTime()
  if (nowMs < toDate(exam.opens_at).getTime()) return { ok: false, reason: 'not_open' }
  if (nowMs > toDate(exam.closes_at).getTime()) return { ok: false, reason: 'closed' }

  const existing = await store.findAttempt(examId, studentId)
  if (existing) {
    if (existing.submitted_at !== null) return { ok: false, reason: 'already_submitted' }
    return { ok: true, attempt: await buildAttemptView(store, exam, existing) }
  }

  const pool = await store.listQuestionIdsFor(exam.level_id, exam.skill)
  if (pool.length < exam.question_count) return { ok: false, reason: 'not_enough_questions' }

  const previous = await store.findLatestAttemptForStudent(studentId)
  const previousPaper = previous ? parseIds(previous.question_ids) : null
  const paper = generatePaper(pool, exam.question_count, previousPaper, rng)

  try {
    const created = await store.createAttempt({
      examId,
      studentId,
      questionIds: paper,
      startedAt: now.toISOString(),
      deadlineAt: new Date(nowMs + exam.duration_minutes * 60_000).toISOString(),
    })
    return { ok: true, attempt: await buildAttemptView(store, exam, created) }
  } catch (err) {
    // Chong dua (N003): hai request dau tien dong thoi cung vuot qua findAttempt o tren
    // roi cung insert -> insert thu hai vi pham unique(exam_id, student_id). Thay vi de
    // loi lot ra thanh 500, doc lai luot da ton tai va resume (hoac bao da nop).
    const raced = await store.findAttempt(examId, studentId)
    if (!raced) throw err
    if (raced.submitted_at !== null) return { ok: false, reason: 'already_submitted' }
    return { ok: true, attempt: await buildAttemptView(store, exam, raced) }
  }
}

export type GetAttemptOutcome =
  | { ok: true; attempt: ExamAttemptView }
  | { ok: false; reason: 'not_found' | 'not_started' }

export async function getAttempt(
  store: ExamsStore,
  examId: string,
  studentId: string,
): Promise<GetAttemptOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  const attempt = await store.findAttempt(examId, studentId)
  if (!attempt) return { ok: false, reason: 'not_started' }
  return { ok: true, attempt: await buildAttemptView(store, exam, attempt) }
}

export type SubmitAttemptOutcome =
  | { ok: true; attempt: ExamAttemptView }
  | { ok: false; reason: 'not_found' | 'not_started' | 'already_submitted' }

/**
 * Nop bai. Het gio (qua deadline) KHONG khoa nop: van chap nhan, chi tinh cac cau da lam.
 * Nop 1 lan: da nop roi -> `already_submitted`. Chi giu dap an cho cau thuoc de.
 */
export async function submitAttempt(
  store: ExamsStore,
  examId: string,
  studentId: string,
  answers: Record<string, string>,
  now: Date,
): Promise<SubmitAttemptOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  const attempt = await store.findAttempt(examId, studentId)
  if (!attempt) return { ok: false, reason: 'not_started' }
  if (attempt.submitted_at !== null) return { ok: false, reason: 'already_submitted' }
  // Het gio giua chung khong khoa nop — ep nop, lam duoc cau nao tinh cau do.
  const paperIds = new Set(parseIds(attempt.question_ids))
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(answers)) {
    if (paperIds.has(k)) filtered[k] = v
  }
  const saved = await store.saveSubmission(attempt.id, JSON.stringify(filtered), now.toISOString())
  return { ok: true, attempt: await buildAttemptView(store, exam, saved) }
}
