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
  type GradeImportResult,
  type GradingPolicyList,
  type ManualGradingAttemptResponse,
  type ManualGradingQueue,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { ImportFileError } from '../examsets/import-zip.js'
import { parseGradeImport } from './grade-import.js'
import type { ExamsStore } from './service.js'
import {
  createExam,
  getAttempt,
  getManualGradingAttempt,
  gradeManually,
  importGrades,
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

/** Gioi han kich thuoc file bang diem (3 MiB). */
const GRADE_IMPORT_MAX_BYTES = 3 * 1024 * 1024

function attemptSession(request: FastifyRequest): string {
  const token = request.cookies[SESSION_COOKIE]
  if (!token) throw new Error('Authenticated session required')
  return hashSessionToken(token)
}

const AttemptIdParam = z.object({ attemptId: z.string().uuid() })

/** Query cua POST /grading/import: examId (ky thi) + fileName (de xac dinh .xlsx/.csv). */
const GradeImportQuery = z.object({
  examId: z.string().uuid({ message: 'examId khong hop le' }),
  fileName: z.string().min(1, { message: 'Thieu ten file' }),
})

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
  /** slice-1 Task 4: branch-scope cho import diem (superadmin vuot). */
  branchScope: BranchScope
}

/**
 * Route Tao de & Thi online (slice-4).
 * - Tao/liet ke de: Admin + Teacher tao (RBAC that). Danh sach: quan tri xem tat ca; hoc vien chi thay de dang mo (N002).
 * - Lam/nop bai: chi Student. De tra ve KHONG kem dap an dung (bao mat de thi).
 * Slice-5: ket qua cham + thi lai di kem AttemptResponse; lich su luot (hoc vien: cua minh;
 * Admin/Teacher: ca de); chinh sach cham theo cap do (Admin/Teacher xem, Admin sua).
 */
export async function examsRoutes(app: FastifyInstance, deps: ExamsRoutesDeps): Promise<void> {
  const { rbac, examsStore, branchScope } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')
  // slice-14: gan/tao de co the gan lop — cho phep admin + teacher + staff (superadmin tu vuot guard).
  const requireExamAuthor = rbac.requireRole('admin', 'teacher', 'staff')
  const requireLogin = rbac.requireRole()
  const requireStudent = rbac.requireRole('student')
  const requireAdmin = rbac.requireRole('admin')
  // slice-9a (revised): nhap bang diem Speaking/Writing — Staff/Admin (superadmin vuot guard).
  const requireGradeImporter = rbac.requireRole('admin', 'staff')
  // Luu y: content-type parser 'application/octet-stream' (raw body) da duoc examSetsRoutes
  // dang ky tren cung app instance; KHONG dang ky lai o day (tranh FST_ERR_CTP_ALREADY_PRESENT).

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

  // slice-9a (revised): nhap bang diem Speaking/Writing tu file Excel/CSV theo ma hoc vien (= SDT).
  // Thay cho cham tay tung cau: Staff/Admin tai file da co diem; superadmin vuot branch-scope.
  // File gui duoi dang raw body (application/octet-stream); ten file + examId o query param.
  app.post(
    '/grading/import',
    { preHandler: requireGradeImporter, bodyLimit: GRADE_IMPORT_MAX_BYTES },
    async (request, reply) => {
      const query = GradeImportQuery.safeParse(request.query)
      if (!query.success) {
        return reply
          .code(400)
          .send({ error: query.error.issues[0]?.message ?? 'Thong tin import khong hop le' })
      }
      if (!Buffer.isBuffer(request.body)) {
        return reply.code(415).send({ error: 'Gui file voi Content-Type application/octet-stream' })
      }

      // Parse file -> cac dong hop le + loi dinh dang (thieu cot, diem sai).
      let parsed: ReturnType<typeof parseGradeImport>
      try {
        parsed = parseGradeImport(query.data.fileName, request.body)
      } catch (err) {
        if (err instanceof ImportFileError) {
          return reply.code(400).send({ error: err.message, code: 'invalid_file' })
        }
        throw err
      }

      // Branch-scope: superadmin xem toan bo; con lai chi duoc cham hoc vien trong co so minh phu trach.
      // slice-23: gioi han theo ca ma hoc vien (khoa chinh) lan SDT (fallback) trong pham vi co so.
      const user = getSessionUser(request)
      let allowedPhones: ReadonlySet<string> | undefined
      let allowedStudentCodes: ReadonlySet<string> | undefined
      if (user.role !== 'superadmin') {
        const branchIds = await branchScope.branchIdsForUser(user.id)
        const phones = await examsStore.listStudentPhonesInBranches(branchIds)
        allowedPhones = new Set(phones)
        const codes = await examsStore.listStudentCodesInBranches(branchIds)
        allowedStudentCodes = new Set(codes)
      }

      const outcome = await importGrades(
        examsStore,
        query.data.examId,
        parsed.rows,
        user.id,
        new Date(),
        allowedPhones,
        allowedStudentCodes,
      )
      if (!outcome.ok) {
        const map = {
          exam_not_found: { status: 404, error: 'Khong tim thay ky thi' },
          not_manual: { status: 409, error: 'Ky thi nay khong cham tay (Speaking/Writing)' },
        } as const
        const m = map[outcome.reason]
        return reply.code(m.status).send({ error: m.error, code: outcome.reason })
      }

      const body: GradeImportResult = {
        applied: outcome.summary.applied,
        skipped: outcome.summary.skipped,
        errors: parsed.errors,
      }
      return body
    },
  )

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

  app.post('/exams', { preHandler: requireExamAuthor }, async (request, reply) => {
    const parsed = CreateExamRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu de thi khong hop le' }
    }
    // slice-14: non-superadmin chi duoc gan lop thuoc co so minh phu trach (branch-scope).
    const user = getSessionUser(request)
    const classIds = parsed.data.classIds ?? []
    if (classIds.length > 0 && user.role !== 'superadmin') {
      const level = await examsStore.findLevelByCode(parsed.data.level)
      if (level) {
        const refs = await examsStore.listClassRefsForLevel(level.id)
        const branchByClass = new Map(refs.map((c) => [c.id, c.branchId]))
        const allowedBranches = new Set(await branchScope.branchIdsForUser(user.id))
        const outOfScope = classIds.some((id) => {
          const branchId = branchByClass.get(id)
          return branchId === undefined || !allowedBranches.has(branchId)
        })
        if (outOfScope) {
          return reply.code(403).send({ error: 'Lop nam ngoai co so ban phu trach', code: 'class_out_of_scope' })
        }
      }
    }
    const outcome = await createExam(examsStore, parsed.data, user.id)
    if (!outcome.ok) {
      const errors: Record<typeof outcome.reason, string> = {
        level_not_found: 'Cap do khong ton tai',
        exam_set_not_found: 'Khong tim thay bo de',
        exam_set_not_published: 'Chi tao ky thi tu bo de da phat hanh',
        exam_set_mismatch: 'Bo de phai cung cap do va ky nang voi ky thi',
        class_level_mismatch: 'Lop phai cung cap do voi ky thi',
      }
      reply.code(400)
      return { error: errors[outcome.reason], code: outcome.reason }
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
