import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { SESSION_COOKIE, hashSessionToken } from '../auth/index.js'

import {
  CreateExamRequest,
  GradeAttemptRequest,
  SubmitExamRequest,
  SaveExamAnswersRequest,
  UpdateGradingPolicyRequest,
  type AttemptResponse,
  type ExamAttemptHistory,
  type ExamList,
  type ExamResponse,
  type GradingPolicyList,
  type ManualGradingAttemptResponse,
  type ManualGradingQueue,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { ExamsStore } from './service.js'
import {
  createExam,
  getAttempt,
  getManualGradingAttempt,
  gradeManually,
  listManualGradingQueue,
  listAttemptHistory,
  listExams,
  listGradingPolicies,
  listOpenExams,
  updateGradingPolicy,
  startAttempt,
  submitAttempt,
  saveAttemptAnswers,
} from './service.js'

function attemptSession(request: FastifyRequest): string {
  const token = request.cookies[SESSION_COOKIE]
  if (!token) throw new Error('Authenticated session required')
  return hashSessionToken(token)
}

const AttemptIdParam = z.object({ attemptId: z.string().uuid() })

const GRADING_ERRORS = {
  not_found: { status: 404, error: 'Khong tim thay bai lam' },
  not_manual: { status: 409, error: 'De nay duoc cham tu dong' },
  in_progress: { status: 409, error: 'Hoc vien chua nop bai' },
  already_graded: { status: 409, error: 'Bai lam da duoc cham' },
  invalid_scores: { status: 400, error: 'Moi cau phai co diem nguyen tu 0 den diem toi da' },
} as const

function gradingFailure(reply: FastifyReply, reason: keyof typeof GRADING_ERRORS) {
  const { status, error } = GRADING_ERRORS[reason]
  return reply.code(status).send({ error, code: reason })
}

interface ExamsRoutesDeps {
  rbac: Rbac
  examsStore: ExamsStore
}

/**
 * Route Tao de & Thi online (slice-4).
 * - Tao/liet ke de: Admin + Teacher tao (RBAC that). Danh sach: quan tri xem tat ca; hoc vien chi thay de dang mo (N002).
 * - Lam/nop bai: chi Student. De tra ve KHONG kem dap an dung (bao mat de thi).
 * Slice-5: ket qua cham + thi lai di kem AttemptResponse; lich su luot (hoc vien: cua minh;
 * Admin/Teacher: ca de); chinh sach cham theo cap do (Admin/Teacher xem, Admin sua).
 */
export async function examsRoutes(app: FastifyInstance, deps: ExamsRoutesDeps): Promise<void> {
  const { rbac, examsStore } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')
  const requireLogin = rbac.requireRole()
  const requireStudent = rbac.requireRole('student')
  const requireAdmin = rbac.requireRole('admin')

  app.get('/exam-policies', { preHandler: requireManager }, async () => {
    const body: GradingPolicyList = { policies: await listGradingPolicies(examsStore) }
    return body
  })

  app.put('/exam-policies/:level', { preHandler: requireAdmin }, async (request, reply) => {
    const { level } = request.params as { level: string }
    const parsed = UpdateGradingPolicyRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Chinh sach cham khong hop le' }
    }
    const outcome = await updateGradingPolicy(examsStore, level, parsed.data)
    if (!outcome.ok) {
      reply.code(404)
      return { error: 'Cap do khong ton tai' }
    }
    return { policy: outcome.policy }
  })

  app.get('/exams/:id/history', { preHandler: requireStudent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const outcome = await listAttemptHistory(examsStore, id, getSessionUser(request).id)
    if (!outcome.ok) {
      reply.code(404)
      return { error: 'Khong tim thay de thi' }
    }
    const body: ExamAttemptHistory = { attempts: outcome.attempts }
    return body
  })

  app.get('/exams/:id/results', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const outcome = await listAttemptHistory(examsStore, id, undefined)
    if (!outcome.ok) {
      reply.code(404)
      return { error: 'Khong tim thay de thi' }
    }
    const body: ExamAttemptHistory = { attempts: outcome.attempts }
    return body
  })

  // slice-9a: manual grading of Speaking/Writing attempts (Admin/Teacher).
  app.get('/grading/attempts', { preHandler: requireManager }, async () => {
    const body: ManualGradingQueue = { attempts: await listManualGradingQueue(examsStore, new Date()) }
    return body
  })

  app.get('/grading/attempts/:attemptId', { preHandler: requireManager }, async (request, reply) => {
    const params = AttemptIdParam.safeParse(request.params)
    if (!params.success) return gradingFailure(reply, 'not_found')
    const outcome = await getManualGradingAttempt(examsStore, params.data.attemptId, new Date())
    if (!outcome.ok) return gradingFailure(reply, outcome.reason)
    return { attempt: outcome.attempt } satisfies ManualGradingAttemptResponse
  })

  app.post('/grading/attempts/:attemptId/grade', { preHandler: requireManager }, async (request, reply) => {
    const params = AttemptIdParam.safeParse(request.params)
    if (!params.success) return gradingFailure(reply, 'not_found')
    const parsed = GradeAttemptRequest.safeParse(request.body)
    if (!parsed.success) return gradingFailure(reply, 'invalid_scores')
    const outcome = await gradeManually(examsStore, params.data.attemptId, parsed.data, getSessionUser(request).id, new Date())
    if (!outcome.ok) return gradingFailure(reply, outcome.reason)
    return { attempt: outcome.attempt } satisfies ManualGradingAttemptResponse
  })

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
        already_passed: { code: 409, error: 'Ban da dat bai thi nay, khong can thi lai' },
        retake_limit_reached: { code: 409, error: 'Ban da het so lan thi cho phep' },
        retake_cooldown: { code: 409, error: 'Chua den thoi gian duoc thi lai' },
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
