import { randomUUID } from 'node:crypto'
import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import type { CreateQuestionFields } from '../questions/index.js'
import { aiGenerationRoutes } from './routes.js'
import type { AiGenerationStore, AiItemRow, AiRequestRow, SampleQuestionRow } from './service.js'

const LEVEL_STARTER = '10000000-0000-0000-0000-000000000001'
const LEVEL_MOVER = '10000000-0000-0000-0000-000000000002'
const SAMPLE_READING = '30000000-0000-0000-0000-000000000001'
const SAMPLE_MOVER = '30000000-0000-0000-0000-000000000002'

function user(id: string, phone: string, role: string): UserRecord {
  return { id, phone_number: phone, password_hash: 'x', role }
}
const ADMIN = user('60000000-0000-0000-0000-000000000001', '0900000001', 'admin')
const TEACHER_1 = user('70000000-0000-0000-0000-000000000001', '0900000011', 'teacher')
const TEACHER_2 = user('70000000-0000-0000-0000-000000000002', '0900000012', 'teacher')
const STUDENT = user('80000000-0000-0000-0000-000000000001', '0900000021', 'student')
const COOKIE = { cookie: `${SESSION_COOKIE}=any-token` }

function makeFakeAuthStore(sessionUser: UserRecord): AuthStore {
  return {
    async findUserByPhone() {
      return undefined
    },
    async findUserById(id) {
      return sessionUser.id === id ? sessionUser : undefined
    },
    async createSession() {},
    async findSession() {
      return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) }
    },
    async deleteSession() {},
  }
}

interface FakeState {
  requests: AiRequestRow[]
  items: AiItemRow[]
  savedQuestions: CreateQuestionFields[]
}

function makeFakeStore(state: FakeState): AiGenerationStore {
  const levels = [
    { id: LEVEL_STARTER, code: 'starter' },
    { id: LEVEL_MOVER, code: 'mover' },
  ]
  const bank: SampleQuestionRow[] = [
    {
      id: SAMPLE_READING,
      level_id: LEVEL_STARTER,
      skill: 'reading',
      question_type: 'multiple_choice',
      difficulty: 'easy',
      question_text: 'Which one is a fruit?',
      options: JSON.stringify(['Apple', 'Chair', 'Car']),
      correct_answer: 'Apple',
      points: 1,
      explanation: null,
    },
    { ...({} as SampleQuestionRow), id: SAMPLE_MOVER, level_id: LEVEL_MOVER, skill: 'reading' },
  ]
  const findRequest = (id: string) => state.requests.find((r) => r.id === id)

  return {
    async findLevelByCode(code) {
      return levels.find((l) => l.code === code)
    },
    async findQuestionsByIds(ids) {
      return bank.filter((q) => ids.includes(q.id))
    },
    async createRequest(fields) {
      const now = new Date()
      const row: AiRequestRow = {
        id: randomUUID(),
        created_by: fields.createdBy,
        level_id: fields.levelId,
        level_code: levels.find((l) => l.id === fields.levelId)!.code,
        skill: fields.skill,
        question_type: fields.questionType,
        difficulty: fields.difficulty,
        question_count: fields.count,
        sample_question_ids: JSON.stringify(fields.sampleQuestionIds),
        prompt: fields.prompt,
        status: 'draft',
        created_at: now,
        updated_at: now,
      }
      state.requests.push(row)
      return row
    },
    async listRequests(createdBy) {
      return state.requests.filter((r) => createdBy === undefined || r.created_by === createdBy)
    },
    async findRequest(id) {
      return findRequest(id)
    },
    async listItems(requestId) {
      return state.items.filter((it) => it.request_id === requestId)
    },
    async replaceItems(requestId, payloads) {
      const request = findRequest(requestId)
      if (!request || !['draft', 'imported'].includes(request.status)) return false
      request.status = 'imported'
      state.items = state.items.filter((it) => it.request_id !== requestId)
      payloads.forEach((payload, i) =>
        state.items.push({
          id: randomUUID(),
          request_id: requestId,
          position: i + 1,
          payload,
          status: 'pending',
          question_id: null,
        }),
      )
      return true
    },
    async updateItem(requestId, itemId, patch) {
      const item = state.items.find((it) => it.id === itemId && it.request_id === requestId)
      if (!item || item.status === 'saved') return false
      if (patch.payload !== undefined) item.payload = patch.payload
      if (patch.status !== undefined) item.status = patch.status
      return true
    },
    async setRequestStatus(requestId, status) {
      findRequest(requestId)!.status = status
    },
    async saveApproved(requestId, items) {
      const request = findRequest(requestId)
      if (request?.status !== 'reviewed') return null
      request.status = 'saved_to_bank'
      for (const { itemId, fields } of items) {
        state.savedQuestions.push(fields)
        const item = state.items.find((it) => it.id === itemId)!
        item.status = 'saved'
        item.question_id = randomUUID()
      }
      return items.length
    },
  }
}

const apps: FastifyInstance[] = []
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()))
})

async function buildTestApp(sessionUser: UserRecord, state: FakeState): Promise<FastifyInstance> {
  const app = Fastify()
  await app.register(cookie)
  await aiGenerationRoutes(app, {
    rbac: makeRbac(makeFakeAuthStore(sessionUser)),
    aiGenerationStore: makeFakeStore(state),
  })
  apps.push(app)
  return app
}

function aiRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    level: 'starter',
    skill: 'reading',
    question_type: 'multiple_choice',
    difficulty: 'easy',
    question_text: 'Which one is an animal?',
    options: ['Dog', 'Table', 'Book'],
    correct_answer: 'Dog',
    ...overrides,
  }
}

function newState(): FakeState {
  return { requests: [], items: [], savedQuestions: [] }
}

async function createRequest(app: FastifyInstance, body: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/ai-requests', headers: COOKIE, payload: body })
}

describe('AI generation routes', () => {
  it('builds and stores a prompt that embeds the chosen bank samples', async () => {
    const state = newState()
    const app = await buildTestApp(TEACHER_1, state)
    const res = await createRequest(app, {
      level: 'starter',
      skill: 'reading',
      count: 5,
      sampleQuestionIds: [SAMPLE_READING],
    })
    expect(res.statusCode).toBe(201)
    const { request, items } = res.json()
    expect(request).toMatchObject({ status: 'draft', count: 5, sampleQuestionIds: [SAMPLE_READING] })
    expect(request.prompt).toContain('Which one is a fruit?')
    expect(items).toEqual([])
  })

  it('rejects a sample from another level and forbids students', async () => {
    const app = await buildTestApp(TEACHER_1, newState())
    const res = await createRequest(app, {
      level: 'starter',
      skill: 'reading',
      count: 5,
      sampleQuestionIds: [SAMPLE_MOVER],
    })
    expect(res.statusCode).toBe(400)

    const studentApp = await buildTestApp(STUDENT, newState())
    expect((await createRequest(studentApp, { level: 'starter', skill: 'reading', count: 1 })).statusCode).toBe(403)
  })

  it('hides a teacher request from other teachers but not from admin', async () => {
    const state = newState()
    const owner = await buildTestApp(TEACHER_1, state)
    const { request } = (await createRequest(owner, { level: 'starter', skill: 'reading', count: 2 })).json()

    const other = await buildTestApp(TEACHER_2, state)
    expect((await other.inject({ method: 'GET', url: `/ai-requests/${request.id}`, headers: COOKIE })).statusCode).toBe(404)
    expect((await other.inject({ method: 'GET', url: '/ai-requests', headers: COOKIE })).json().requests).toEqual([])

    const admin = await buildTestApp(ADMIN, state)
    expect((await admin.inject({ method: 'GET', url: `/ai-requests/${request.id}`, headers: COOKIE })).statusCode).toBe(200)
  })

  it('rejects the whole paste when one row breaks the schema or the request scope', async () => {
    const state = newState()
    const app = await buildTestApp(TEACHER_1, state)
    const { request } = (await createRequest(app, { level: 'starter', skill: 'reading', count: 2 })).json()

    const res = await app.inject({
      method: 'POST',
      url: `/ai-requests/${request.id}/results`,
      headers: COOKIE,
      payload: { rows: [aiRow(), aiRow({ level: 'mover' }), aiRow({ answer: 'x' })] },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().errors).toEqual([
      { row: 2, field: 'level', message: 'Phai la "starter" theo yeu cau da tao prompt' },
      expect.objectContaining({ row: 3, field: '(row)' }),
    ])
    expect(state.items).toEqual([])
    expect(state.requests[0]!.status).toBe('draft')
  })

  it('moves draft -> imported -> reviewed -> saved_to_bank and saves only approved rows as ai_generated', async () => {
    const state = newState()
    const app = await buildTestApp(TEACHER_1, state)
    const { request } = (await createRequest(app, { level: 'starter', skill: 'reading', count: 2 })).json()
    const base = `/ai-requests/${request.id}`

    const imported = await app.inject({
      method: 'POST',
      url: `${base}/results`,
      headers: COOKIE,
      payload: { rows: [aiRow(), aiRow({ question_text: 'Which one is blue?', options: 'Sky|Sun', correct_answer: 'Sky' })] },
    })
    expect(imported.statusCode).toBe(200)
    const { items } = imported.json()
    expect(imported.json().request.status).toBe('imported')
    expect(items.map((it: { status: string }) => it.status)).toEqual(['pending', 'pending'])
    expect(items[1].row.options).toEqual(['Sky', 'Sun'])

    expect((await app.inject({ method: 'POST', url: `${base}/save`, headers: COOKIE })).statusCode).toBe(409)

    const edited = await app.inject({
      method: 'PATCH',
      url: `${base}/items/${items[0].id}`,
      headers: COOKIE,
      payload: { row: aiRow({ question_text: 'Which one can bark?' }), status: 'approved' },
    })
    expect(edited.json().request.status).toBe('imported')
    const rejected = await app.inject({
      method: 'PATCH',
      url: `${base}/items/${items[1].id}`,
      headers: COOKIE,
      payload: { status: 'rejected' },
    })
    expect(rejected.json().request.status).toBe('reviewed')

    const saved = await app.inject({ method: 'POST', url: `${base}/save`, headers: COOKIE })
    expect(saved.statusCode).toBe(200)
    expect(saved.json()).toMatchObject({ saved: 1, request: { status: 'saved_to_bank' } })
    expect(saved.json().items.map((it: { status: string }) => it.status)).toEqual(['saved', 'rejected'])
    expect(state.savedQuestions).toEqual([
      expect.objectContaining({
        levelId: LEVEL_STARTER,
        questionText: 'Which one can bark?',
        options: ['Dog', 'Table', 'Book'],
        source: 'ai_generated',
      }),
    ])

    expect((await app.inject({ method: 'POST', url: `${base}/save`, headers: COOKIE })).statusCode).toBe(409)
    expect(
      (await app.inject({ method: 'POST', url: `${base}/results`, headers: COOKIE, payload: { rows: [aiRow()] } })).statusCode,
    ).toBe(409)
  })

  it('refuses to save when every reviewed row was rejected', async () => {
    const state = newState()
    const app = await buildTestApp(TEACHER_1, state)
    const { request } = (await createRequest(app, { level: 'starter', skill: 'reading', count: 1 })).json()
    const base = `/ai-requests/${request.id}`
    const { items } = (
      await app.inject({ method: 'POST', url: `${base}/results`, headers: COOKIE, payload: { rows: [aiRow()] } })
    ).json()
    await app.inject({ method: 'PATCH', url: `${base}/items/${items[0].id}`, headers: COOKIE, payload: { status: 'rejected' } })

    const res = await app.inject({ method: 'POST', url: `${base}/save`, headers: COOKIE })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('Chua co cau hoi nao duoc duyet')
    expect(state.savedQuestions).toEqual([])
  })
})
