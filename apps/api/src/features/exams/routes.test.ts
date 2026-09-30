import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import { examsRoutes } from './routes.js'
import type {
  AttemptRow,
  CreateAttemptFields,
  CreateExamFields,
  ExamRow,
  ExamsStore,
  LevelRef,
  QuestionLite,
} from './service.js'

const ADMIN: UserRecord = {
  id: 'admin-1',
  phone_number: '0900000001',
  password_hash: 'x',
  role: 'admin',
}
const TEACHER: UserRecord = {
  id: 'teacher-1',
  phone_number: '0900000002',
  password_hash: 'x',
  role: 'teacher',
}
const STUDENT: UserRecord = {
  id: 'student-1',
  phone_number: '0900000003',
  password_hash: 'x',
  role: 'student',
}
const COOKIE = `${SESSION_COOKIE}=any-token`

const LEVELS: LevelRef[] = [
  { id: 'lvl-starter', code: 'starter' },
  { id: 'lvl-mover', code: 'mover' },
  { id: 'lvl-flyer', code: 'flyer' },
]

interface SeedQuestion extends QuestionLite {
  level_id: string
}

function makeFakeAuthStore(sessionUser: UserRecord | null): AuthStore {
  return {
    async findUserByPhone() {
      return undefined
    },
    async findUserById(id) {
      return sessionUser && sessionUser.id === id ? sessionUser : undefined
    },
    async createSession() {},
    async findSession() {
      if (!sessionUser) return undefined
      return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) }
    },
    async deleteSession() {},
  }
}

function q(id: string, levelId: string, skill: string): SeedQuestion {
  return {
    id,
    level_id: levelId,
    skill,
    question_text: `Q ${id}`,
    question_type: 'multiple_choice',
    points: 1,
    options: JSON.stringify(['a', 'b']),
  }
}

/** De dang mo NGAY tai thoi diem chay test (mo trong qua khu, dong o tuong lai) — tranh gio he thong. */
function openExam(overrides: Partial<ExamRow> = {}): ExamRow {
  const nowMs = Date.now()
  return {
    id: 'exam-open',
    title: 'Reading Starter',
    level_id: 'lvl-starter',
    level_code: 'starter',
    skill: 'reading',
    question_count: 2,
    duration_minutes: 30,
    opens_at: new Date(nowMs - 3_600_000).toISOString(),
    closes_at: new Date(nowMs + 3_600_000).toISOString(),
    created_by: 'teacher-1',
    created_at: new Date(nowMs).toISOString(),
    ...overrides,
  }
}

/** Store gia lap trong bo nho (giong service.test) — test route + RBAC ma khong can Postgres. */
function makeFakeExamsStore(
  seed: { questions?: SeedQuestion[]; exams?: ExamRow[] } = {},
): ExamsStore {
  const questions: SeedQuestion[] = seed.questions ? [...seed.questions] : []
  const exams: ExamRow[] = seed.exams ? [...seed.exams] : []
  const attempts: AttemptRow[] = []
  let examSeq = 0
  let attemptSeq = 0

  return {
    async findLevelByCode(code) {
      return LEVELS.find((l) => l.code === code)
    },
    async createExam(input: CreateExamFields) {
      const level = LEVELS.find((l) => l.id === input.levelId)
      const row: ExamRow = {
        id: `exam-${(examSeq += 1)}`,
        title: input.title,
        level_id: input.levelId,
        level_code: level?.code ?? 'starter',
        skill: input.skill,
        question_count: input.questionCount,
        duration_minutes: input.durationMinutes,
        opens_at: input.opensAt,
        closes_at: input.closesAt,
        created_by: input.createdBy,
        created_at: new Date('2026-09-21T00:00:00.000Z'),
      }
      exams.push(row)
      return row
    },
    async listExams() {
      return [...exams]
    },
    async findExamById(id) {
      return exams.find((e) => e.id === id)
    },
    async listQuestionIdsFor(levelId, skill) {
      return questions.filter((x) => x.level_id === levelId && x.skill === skill).map((x) => x.id)
    },
    async findQuestionsByIds(ids) {
      return questions
        .filter((x) => ids.includes(x.id))
        .map(({ id, question_text, question_type, skill, points, options }) => ({
          id,
          question_text,
          question_type,
          skill,
          points,
          options,
        }))
    },
    async findAttempt(examId, studentId) {
      return attempts.find((a) => a.exam_id === examId && a.student_id === studentId)
    },
    async findLatestAttemptForStudent(studentId) {
      const mine = attempts
        .filter((a) => a.student_id === studentId)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      return mine[0]
    },
    async createAttempt(input: CreateAttemptFields) {
      const row: AttemptRow = {
        id: `attempt-${(attemptSeq += 1)}`,
        exam_id: input.examId,
        student_id: input.studentId,
        question_ids: JSON.stringify(input.questionIds),
        answers: null,
        started_at: input.startedAt,
        deadline_at: input.deadlineAt,
        submitted_at: null,
      }
      attempts.push(row)
      return row
    },
    async saveSubmission(attemptId, answersJson, submittedAtIso) {
      const row = attempts.find((a) => a.id === attemptId)
      if (!row) throw new Error('attempt not found')
      row.answers = answersJson
      row.submitted_at = submittedAtIso
      return row
    },
  }
}

function seededStore(): ExamsStore {
  return makeFakeExamsStore({
    exams: [openExam()],
    questions: [
      q('q1', 'lvl-starter', 'reading'),
      q('q2', 'lvl-starter', 'reading'),
      q('q3', 'lvl-starter', 'reading'),
    ],
  })
}

async function buildTestApp(
  authUser: UserRecord | null,
  examsStore: ExamsStore,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await examsRoutes(app, { rbac: makeRbac(makeFakeAuthStore(authUser)), examsStore })
  await app.ready()
  return app
}

const validCreate = {
  title: 'Reading Starter',
  level: 'starter',
  skill: 'reading',
  questionCount: 2,
  durationMinutes: 30,
  opensAt: '2026-09-21T09:00:00.000Z',
  closesAt: '2026-09-21T12:00:00.000Z',
}

describe('exams routes — RBAC guard', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET /exams tra 401 khi chua dang nhap', async () => {
    app = await buildTestApp(null, seededStore())
    expect((await app.inject({ method: 'GET', url: '/exams' })).statusCode).toBe(401)
  })

  it('GET /exams cho phep moi nguoi da dang nhap — student van xem duoc (200)', async () => {
    app = await buildTestApp(STUDENT, seededStore())
    const res = await app.inject({ method: 'GET', url: '/exams', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(200)
  })

  it('POST /exams tra 403 voi student (chi admin/teacher tao de)', async () => {
    app = await buildTestApp(STUDENT, seededStore())
    const res = await app.inject({
      method: 'POST',
      url: '/exams',
      headers: { cookie: COOKIE },
      payload: validCreate,
    })
    expect(res.statusCode).toBe(403)
  })

  it('POST /exams/:id/attempts tra 403 voi teacher (chi student lam bai)', async () => {
    app = await buildTestApp(TEACHER, seededStore())
    const res = await app.inject({
      method: 'POST',
      url: '/exams/exam-open/attempts',
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('exams routes — tao de (admin/teacher)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('teacher tao de thanh cong (201)', async () => {
    app = await buildTestApp(TEACHER, makeFakeExamsStore())
    const res = await app.inject({
      method: 'POST',
      url: '/exams',
      headers: { cookie: COOKIE },
      payload: validCreate,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().exam.levelCode).toBe('starter')
  })

  it('tu choi body thieu truong (400)', async () => {
    app = await buildTestApp(ADMIN, makeFakeExamsStore())
    const res = await app.inject({
      method: 'POST',
      url: '/exams',
      headers: { cookie: COOKIE },
      payload: { title: 'X', level: 'starter' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('exams routes — thi online (student)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('404 khi bat dau luot cho de khong ton tai', async () => {
    app = await buildTestApp(STUDENT, seededStore())
    const res = await app.inject({
      method: 'POST',
      url: '/exams/nope/attempts',
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(404)
  })

  it('409 not_enough_questions khi ngan hang thieu cau', async () => {
    const store = makeFakeExamsStore({
      exams: [openExam({ question_count: 5 })],
      questions: [q('q1', 'lvl-starter', 'reading'), q('q2', 'lvl-starter', 'reading')],
    })
    app = await buildTestApp(STUDENT, store)
    const res = await app.inject({
      method: 'POST',
      url: '/exams/exam-open/attempts',
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(409)
  })

  it('luot thi: bat dau (200, de an dap an) -> xem lai -> nop (200) -> nop lai bi chan (409)', async () => {
    app = await buildTestApp(STUDENT, seededStore())

    const start = await app.inject({
      method: 'POST',
      url: '/exams/exam-open/attempts',
      headers: { cookie: COOKIE },
    })
    expect(start.statusCode).toBe(200)
    expect(start.json().attempt.questions).toHaveLength(2)
    // Bao mat: de tra ve KHONG kem dap an dung.
    expect(start.json().attempt.questions[0].correctAnswer).toBeUndefined()

    const got = await app.inject({
      method: 'GET',
      url: '/exams/exam-open/attempt',
      headers: { cookie: COOKIE },
    })
    expect(got.statusCode).toBe(200)
    expect(got.json().attempt.status).toBe('in_progress')

    const submit = await app.inject({
      method: 'POST',
      url: '/exams/exam-open/submit',
      headers: { cookie: COOKIE },
      payload: { answers: {} },
    })
    expect(submit.statusCode).toBe(200)
    expect(submit.json().attempt.status).toBe('submitted')

    const again = await app.inject({
      method: 'POST',
      url: '/exams/exam-open/submit',
      headers: { cookie: COOKIE },
      payload: { answers: {} },
    })
    expect(again.statusCode).toBe(409)
  })
})

describe('exams routes — danh sach loc theo vai tro (N002)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  function mixedStore(): ExamsStore {
    const now = Date.now()
    const future = openExam({
      id: 'exam-future',
      opens_at: new Date(now + 3_600_000).toISOString(),
      closes_at: new Date(now + 7_200_000).toISOString(),
    })
    return makeFakeExamsStore({ exams: [openExam(), future] })
  }

  it('student chi thay de dang mo (bo de chua mo)', async () => {
    app = await buildTestApp(STUDENT, mixedStore())
    const res = await app.inject({ method: 'GET', url: '/exams', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(200)
    const ids = res.json().exams.map((e: { id: string }) => e.id)
    expect(ids).toEqual(['exam-open'])
  })

  it('teacher thay toan bo de (ke ca chua mo)', async () => {
    app = await buildTestApp(TEACHER, mixedStore())
    const res = await app.inject({ method: 'GET', url: '/exams', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(200)
    const ids = res.json().exams.map((e: { id: string }) => e.id).sort()
    expect(ids).toEqual(['exam-future', 'exam-open'])
  })
})
