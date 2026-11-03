import type { FastifyInstance, FastifyRequest } from 'fastify'
import { SESSION_COOKIE, hashSessionToken } from '../auth/index.js'

import {
  CreateExamRequest,
  SubmitExamRequest,
  SaveExamAnswersRequest,
  type AttemptResponse,
  type ExamList,
  type ExamResponse,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { ExamsStore } from './service.js'
import {
  createExam,
  getAttempt,
  listExams,
  listOpenExams,
  startAttempt,
  submitAttempt,
  saveAttemptAnswers,
} from './service.js'

function attemptSession(request: FastifyRequest): string {
  const token = request.cookies[SESSION_COOKIE]
  if (!token) throw new Error('Authenticated session required')
  return hashSessionToken(token)
}

interface ExamsRoutesDeps {
  rbac: Rbac
  examsStore: ExamsStore
}

/**
 * Route Tao de & Thi online (slice-4).
 * - Tao/liet ke de: Admin + Teacher tao (RBAC that). Danh sach: quan tri xem tat ca; hoc vien chi thay de dang mo (N002).
 * - Lam/nop bai: chi Student. De tra ve KHONG kem dap an dung (bao mat de thi).
 */
export async function examsRoutes(app: FastifyInstance, deps: ExamsRoutesDeps): Promise<void> {
  const { rbac, examsStore } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')
  const requireLogin = rbac.requireRole()
  const requireStudent = rbac.requireRole('student')

  app.get('/exams', { preHandler: requireLogin }, async (request) => {
    // N002: hoc vien chi thay de dang mo (trong cua so lich); quan tri xem toan bo de quan ly.
    const viewer = getSessionUser(request)
    const exams =
      viewer.role === 'student'
        ? await listOpenExams(examsStore, new Date())
        : await listExams(examsStore)
    const body: ExamList = { exams }
    return body
  })

  app.post('/exams', { preHandler: requireManager }, async (request, reply) => {
    const parsed = CreateExamRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu de thi khong hop le' }
    }
    const outcome = await createExam(examsStore, parsed.data, getSessionUser(request).id)
    if (!outcome.ok) {
      reply.code(400)
      return { error: 'Cap do khong ton tai' }
    }
    reply.code(201)
    const body: ExamResponse = { exam: outcome.exam }
    return body
  })

  app.post('/exams/:id/attempts', { preHandler: requireStudent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const outcome = await startAttempt(examsStore, id, getSessionUser(request).id, new Date(), Math.random, attemptSession(request))
    if (!outcome.ok) {
      const map: Record<typeof outcome.reason, { code: number; error: string }> = {
        not_found: { code: 404, error: 'Khong tim thay de thi' },
        not_open: { code: 409, error: 'De thi chua mo' },
        closed: { code: 409, error: 'De thi da dong' },
        already_submitted: { code: 409, error: 'Ban da nop bai, khong the lam lai' },
        not_enough_questions: { code: 409, error: 'Ngan hang khong du cau hoi de sinh de' },
        paper_unavailable: { code: 409, error: 'Khong co de khac khong trung lap' },
        session_conflict: { code: 409, error: 'Luot thi dang thuoc phien dang nhap khac' },
      }
      const m = map[outcome.reason]
      reply.code(m.code)
      return { error: m.error, code: outcome.reason }
    }
    const body: AttemptResponse = { attempt: outcome.attempt }
    return body
  })

  app.get('/exams/:id/attempt', { preHandler: requireStudent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const outcome = await getAttempt(examsStore, id, getSessionUser(request).id, new Date(), attemptSession(request))
    if (!outcome.ok) {
      if (outcome.reason === 'session_conflict') return reply.code(409).send({ error: outcome.reason, code: outcome.reason })
      reply.code(404)
      return {
        error: outcome.reason === 'not_found' ? 'Khong tim thay de thi' : 'Chua bat dau lam bai',
      }
    }
    const body: AttemptResponse = { attempt: outcome.attempt }
    return body
  })

  app.post('/exams/:id/answers', { preHandler: requireStudent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = SaveExamAnswersRequest.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid checkpoint' })
    const outcome = await saveAttemptAnswers(examsStore, id, getSessionUser(request).id,
      parsed.data.answers, parsed.data.revision, new Date(), attemptSession(request))
    if (!outcome.ok) return reply.code(outcome.reason === 'not_found' || outcome.reason === 'not_started' ? 404 : 409)
      .send({ error: outcome.reason, code: outcome.reason })
    return { attempt: outcome.attempt } satisfies AttemptResponse
  })

  app.post('/exams/:id/submit', { preHandler: requireStudent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = SubmitExamRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu nop bai khong hop le' }
    }
    const outcome = await submitAttempt(
      examsStore,
      id,
      getSessionUser(request).id,
      parsed.data.answers,
      new Date(),
      attemptSession(request),
    )
    if (!outcome.ok) {
      const map: Record<typeof outcome.reason, { code: number; error: string }> = {
        not_found: { code: 404, error: 'Khong tim thay de thi' },
        not_started: { code: 404, error: 'Chua bat dau lam bai' },
        already_submitted: { code: 409, error: 'Ban da nop bai roi' },
        session_conflict: { code: 409, error: 'Luot thi dang thuoc phien dang nhap khac' },
        revision_conflict: { code: 409, error: 'Dap an da thay doi; tai lai bai thi' },
      }
      const m = map[outcome.reason]
      reply.code(m.code)
      return { error: m.error, code: outcome.reason }
    }
    const body: AttemptResponse = { attempt: outcome.attempt }
    return body
  })
}
