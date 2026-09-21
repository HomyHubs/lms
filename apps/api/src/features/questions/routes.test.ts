import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import { questionsRoutes } from './routes.js'
import type { CreateQuestionFields, LevelRef, QuestionRow, QuestionsStore } from './service.js'

const ADMIN: UserRecord = { id: 'admin-1', phone_number: '0900000001', password_hash: 'x', role: 'admin' }
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

function makeFakeQuestionsStore(): QuestionsStore {
  const rows: QuestionRow[] = []
  let seq = 0
  const now = new Date('2026-09-21T00:00:00.000Z')
  function insert(input: CreateQuestionFields): QuestionRow {
    const row: QuestionRow = {
      id: `q-${(seq += 1)}`,
      level_id: input.levelId,
      level_code: LEVELS.find((l) => l.id === input.levelId)?.code ?? 'starter',
      skill: input.skill,
      question_type: input.questionType,
      difficulty: input.difficulty,
      question_text: input.questionText,
      options: input.options === null ? null : JSON.stringify(input.options),
      correct_answer: input.correctAnswer,
      points: input.points ?? 1,
      explanation: input.explanation,
      source_reference: input.sourceReference,
      created_at: now,
    }
    rows.push(row)
    return row
  }
  return {
    async listQuestions() {
      return [...rows]
    },
    async findQuestionById(id) {
      return rows.find((r) => r.id === id)
    },
    async findLevelByCode(code) {
      return LEVELS.find((l) => l.code === code)
    },
    async createQuestion(input) {
      return insert(input)
    },
    async createQuestions(inputs) {
      return inputs.map(insert)
    },
    async updateQuestion(id) {
      return rows.find((r) => r.id === id)
    },
    async deleteQuestion(id) {
      const idx = rows.findIndex((r) => r.id === id)
      if (idx < 0) return false
      rows.splice(idx, 1)
      return true
    },
  }
}

async function buildTestApp(
  authUser: UserRecord | null,
  questionsStore: QuestionsStore,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await questionsRoutes(app, { rbac: makeRbac(makeFakeAuthStore(authUser)), questionsStore })
  await app.ready()
  return app
}

const validCreate = {
  level: 'starter',
  skill: 'reading',
  questionType: 'multiple_choice',
  difficulty: 'easy',
  questionText: 'What color is the sky?',
  options: ['blue', 'green'],
  correctAnswer: 'blue',
}

describe('questions routes — RBAC guard', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET /questions returns 401 without a session', async () => {
    app = await buildTestApp(null, makeFakeQuestionsStore())
    expect((await app.inject({ method: 'GET', url: '/questions' })).statusCode).toBe(401)
  })

  it('GET /questions returns 403 for a student', async () => {
    app = await buildTestApp(STUDENT, makeFakeQuestionsStore())
    const res = await app.inject({ method: 'GET', url: '/questions', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(403)
  })
})

describe('questions routes — CRUD + import (admin/teacher)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('a teacher can create a question (201)', async () => {
    app = await buildTestApp(TEACHER, makeFakeQuestionsStore())
    const res = await app.inject({
      method: 'POST',
      url: '/questions',
      headers: { cookie: COOKIE },
      payload: validCreate,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().question.levelCode).toBe('starter')
  })

  it('imports valid rows (201) as admin', async () => {
    app = await buildTestApp(ADMIN, makeFakeQuestionsStore())
    const res = await app.inject({
      method: 'POST',
      url: '/questions/import',
      headers: { cookie: COOKIE },
      payload: {
        rows: [
          {
            level: 'flyer',
            skill: 'writing',
            question_type: 'fill_blank',
            difficulty: 'hard',
            question_text: 'Fill ___',
            correct_answer: 'x',
          },
        ],
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().imported).toBe(1)
  })

  it('rejects an import with a wrong field (400 + errors, nothing saved)', async () => {
    const store = makeFakeQuestionsStore()
    app = await buildTestApp(TEACHER, store)
    const res = await app.inject({
      method: 'POST',
      url: '/questions/import',
      headers: { cookie: COOKIE },
      payload: {
        rows: [
          {
            level: 'starter',
            skill: 'reading',
            question_type: 'multiple_choice',
            difficulty: 'easy',
            question: 'wrong field name',
            correct_answer: 'blue',
          },
        ],
      },
    })
    expect(res.statusCode).toBe(400)
    expect(Array.isArray(res.json().errors)).toBe(true)
    expect(await store.listQuestions()).toHaveLength(0)
  })
})
