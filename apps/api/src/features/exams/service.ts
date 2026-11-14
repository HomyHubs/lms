import {
  type CreateExamRequest,
  type Exam,
  type ExamAttemptRecord,
  type ExamAttemptView,
  type ExamQuestionView,
  type ExamMode,
  type ExamResult,
  type GradeAttemptRequest,
  type GradingPolicy,
  type LevelCode,
  type ManualGradingAttempt,
  type ManualGradingItem,
  type QuestionSkill,
  type QuestionType,
  type RetakeStatus,
  type RetakeStrategy,
  type UpdateGradingPolicyRequest,
  mediaUrl,
} from '@lms/shared'

/**
 * Logic Tao de & Thi online — slice-4. Thuan, khong phu thuoc Fastify de test de.
 * - Sinh de: rut ngau nhien tu ngan hang cau hoi theo Level + Skill (`generatePaper`, rng tiem duoc).
 *   Chong sinh 2 de giong nhau LIEN TIEP cho cung hoc vien (so voi luot gan nhat).
 * - Thi: co deadline (start + duration) de dem nguoc; het gio -> ep nop (tinh cau da lam); nop 1 lan; vao lai sau nop khong lam lai.
 * - Bao mat: view tra ve cho hoc vien KHONG kem dap an dung/giai thich.
 * Slice-5 (ADR 0003): cham tu dong tu snapshot dong bang khi luot da chot; pass/fail theo nguong
 * cua de (sao tu chinh sach cap do); truot -> thi lai voi de moi (gioi han so lan + thoi gian cho);
 * moi luot duoc giu lai lam lich su audit. Speaking/Writing -> giao vien cham tay (slice-9a, ADR 0009).
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
  pass_percent: number
  max_attempts: number
  retake_cooldown_minutes: number
  created_by: string
  created_at: Date | string
  // slice-11a (ADR 0011); absent on legacy fakes = random mode.
  mode?: string
  exam_set_id?: string | null
  exam_set_ids?: string[]
  shuffle_questions?: boolean
  shuffle_options?: boolean
  retake_strategy?: string
  // slice-14: lop ap dung (cung cap do); absent/rong = ap cho toan cap do.
  exam_class_ids?: string[]
}

/** slice-14: lop (cung cap do) co the gan cho de — kem co so de kiem tra branch-scope. */
export interface ClassRef {
  id: string
  branchId: string
}

/** Exam set as seen by exam creation (slice-11a). */
export interface ExamSetRef {
  id: string
  status: string
  level_id: string
  skill: string
  item_count: number
}

/** Chinh sach cham + thi lai mac dinh cua mot cap do. */
export interface GradingPolicyRow {
  level_id: string
  level_code: string
  pass_percent: number
  max_attempts: number
  retake_cooldown_minutes: number
}

export interface GradingPolicyFields {
  passPercent: number
  maxAttempts: number
  retakeCooldownMinutes: number
}

/** Mac dinh khi cap do chua co dong chinh sach (khop default cua migration). */
export const DEFAULT_GRADING_POLICY: GradingPolicyFields = {
  passPercent: 50,
  maxAttempts: 3,
  retakeCooldownMinutes: 0,
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
  correct_answer?: string
  explanation?: string | null
  /** slice-12: image links frozen into the snapshot; absent when the question has none. */
  media?: QuestionMediaRef[]
}

export interface QuestionMediaRef {
  mediaId: string
  slot: 'stem' | 'option'
  optionIndex: number | null
}

/** Luot lam bai doc tu DB. */
export interface AttemptRow {
  id: string
  exam_id: string
  student_id: string
  question_ids: string
  question_snapshot?: string | null
  session_key?: string | null
  answer_revision?: number
  answers: string | null
  started_at: Date | string
  deadline_at: Date | string
  submitted_at: Date | string | null
  attempt_number?: number
  score?: number | null
  max_score?: number | null
  passed?: boolean | null
  graded_at?: Date | string | null
  grading_detail?: string | null
  graded_by?: string | null
  grader_feedback?: string | null
  exam_set_id?: string | null
}

/** Attempt joined with its exam and student for the manual grading screens (slice-9a). */
export interface GradingRow extends AttemptRow {
  exam_title: string
  level_code: string
  skill: string
  pass_percent: number
  student_phone: string
  // slice-23: ma hoc vien (khop import diem la khoa chinh; SDT chi la fallback). null khi hoc vien chua co ma.
  student_code: string | null
  student_first_name: string | null
  student_last_name: string | null
}

/** Ket qua cham duoc ghi 1 lan (DB trigger chan sua sau khi graded_at co gia tri). */
export interface GradeFields {
  score: number
  maxScore: number
  passed: boolean
  gradedAt: string
  detailJson: string
  /** Manual grades only (slice-9a). */
  gradedBy?: string
  feedback?: string | null
}

export interface CreateExamFields {
  title: string
  levelId: string
  skill: QuestionSkill
  questionCount: number
  durationMinutes: number
  opensAt: string
  closesAt: string
  passPercent: number
  maxAttempts: number
  retakeCooldownMinutes: number
  createdBy: string
  mode?: ExamMode
  /** fixed_set: serving order; the first one is exams.exam_set_id. */
  examSetIds?: string[]
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  retakeStrategy?: RetakeStrategy
  /** slice-14: lop ap dung (cung cap do); rong = ap cho toan cap do. */
  classIds?: string[]
}

export interface CreateAttemptFields {
  examId: string
  studentId: string
  questionIds: string[]
  questionSnapshot: QuestionLite[]
  attemptNumber: number
  sessionKey: string
  startedAt: string
  deadlineAt: string
  examSetId?: string | null
}

/** Cong ra DB ma service can — cho phep test bang cach tiem gia lap. */
export interface ExamsStore {
  findLevelByCode: (code: string) => Promise<LevelRef | undefined>
  createExam: (input: CreateExamFields) => Promise<ExamRow>
  listExams: () => Promise<ExamRow[]>
  findExamById: (id: string) => Promise<ExamRow | undefined>
  listQuestionIdsFor: (levelId: string, skill: string) => Promise<string[]>
  findQuestionsByIds: (ids: string[]) => Promise<QuestionLite[]>
  findExamSetRefs: (ids: string[]) => Promise<ExamSetRef[]>
  /** Questions of a set in `position` order, with answers (snapshot source). */
  listExamSetQuestions: (examSetId: string) => Promise<QuestionLite[]>
  /** Luot MOI NHAT (attempt_number lon nhat) cua hoc vien cho de. */
  findAttempt: (examId: string, studentId: string) => Promise<AttemptRow | undefined>
  /** Moi luot cua de (loc theo hoc vien neu co), sap theo hoc vien roi attempt_number tang dan. */
  listAttempts: (examId: string, studentId?: string) => Promise<AttemptRow[]>
  findLatestAttemptForStudent: (studentId: string) => Promise<AttemptRow | undefined>
  createAttempt: (input: CreateAttemptFields) => Promise<AttemptRow>
  claimSession: (attemptId: string, sessionKey: string) => Promise<boolean>
  saveAnswers: (attemptId: string, answersJson: string, revision: number, nowIso: string) => Promise<AttemptRow | undefined>
  saveSubmission: (
    attemptId: string,
    answersJson: string,
    submittedAtIso: string,
  ) => Promise<AttemptRow>
  /** Ghi diem chi khi luot da nop va chua cham; tra ve dong hien tai (idempotent khi dua). */
  saveGrade: (attemptId: string, grade: GradeFields) => Promise<AttemptRow>
  /** Ungraded attempts of `skills` exams that are submitted or past their deadline, oldest first. */
  listUngradedAttempts: (skills: readonly string[], nowIso: string) => Promise<GradingRow[]>
  findGradingRow: (attemptId: string) => Promise<GradingRow | undefined>
  /** SDT cua hoc vien ghi danh lop thuoc cac co so da cho (branch-scope import diem — fallback khop SDT). */
  listStudentPhonesInBranches: (branchIds: string[]) => Promise<string[]>
  /** slice-23: ma hoc vien (student_code) cua hoc vien ghi danh lop thuoc cac co so da cho (branch-scope khop theo ma). */
  listStudentCodesInBranches: (branchIds: string[]) => Promise<string[]>
  /** slice-14: cac lop (cung cap do) co the gan cho de — kem co so de kiem tra branch-scope. */
  listClassRefsForLevel: (levelId: string) => Promise<ClassRef[]>
  /** slice-14: SDT hoc vien ghi danh CAC LOP da cho (gioi han cohort import diem theo lop). */
  listStudentPhonesInClasses: (classIds: string[]) => Promise<string[]>
  findGradingPolicy: (levelId: string) => Promise<GradingPolicyRow | undefined>
  listGradingPolicies: () => Promise<GradingPolicyRow[]>
  upsertGradingPolicy: (levelId: string, fields: GradingPolicyFields) => Promise<GradingPolicyRow>
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
    passPercent: row.pass_percent,
    maxAttempts: row.max_attempts,
    retakeCooldownMinutes: row.retake_cooldown_minutes,
    mode: row.mode === 'fixed_set' ? 'fixed_set' : 'random',
    examSetIds: row.exam_set_ids ?? [],
    classIds: row.exam_class_ids ?? [],
    shuffleQuestions: row.shuffle_questions ?? false,
    shuffleOptions: row.shuffle_options ?? false,
    retakeStrategy: row.retake_strategy === 'alternate_sets' ? 'alternate_sets' : 'same_set_shuffled',
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
    ...imageViews(q.media),
  }
}

function imageViews(media: QuestionMediaRef[] | undefined): Pick<ExamQuestionView, 'stemImages' | 'optionImages'> {
  if (!media || media.length === 0) return {}
  const optionImages: Record<string, string> = {}
  for (const m of media) if (m.slot === 'option' && m.optionIndex !== null) optionImages[String(m.optionIndex)] = mediaUrl(m.mediaId)
  return { stemImages: media.filter((m) => m.slot === 'stem').map((m) => mediaUrl(m.mediaId)), optionImages }
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
  variants: ReadonlyMap<string, string> = new Map(),
): string[] | null {
  const key = (id: string) => variants.get(id) ?? id
  const unique = [...new Map(poolIds.map((id) => [key(id), id])).values()]
  if (!Number.isInteger(count) || count < 1 || unique.length < count) return null
  const shuffled = unique.map((id) => ({ id, k: rng() })).sort((a, b) => a.k - b.k)
  const paper = shuffled.slice(0, count).map((x) => x.id)
  if (previousPaper && sameSet(paper.map(key), previousPaper.map(key))) {
    const replacement = shuffled.slice(count).find((x) => !paper.map(key).includes(key(x.id)))
    if (!replacement) return null
    paper[count - 1] = replacement.id
  }
  return paper
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  return items.map((item) => ({ item, k: rng() })).sort((a, b) => a.k - b.k).map((e) => e.item)
}

/** Reorders multiple-choice options; a letter answer is rewritten to its option text so grading follows. */
function withShuffledOptions(q: QuestionLite, rng: () => number): QuestionLite {
  const options = parseOptions(q.options)
  if (q.question_type !== 'multiple_choice' || !options || options.length < 2) return q
  const answer = normalizeAnswer(q.correct_answer ?? '')
  const letterIndex = answer.length === 1 ? LETTERS.indexOf(answer) : -1
  const correct = letterIndex >= 0 && letterIndex < options.length ? options[letterIndex]! : q.correct_answer
  const order = shuffled(options.map((_, index) => index), rng)
  const media = q.media?.map((m) => (m.optionIndex === null ? m : { ...m, optionIndex: order.indexOf(m.optionIndex) }))
  return { ...q, options: JSON.stringify(order.map((index) => options[index]!)), correct_answer: correct, ...(media ? { media } : {}) }
}

export interface PaperArrangement {
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

/**
 * Fixed-set paper (ADR 0011): set order, optionally shuffled. A retake of the same set must not repeat
 * the previous order, so an identical order is rotated by one.
 */
export function arrangeFixedPaper(
  items: readonly QuestionLite[],
  arrangement: PaperArrangement,
  previousOrder: readonly string[] | null,
  rng: () => number = Math.random,
): QuestionLite[] {
  let order = arrangement.shuffleQuestions ? shuffled(items, rng) : [...items]
  if (previousOrder && order.length > 1 && order.every((q, i) => q.id === previousOrder[i])) {
    order = [...order.slice(1), order[0]!]
  }
  return arrangement.shuffleOptions ? order.map((q) => withShuffledOptions(q, rng)) : order
}

/** Exact content variants only; the bank has no semantic variant-family contract. */
export function variantKey(q: QuestionLite): string {
  return JSON.stringify([q.question_text, q.question_type, q.skill, parseOptions(q.options), q.points])
}

function snapshot(attempt: AttemptRow): QuestionLite[] {
  if (!attempt.question_snapshot) throw new Error('Exam snapshot unavailable; owner recovery required')
  const rows = JSON.parse(attempt.question_snapshot) as QuestionLite[]
  const ids = parseIds(attempt.question_ids)
  if (!Array.isArray(rows) || rows.length !== ids.length || rows.some((q, i) => q.id !== ids[i])) {
    throw new Error('Incomplete exam snapshot; owner recovery required')
  }
  return rows
}

/** Ky nang khong cham tu dong — giao vien cham tay qua `gradeManually` (slice-9a). */
const MANUAL_SKILLS: ReadonlySet<string> = new Set(['speaking', 'writing'])

export function isManualSkill(skill: string): boolean {
  return MANUAL_SKILLS.has(skill)
}

/** So sanh dap an: bo khoang trang thua, NFC, khong phan biet hoa thuong. */
export function normalizeAnswer(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/**
 * Tap dap an chap nhan cho mot cau. Cau co lua chon: chap nhan ca chu cai (A/B/...) lan noi dung
 * lua chon tuong ung. Dien khuyet: nhieu dap an dung ngan cach boi `|`.
 */
export function acceptedAnswers(q: QuestionLite): Set<string> {
  const raw = q.correct_answer ?? ''
  const alternatives = q.question_type === 'fill_blank' ? raw.split('|') : [raw]
  const accepted = new Set(alternatives.map(normalizeAnswer).filter((a) => a.length > 0))
  const options = (parseOptions(q.options) ?? []).map(normalizeAnswer)
  for (const answer of [...accepted]) {
    const letterIndex = answer.length === 1 ? LETTERS.indexOf(answer) : -1
    if (letterIndex >= 0 && letterIndex < options.length) accepted.add(options[letterIndex]!)
    const optionIndex = options.indexOf(answer)
    if (optionIndex >= 0 && optionIndex < LETTERS.length) accepted.add(LETTERS[optionIndex]!)
  }
  return accepted
}

export interface GradedQuestion {
  questionId: string
  answer: string | null
  correct: boolean
  points: number
  awarded: number
}

export interface GradeOutcome {
  score: number
  maxScore: number
  passed: boolean
  detail: GradedQuestion[]
}

/**
 * Cham thuan tu snapshot dong bang (dap an dung tai thoi diem sinh de). Dat khi
 * diem*100 >= nguong%*diem toi da (so nguyen, khong sai so lam tron).
 */
export function gradeAttempt(
  questions: QuestionLite[],
  answers: Record<string, string>,
  passPercent: number,
): GradeOutcome {
  const detail = questions.map((q): GradedQuestion => {
    const answer = answers[q.id] ?? null
    const correct = answer !== null && acceptedAnswers(q).has(normalizeAnswer(answer))
    return { questionId: q.id, answer, correct, points: q.points, awarded: correct ? q.points : 0 }
  })
  const score = detail.reduce((sum, d) => sum + d.awarded, 0)
  const maxScore = detail.reduce((sum, d) => sum + d.points, 0)
  return { score, maxScore, passed: score * 100 >= passPercent * maxScore, detail }
}

/** Cham lazily khi luot da chot; ghi 1 lan. Ky nang cham tay -> giu nguyen (chua cham). */
async function ensureGraded(store: ExamsStore, exam: ExamRow, attempt: AttemptRow, now: Date): Promise<AttemptRow> {
  if (attempt.submitted_at === null || attempt.graded_at || isManualSkill(exam.skill)) return attempt
  const outcome = gradeAttempt(snapshot(attempt), parseAnswers(attempt.answers), exam.pass_percent)
  return store.saveGrade(attempt.id, {
    score: outcome.score,
    maxScore: outcome.maxScore,
    passed: outcome.passed,
    gradedAt: now.toISOString(),
    detailJson: JSON.stringify(outcome.detail),
  })
}

function toResult(exam: Pick<ExamRow, 'pass_percent' | 'skill'>, attempt: AttemptRow): ExamResult | null {
  if (attempt.submitted_at === null) return null
  if (attempt.graded_at) {
    const score = attempt.score ?? 0
    const maxScore = attempt.max_score ?? 0
    return {
      status: 'graded',
      score,
      maxScore,
      percent: maxScore > 0 ? Math.round((score * 10_000) / maxScore) / 100 : 0,
      passPercent: exam.pass_percent,
      passed: attempt.passed ?? false,
      gradedAt: toIso(attempt.graded_at),
      feedback: attempt.grader_feedback ?? null,
    }
  }
  if (!isManualSkill(exam.skill)) return null
  return {
    status: 'pending_manual',
    score: null,
    maxScore: snapshot(attempt).reduce((sum, q) => sum + q.points, 0),
    percent: null,
    passPercent: exam.pass_percent,
    passed: null,
    gradedAt: null,
    feedback: null,
  }
}

/** Quyen thi lai tinh tu luot moi nhat — khong luu trang thai rieng. */
export function retakeStatus(exam: ExamRow, attempt: AttemptRow, result: ExamResult | null, now: Date): RetakeStatus | null {
  if (result === null) return null
  const attemptsUsed = attempt.attempt_number ?? 1
  const base = { attemptsUsed, maxAttempts: exam.max_attempts }
  const closed = (reason: RetakeStatus['reason']): RetakeStatus => ({
    ...base, available: false, reason, nextAttemptNumber: null, availableAt: null,
  })
  if (result.status === 'pending_manual') return closed('pending_manual')
  if (result.passed) return closed('passed')
  if (attemptsUsed >= exam.max_attempts) return closed('limit_reached')
  const submittedMs = toDate(attempt.submitted_at ?? attempt.deadline_at).getTime()
  const availableMs = submittedMs + exam.retake_cooldown_minutes * 60_000
  const closesMs = toDate(exam.closes_at).getTime()
  if (availableMs > closesMs || now.getTime() > closesMs) return closed('exam_closed')
  return {
    ...base,
    available: true,
    reason: 'retake_ready',
    nextAttemptNumber: attemptsUsed + 1,
    availableAt: new Date(availableMs).toISOString(),
  }
}

async function buildAttemptView(
  store: ExamsStore,
  exam: ExamRow,
  attempt: AttemptRow,
  now: Date = new Date(),
): Promise<ExamAttemptView> {
  const questions: ExamQuestionView[] = snapshot(attempt).map(toQuestionView)
  const graded = await ensureGraded(store, exam, attempt, now)
  const result = toResult(exam, graded)
  const submittedAt = graded.submitted_at !== null ? toIso(graded.submitted_at) : null
  return {
    examId: exam.id,
    examTitle: exam.title,
    attemptNumber: graded.attempt_number ?? 1,
    durationMinutes: exam.duration_minutes,
    status: submittedAt !== null ? 'submitted' : 'in_progress',
    startedAt: toIso(attempt.started_at),
    deadlineAt: toIso(attempt.deadline_at),
    submittedAt,
    revision: graded.answer_revision ?? 0,
    questions,
    answers: parseAnswers(graded.answers),
    result,
    retake: retakeStatus(exam, graded, result, now),
  }
}

export async function listExams(store: ExamsStore): Promise<Exam[]> {
  const rows = await store.listExams()
  return rows.map(toExam)
}

/** De dang mo tai `now`: opens_at <= now <= closes_at (dung cho danh sach cua hoc vien). */
export function isExamOpenAt(exam: Pick<ExamRow, 'opens_at' | 'closes_at'>, now: Date): boolean {
  const t = now.getTime()
  return t >= toDate(exam.opens_at).getTime() && t <= toDate(exam.closes_at).getTime()
}

/**
 * Danh sach de cho HOC VIEN (N002): chi tra de dang trong cua so lich (opens_at..closes_at).
 * Quan tri (Admin/Teacher/Staff) van xem toan bo qua `listExams`. Gan de theo lop -> slice sau.
 */
export async function listOpenExams(store: ExamsStore, now: Date): Promise<Exam[]> {
  const rows = await store.listExams()
  return rows.filter((row) => isExamOpenAt(row, now)).map(toExam)
}

export type CreateExamOutcome =
  | { ok: true; exam: Exam }
  | {
      ok: false
      reason:
        | 'level_not_found'
        | 'exam_set_not_found'
        | 'exam_set_not_published'
        | 'exam_set_mismatch'
        | 'class_level_mismatch'
    }

type FixedSetsOutcome =
  | { ok: true; questionCount: number }
  | { ok: false; reason: 'exam_set_not_found' | 'exam_set_not_published' | 'exam_set_mismatch' }

/** Every linked set must be published and match the exam level/skill; the first one sizes the exam. */
async function resolveFixedSets(store: ExamsStore, ids: string[], levelId: string, skill: string): Promise<FixedSetsOutcome> {
  const refs = new Map((await store.findExamSetRefs(ids)).map((ref) => [ref.id, ref]))
  let questionCount = 0
  for (const [index, id] of ids.entries()) {
    const ref = refs.get(id)
    if (!ref) return { ok: false, reason: 'exam_set_not_found' }
    if (ref.status !== 'published') return { ok: false, reason: 'exam_set_not_published' }
    if (ref.level_id !== levelId || ref.skill !== skill) return { ok: false, reason: 'exam_set_mismatch' }
    if (index === 0) questionCount = ref.item_count
  }
  return { ok: true, questionCount }
}

export async function createExam(
  store: ExamsStore,
  input: CreateExamRequest,
  createdBy: string,
): Promise<CreateExamOutcome> {
  const level = await store.findLevelByCode(input.level)
  if (!level) return { ok: false, reason: 'level_not_found' }
  // slice-14: lop gan cho de phai cung cap do voi de (map lop -> course -> level).
  const classIds = input.classIds ?? []
  if (classIds.length > 0) {
    const allowed = new Set((await store.listClassRefsForLevel(level.id)).map((c) => c.id))
    if (classIds.some((id) => !allowed.has(id))) return { ok: false, reason: 'class_level_mismatch' }
  }
  // Nguong cua de duoc CHOT luc tao (sao tu chinh sach cap do neu khong ghi de) de doi chinh
  // sach ve sau khong lam doi ket qua cac de/luot da co.
  let questionCount: number
  let fixedFields: Partial<CreateExamFields> = {}
  if (input.mode === 'fixed_set') {
    const sets = await resolveFixedSets(store, input.examSetIds, level.id, input.skill)
    if (!sets.ok) return sets
    questionCount = sets.questionCount
    fixedFields = {
      mode: 'fixed_set',
      examSetIds: input.examSetIds,
      shuffleQuestions: input.shuffleQuestions,
      shuffleOptions: input.shuffleOptions,
      retakeStrategy: input.retakeStrategy,
    }
  } else {
    questionCount = input.questionCount
  }
  const policy = await store.findGradingPolicy(level.id)
  const row = await store.createExam({
    ...fixedFields,
    title: input.title,
    levelId: level.id,
    skill: input.skill,
    questionCount,
    durationMinutes: input.durationMinutes,
    opensAt: new Date(input.opensAt).toISOString(),
    closesAt: new Date(input.closesAt).toISOString(),
    passPercent: input.passPercent ?? policy?.pass_percent ?? DEFAULT_GRADING_POLICY.passPercent,
    maxAttempts: input.maxAttempts ?? policy?.max_attempts ?? DEFAULT_GRADING_POLICY.maxAttempts,
    retakeCooldownMinutes:
      input.retakeCooldownMinutes ?? policy?.retake_cooldown_minutes ?? DEFAULT_GRADING_POLICY.retakeCooldownMinutes,
    classIds,
    createdBy,
  })
  return { ok: true, exam: toExam(row) }
}

export type StartAttemptOutcome =
  | { ok: true; attempt: ExamAttemptView }
  | {
      ok: false
      reason:
        | 'not_found'
        | 'not_open'
        | 'closed'
        | 'already_submitted'
        | 'already_passed'
        | 'retake_limit_reached'
        | 'retake_cooldown'
        | 'not_enough_questions'
        | 'paper_unavailable'
        | 'session_conflict'
    }

const RETAKE_BLOCK: Record<Exclude<RetakeStatus['reason'], 'retake_ready'>, 'closed' | 'already_submitted' | 'already_passed' | 'retake_limit_reached'> = {
  passed: 'already_passed',
  limit_reached: 'retake_limit_reached',
  exam_closed: 'closed',
  pending_manual: 'already_submitted',
}

/**
 * Bat dau (hoac tiep tuc) mot luot thi. Neu luot moi nhat chua nop -> tra ve luot do (resume,
 * "1 thiet bi/luot"). Neu da nop: dat/het luot/cho cham tay -> khong cho lam lai; truot va con
 * luot -> sau thoi gian cho, sinh DE MOI (khac de lan truoc) cho lan `attempt_number + 1`.
 */
export async function startAttempt(
  store: ExamsStore,
  examId: string,
  studentId: string,
  now: Date,
  rng: () => number = Math.random,
  sessionKey = 'internal',
): Promise<StartAttemptOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  const nowMs = now.getTime()
  const existing = await store.findAttempt(examId, studentId)
  let previousOfExam: AttemptRow | undefined
  if (existing && existing.submitted_at === null) {
    if (!(await store.claimSession(existing.id, sessionKey))) return { ok: false, reason: 'session_conflict' }
    // Con gio -> resume. Het gio -> chot bang checkpoint da luu va tra ket qua; hoc vien chu dong
    // bam thi lai o request sau (khong tu sinh de moi ngay khi vua bi ep nop).
    const active = nowMs >= toDate(existing.deadline_at).getTime()
      ? await store.saveSubmission(existing.id, existing.answers ?? '{}', now.toISOString()) : existing
    return { ok: true, attempt: await buildAttemptView(store, exam, active, now) }
  }
  if (existing) {
    const graded = await ensureGraded(store, exam, existing, now)
    const retake = retakeStatus(exam, graded, toResult(exam, graded), now)
    if (!retake) return { ok: false, reason: 'already_submitted' }
    if (retake.reason !== 'retake_ready') return { ok: false, reason: RETAKE_BLOCK[retake.reason] }
    // Zero cooldown never blocks: submitted_at comes from the DB clock, which may run slightly ahead of the API clock.
    const cooling = exam.retake_cooldown_minutes > 0 && retake.availableAt !== null
    if (cooling && nowMs < Date.parse(retake.availableAt!)) return { ok: false, reason: 'retake_cooldown' }
    previousOfExam = graded
  }
  if (nowMs < toDate(exam.opens_at).getTime()) return { ok: false, reason: 'not_open' }
  if (nowMs > toDate(exam.closes_at).getTime()) return { ok: false, reason: 'closed' }

  const attemptNumber = (previousOfExam?.attempt_number ?? 0) + 1
  const paper = exam.mode === 'fixed_set'
    ? await drawFixedPaper(store, exam, studentId, previousOfExam, rng)
    : await drawRandomPaper(store, exam, studentId, previousOfExam, rng)
  if (!paper.ok) return paper

  try {
    const created = await store.createAttempt({
      examId,
      studentId,
      questionIds: paper.questions.map((q) => q.id),
      questionSnapshot: paper.questions,
      examSetId: paper.examSetId,
      attemptNumber,
      sessionKey,
      startedAt: now.toISOString(),
      deadlineAt: new Date(nowMs + exam.duration_minutes * 60_000).toISOString(),
    })
    return { ok: true, attempt: await buildAttemptView(store, exam, created, now) }
  } catch (err) {
    // Chong dua (N003): hai request dong thoi cung vuot qua findAttempt o tren roi cung insert
    // -> insert thu hai vi pham unique(exam_id, student_id, attempt_number). Thay vi de loi lot ra
    // thanh 500, doc lai luot cung so thu tu va resume (hoac bao da nop).
    const raced = await store.findAttempt(examId, studentId)
    if (!raced || (raced.attempt_number ?? 1) !== attemptNumber) throw err
    if (!(await store.claimSession(raced.id, sessionKey))) return { ok: false, reason: 'session_conflict' }
    if (raced.submitted_at !== null) return { ok: false, reason: 'already_submitted' }
    return { ok: true, attempt: await buildAttemptView(store, exam, raced, now) }
  }
}

type DrawnPaper =
  | { ok: true; questions: QuestionLite[]; examSetId: string | null }
  | { ok: false; reason: 'not_enough_questions' | 'paper_unavailable' }

async function drawRandomPaper(
  store: ExamsStore, exam: ExamRow, studentId: string, previousOfExam: AttemptRow | undefined, rng: () => number,
): Promise<DrawnPaper> {
  const pool = await store.listQuestionIdsFor(exam.level_id, exam.skill)
  if (pool.length < exam.question_count) return { ok: false, reason: 'not_enough_questions' }
  // Thi lai: tranh de cua lan truoc CUNG de thi; lan dau: tranh de gan nhat cua hoc vien.
  const previous = previousOfExam ?? (await store.findLatestAttemptForStudent(studentId))
  const previousPaper = previous ? parseIds(previous.question_ids).map((id) => `previous:${id}`) : null
  const bank = await store.findQuestionsByIds(pool)
  const variants = new Map(bank.map((q) => [q.id, variantKey(q)]))
  if (previous) for (const q of snapshot(previous)) variants.set(`previous:${q.id}`, variantKey(q))
  const paper = generatePaper(bank.map((q) => q.id), exam.question_count, previousPaper, rng, variants)
  if (!paper) return { ok: false, reason: 'paper_unavailable' }
  const byId = new Map(bank.map((q) => [q.id, q]))
  return { ok: true, questions: paper.map((id) => byId.get(id)!), examSetId: null }
}

/** ADR 0011: a retake reshuffles the same set, or takes the next linked set this student has not sat. */
async function drawFixedPaper(
  store: ExamsStore, exam: ExamRow, studentId: string, previousOfExam: AttemptRow | undefined, rng: () => number,
): Promise<DrawnPaper> {
  let examSetId = exam.exam_set_id ?? null
  let arrangement: PaperArrangement = {
    shuffleQuestions: exam.shuffle_questions ?? false,
    shuffleOptions: exam.shuffle_options ?? false,
  }
  let previousOrder: string[] | null = null
  if (previousOfExam && exam.retake_strategy === 'alternate_sets') {
    const used = new Set((await store.listAttempts(exam.id, studentId)).map((a) => a.exam_set_id))
    examSetId = (exam.exam_set_ids ?? []).find((id) => !used.has(id)) ?? null
  } else if (previousOfExam) {
    arrangement = { shuffleQuestions: true, shuffleOptions: true }
    previousOrder = parseIds(previousOfExam.question_ids)
  }
  if (!examSetId) return { ok: false, reason: 'paper_unavailable' }
  const items = await store.listExamSetQuestions(examSetId)
  return { ok: true, questions: arrangeFixedPaper(items, arrangement, previousOrder, rng), examSetId }
}

export type GetAttemptOutcome =
  | { ok: true; attempt: ExamAttemptView }
  | { ok: false; reason: 'not_found' | 'not_started' | 'session_conflict' }

export async function getAttempt(
  store: ExamsStore,
  examId: string,
  studentId: string,
  now: Date = new Date(),
  sessionKey = 'internal',
): Promise<GetAttemptOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  const attempt = await store.findAttempt(examId, studentId)
  if (!attempt) return { ok: false, reason: 'not_started' }
  if (!(await store.claimSession(attempt.id, sessionKey))) return { ok: false, reason: 'session_conflict' }
  const active = attempt.submitted_at === null && now.getTime() >= toDate(attempt.deadline_at).getTime()
    ? await store.saveSubmission(attempt.id, attempt.answers ?? '{}', now.toISOString()) : attempt
  return { ok: true, attempt: await buildAttemptView(store, exam, active, now) }
}

export type SubmitAttemptOutcome =
  | { ok: true; attempt: ExamAttemptView }
  | { ok: false; reason: 'not_found' | 'not_started' | 'already_submitted' | 'session_conflict' | 'revision_conflict' }

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
  sessionKey = 'internal',
): Promise<SubmitAttemptOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  const attempt = await store.findAttempt(examId, studentId)
  if (!attempt) return { ok: false, reason: 'not_started' }
  if (!(await store.claimSession(attempt.id, sessionKey))) return { ok: false, reason: 'session_conflict' }
  if (attempt.submitted_at !== null) return { ok: true, attempt: await buildAttemptView(store, exam, attempt, now) }
  // Late finalization may use persisted checkpoints only, never late request answers.
  const paperIds = new Set(parseIds(attempt.question_ids))
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(answers)) {
    if (paperIds.has(k)) filtered[k] = v
  }
  const payload = now.getTime() >= toDate(attempt.deadline_at).getTime()
    ? attempt.answers ?? '{}' : JSON.stringify(filtered)
  const saved = await store.saveSubmission(attempt.id, payload, now.toISOString())
  return { ok: true, attempt: await buildAttemptView(store, exam, saved, now) }
}

export async function saveAttemptAnswers(
  store: ExamsStore, examId: string, studentId: string,
  answers: Record<string, string>, revision: number, now: Date, sessionKey: string,
): Promise<SubmitAttemptOutcome> {
  const current = await getAttempt(store, examId, studentId, now, sessionKey)
  if (!current.ok || current.attempt.status === 'submitted') return current
  const attempt = await store.findAttempt(examId, studentId)
  if (!attempt) return { ok: false, reason: 'not_started' }
  const ids = new Set(parseIds(attempt.question_ids))
  const filtered = Object.fromEntries(Object.entries(answers).filter(([id]) => ids.has(id)))
  const saved = await store.saveAnswers(attempt.id, JSON.stringify(filtered), revision, now.toISOString())
  if (!saved) return { ok: false, reason: 'revision_conflict' }
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  return { ok: true, attempt: await buildAttemptView(store, exam, saved, now) }
}

async function toRecord(store: ExamsStore, exam: ExamRow, attempt: AttemptRow, now: Date): Promise<ExamAttemptRecord> {
  // Luot qua gio ma chua ai mo lai van giu nguyen (chua chot) — chi cham luot da chot.
  const graded = await ensureGraded(store, exam, attempt, now)
  return {
    attemptId: graded.id,
    examId: graded.exam_id,
    studentId: graded.student_id,
    attemptNumber: graded.attempt_number ?? 1,
    questionIds: parseIds(graded.question_ids),
    examSetId: graded.exam_set_id ?? null,
    startedAt: toIso(graded.started_at),
    deadlineAt: toIso(graded.deadline_at),
    submittedAt: graded.submitted_at !== null ? toIso(graded.submitted_at) : null,
    result: toResult(exam, graded),
  }
}

export type AttemptHistoryOutcome = { ok: true; attempts: ExamAttemptRecord[] } | { ok: false; reason: 'not_found' }

/**
 * Lich su moi luot (audit). `studentId` co -> chi luot cua hoc vien do (hoc vien xem cua minh);
 * khong co -> moi hoc vien (Admin/Teacher xem ket qua de).
 */
export async function listAttemptHistory(
  store: ExamsStore,
  examId: string,
  studentId: string | undefined,
  now: Date = new Date(),
): Promise<AttemptHistoryOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'not_found' }
  const rows = await store.listAttempts(examId, studentId)
  const attempts: ExamAttemptRecord[] = []
  for (const row of rows) attempts.push(await toRecord(store, exam, row, now))
  return { ok: true, attempts }
}

function toPolicy(row: GradingPolicyRow): GradingPolicy {
  return {
    levelCode: row.level_code as LevelCode,
    passPercent: row.pass_percent,
    maxAttempts: row.max_attempts,
    retakeCooldownMinutes: row.retake_cooldown_minutes,
  }
}

export async function listGradingPolicies(store: ExamsStore): Promise<GradingPolicy[]> {
  return (await store.listGradingPolicies()).map(toPolicy)
}

export type UpdateGradingPolicyOutcome = { ok: true; policy: GradingPolicy } | { ok: false; reason: 'level_not_found' }

/** Doi chinh sach cap do: chi ap dung cho de TAO SAU; de da co giu nguong da chot. */
export async function updateGradingPolicy(
  store: ExamsStore,
  levelCode: string,
  input: UpdateGradingPolicyRequest,
): Promise<UpdateGradingPolicyOutcome> {
  const level = await store.findLevelByCode(levelCode)
  if (!level) return { ok: false, reason: 'level_not_found' }
  const row = await store.upsertGradingPolicy(level.id, input)
  return { ok: true, policy: toPolicy(row) }
}

// --- slice-9a: manual grading of Speaking/Writing (ADR 0009) ---

function toGradingItem(row: GradingRow): ManualGradingItem {
  return {
    attemptId: row.id,
    examId: row.exam_id,
    examTitle: row.exam_title,
    levelCode: row.level_code as LevelCode,
    skill: row.skill as QuestionSkill,
    studentId: row.student_id,
    studentPhone: row.student_phone,
    studentFirstName: row.student_first_name ?? null,
    studentLastName: row.student_last_name ?? null,
    attemptNumber: row.attempt_number ?? 1,
    submittedAt: toIso(row.submitted_at ?? row.deadline_at),
    maxScore: snapshot(row).reduce((sum, q) => sum + q.points, 0),
  }
}

function toGradingAttempt(row: GradingRow): ManualGradingAttempt {
  const answers = parseAnswers(row.answers)
  return {
    ...toGradingItem(row),
    passPercent: row.pass_percent,
    questions: snapshot(row).map((q) => ({ ...toQuestionView(q), answer: answers[q.id] ?? null })),
    result: toResult(row, row),
  }
}

/** Grading queue for Admin/Teacher: expired unsubmitted attempts are listed too (finalized on open). */
export async function listManualGradingQueue(store: ExamsStore, now: Date): Promise<ManualGradingItem[]> {
  const rows = await store.listUngradedAttempts([...MANUAL_SKILLS], now.toISOString())
  return rows.map(toGradingItem)
}

type GradableOutcome = { ok: true; row: GradingRow } | { ok: false; reason: 'not_found' | 'not_manual' | 'in_progress' }

/** Finalizes an expired attempt from its saved checkpoint, like the student-side deadline path. */
async function loadGradable(store: ExamsStore, attemptId: string, now: Date): Promise<GradableOutcome> {
  const row = await store.findGradingRow(attemptId)
  if (!row) return { ok: false, reason: 'not_found' }
  if (!isManualSkill(row.skill)) return { ok: false, reason: 'not_manual' }
  if (row.submitted_at !== null) return { ok: true, row }
  if (now.getTime() < toDate(row.deadline_at).getTime()) return { ok: false, reason: 'in_progress' }
  const finalized = await store.saveSubmission(row.id, row.answers ?? '{}', now.toISOString())
  return { ok: true, row: { ...row, ...finalized } }
}

export type ManualGradingOutcome =
  | { ok: true; attempt: ManualGradingAttempt }
  | { ok: false; reason: 'not_found' | 'not_manual' | 'in_progress' }

export async function getManualGradingAttempt(store: ExamsStore, attemptId: string, now: Date): Promise<ManualGradingOutcome> {
  const loaded = await loadGradable(store, attemptId, now)
  return loaded.ok ? { ok: true, attempt: toGradingAttempt(loaded.row) } : loaded
}

export type GradeManuallyOutcome =
  | { ok: true; attempt: ManualGradingAttempt }
  | { ok: false; reason: 'not_found' | 'not_manual' | 'in_progress' | 'already_graded' | 'invalid_scores' }

/**
 * Records a teacher's grade: every paper question needs a whole score in 0..points, no extra ids.
 * Pass/fail uses the exam's frozen threshold; the grade is written once (first grader wins).
 */
export async function gradeManually(
  store: ExamsStore,
  attemptId: string,
  input: GradeAttemptRequest,
  graderId: string,
  now: Date,
): Promise<GradeManuallyOutcome> {
  const loaded = await loadGradable(store, attemptId, now)
  if (!loaded.ok) return loaded
  const row = loaded.row
  if (row.graded_at) return { ok: false, reason: 'already_graded' }
  const questions = snapshot(row)
  const paperIds = new Set(questions.map((q) => q.id))
  if (Object.keys(input.scores).some((id) => !paperIds.has(id))) return { ok: false, reason: 'invalid_scores' }
  const answers = parseAnswers(row.answers)
  const detail: GradedQuestion[] = []
  for (const q of questions) {
    const awarded = input.scores[q.id]
    if (awarded === undefined || awarded > q.points) return { ok: false, reason: 'invalid_scores' }
    detail.push({ questionId: q.id, answer: answers[q.id] ?? null, correct: awarded === q.points, points: q.points, awarded })
  }
  const score = detail.reduce((sum, d) => sum + d.awarded, 0)
  const maxScore = detail.reduce((sum, d) => sum + d.points, 0)
  const gradedAt = now.toISOString()
  const saved = await store.saveGrade(row.id, {
    score,
    maxScore,
    passed: score * 100 >= row.pass_percent * maxScore,
    gradedAt,
    detailJson: JSON.stringify(detail),
    gradedBy: graderId,
    feedback: input.feedback === '' ? null : input.feedback,
  })
  const won = saved.graded_by === graderId && saved.graded_at != null && toIso(saved.graded_at) === gradedAt
  if (!won) return { ok: false, reason: 'already_graded' }
  return { ok: true, attempt: toGradingAttempt({ ...row, ...saved }) }
}

/**
 * slice-9a (revised 2026-11): Speaking/Writing duoc giao vien cham NGOAI he thong; Staff/Admin
 * UPLOAD bang diem (Excel/CSV) va he thong ghi diem theo MA HOC VIEN (= so dien thoai dang nhap).
 * - Khop moi dong voi mot luot Speaking/Writing dang CHO CHAM cua dung hoc vien trong de nay.
 * - maxScore = tong diem toi da cua de (tinh tu snapshot cua luot do). passed theo nguong cua de.
 * - Ghi mot lan (trigger DB chan sua). Cac dong khong khop / da cham / vuot diem -> bo qua co ly do.
 * - Pham vi: `allowedPhones` = undefined nghia la khong gioi han (superadmin); nguoc lai chi ap cho
 *   hoc vien co SDT trong tap nay (branch-scoped).
 */
export interface GradeImportInputRow {
  row: number
  studentCode: string
  score: number
  feedback: string | null
}

export type GradeImportSkipReason =
  | 'student_not_found'
  | 'already_graded'
  | 'out_of_scope'
  | 'score_exceeds_max'
  | 'duplicate_in_file'

export interface GradeImportSkipped {
  row: number
  studentCode: string
  reason: GradeImportSkipReason
}

export interface GradeImportSummary {
  applied: number
  skipped: GradeImportSkipped[]
}

export type ImportGradesOutcome =
  | { ok: true; summary: GradeImportSummary }
  | { ok: false; reason: 'exam_not_found' | 'not_manual' }

export async function importGrades(
  store: ExamsStore,
  examId: string,
  rows: readonly GradeImportInputRow[],
  graderId: string,
  now: Date,
  allowedPhones: ReadonlySet<string> | undefined,
  allowedStudentCodes: ReadonlySet<string> | undefined,
): Promise<ImportGradesOutcome> {
  const exam = await store.findExamById(examId)
  if (!exam) return { ok: false, reason: 'exam_not_found' }
  if (!isManualSkill(exam.skill)) return { ok: false, reason: 'not_manual' }

  // slice-14: neu de gan lop cu the -> chi cham hoc vien thuoc cac lop do (cohort theo lop).
  // Giao voi branch-scope san co: ngay ca superadmin cung bi gioi han theo danh sach lop cua de.
  let effectiveAllowed = allowedPhones
  const examClassIds = exam.exam_class_ids ?? []
  if (examClassIds.length > 0) {
    const classPhones = new Set(await store.listStudentPhonesInClasses(examClassIds))
    effectiveAllowed = effectiveAllowed
      ? new Set([...effectiveAllowed].filter((p) => classPhones.has(p)))
      : classPhones
  }

  // Cac luot cho cham cua dung de nay, lap chi muc theo MA HOC VIEN (chinh) va SDT (fallback).
  // Mot luot moi nhat moi hoc vien cho moi khoa.
  const queue = (await store.listUngradedAttempts([...MANUAL_SKILLS], now.toISOString()))
    .filter((r) => r.exam_id === examId)
  const byCode = new Map<string, GradingRow>()
  const byPhone = new Map<string, GradingRow>()
  for (const r of queue) {
    if (r.student_code && !byCode.has(r.student_code)) byCode.set(r.student_code, r)
    if (!byPhone.has(r.student_phone)) byPhone.set(r.student_phone, r)
  }

  const summary: GradeImportSummary = { applied: 0, skipped: [] }
  const seen = new Set<string>()

  for (const input of rows) {
    const code = input.studentCode
    if (seen.has(code)) {
      summary.skipped.push({ row: input.row, studentCode: code, reason: 'duplicate_in_file' })
      continue
    }
    seen.add(code)

    // slice-23: scope xet theo ca ma hoc vien (chinh) lan SDT (fallback). Chi chan khi KHONG nam trong ca hai.
    const inCodeScope = allowedStudentCodes?.has(code) ?? false
    const inPhoneScope = effectiveAllowed?.has(code) ?? false
    const scoped = allowedStudentCodes !== undefined || effectiveAllowed !== undefined
    if (scoped && !inCodeScope && !inPhoneScope) {
      summary.skipped.push({ row: input.row, studentCode: code, reason: 'out_of_scope' })
      continue
    }
    // slice-23: khop theo student_code TRUOC (khoa chinh), roi moi fallback sang SDT.
    // TODO(slice-23): Khop theo SDT chi la fallback chuyen tiep; go khi moi hoc vien da co student_code.
    const target = byCode.get(code) ?? byPhone.get(code)
    if (!target) {
      summary.skipped.push({ row: input.row, studentCode: code, reason: 'student_not_found' })
      continue
    }

    // Chot luot qua gio (giong loadGradable) de co snapshot cuoi cung.
    const loaded = await loadGradable(store, target.id, now)
    if (!loaded.ok) {
      summary.skipped.push({ row: input.row, studentCode: code, reason: 'student_not_found' })
      continue
    }
    const graded = loaded.row
    if (graded.graded_at) {
      summary.skipped.push({ row: input.row, studentCode: code, reason: 'already_graded' })
      continue
    }
    const maxScore = snapshot(graded).reduce((sum, q) => sum + q.points, 0)
    if (input.score > maxScore) {
      summary.skipped.push({ row: input.row, studentCode: code, reason: 'score_exceeds_max' })
      continue
    }
    const gradedAt = now.toISOString()
    const saved = await store.saveGrade(graded.id, {
      score: input.score,
      maxScore,
      passed: input.score * 100 >= graded.pass_percent * maxScore,
      gradedAt,
      // Cham ngoai he thong: khong co chi tiet tung cau, danh dau la diem import.
      detailJson: JSON.stringify({ imported: true, score: input.score, maxScore }),
      gradedBy: graderId,
      feedback: input.feedback,
    })
    const won = saved.graded_by === graderId && saved.graded_at != null && toIso(saved.graded_at) === gradedAt
    if (won) summary.applied += 1
    else summary.skipped.push({ row: input.row, studentCode: code, reason: 'already_graded' })
  }

  return { ok: true, summary }
}
