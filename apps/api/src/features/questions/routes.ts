import type { FastifyInstance } from 'fastify'
import {
  CreateQuestionRequest,
  ImportQuestionsRequest,
  UpdateQuestionRequest,
  type ImportQuestionsResult,
  type QuestionList,
  type QuestionResponse,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import { getQuestionEditPermissions, type SettingsStore } from '../settings/index.js'
import type { QuestionsStore } from './service.js'
import {
  createQuestion,
  deleteQuestion,
  importQuestions,
  listQuestions,
  updateQuestion,
} from './service.js'

/** slice-11a: Postgres codes raised when an exam set holds the question (FK restrict / published-set trigger). */
function isHeldByExamSet(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code
  return code === '23503' || code === '23001'
}

const HELD_BY_EXAM_SET = { error: 'Cau hoi dang thuoc bo de (da phat hanh hoac dang dung); khong the sua/xoa', code: 'held_by_exam_set' }

interface QuestionsRoutesDeps {
  rbac: Rbac
  questionsStore: QuestionsStore
  // slice-19 (ADR 0015): source of the per-role question-edit permissions enforced on writes.
  settingsStore: SettingsStore
}

/**
 * Route Ngan hang cau hoi (slice-3). Admin + Teacher duoc doc (RBAC that).
 * slice-19 (ADR 0015): cac route GHI (POST/PATCH/DELETE/import) chi cho qua khi settings bat
 * quyen sua cho role cua phien; Superadmin luon qua; bang settings trong -> dung mac dinh han che.
 * Enforce o SERVER, khong phu thuoc UI an nut.
 * Import validate strict theo Question Import Schema: sai field/enum -> 400, khong luu gi.
 */
export async function questionsRoutes(
  app: FastifyInstance,
  deps: QuestionsRoutesDeps,
): Promise<void> {
  const { rbac, questionsStore, settingsStore } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')
  // Ai co the "cham toi" route ghi (role hop le se duoc loc tiep theo settings ben duoi).
  const requireEditor = rbac.requireRole('admin', 'teacher', 'staff')

  /**
   * preHandler cho route GHI: sau khi xac thuc role hop le, doc settings quyen sua cau hoi
   * va chan 403 neu role cua phien bi tat. Superadmin luon qua. Settings trong -> mac dinh.
   */
  async function requireCanEdit(
    request: Parameters<ReturnType<Rbac['requireRole']>>[0],
    reply: Parameters<ReturnType<Rbac['requireRole']>>[1],
  ): Promise<void> {
    await requireEditor(request, reply)
    if (reply.sent) return
    const user = getSessionUser(request)
    if (user.role === 'superadmin') return
    const perms = await getQuestionEditPermissions(settingsStore)
    if (!perms[user.role as keyof typeof perms]) {
      reply.code(403).send({ error: 'Vai trò của bạn không được phép sửa câu hỏi' })
    }
  }

  app.get('/questions', { preHandler: requireManager }, async () => {
    const questions = await listQuestions(questionsStore)
    const body: QuestionList = { questions }
    return body
  })

  app.post('/questions', { preHandler: requireCanEdit }, async (request, reply) => {
    const parsed = CreateQuestionRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu cau hoi khong hop le' }
    }
    const outcome = await createQuestion(questionsStore, parsed.data)
    if (!outcome.ok) {
      reply.code(400)
      return { error: 'Cap do khong ton tai' }
    }
    reply.code(201)
    const body: QuestionResponse = { question: outcome.question }
    return body
  })

  app.patch('/questions/:id', { preHandler: requireCanEdit }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateQuestionRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu cap nhat khong hop le' }
    }
    let outcome: Awaited<ReturnType<typeof updateQuestion>>
    try {
      outcome = await updateQuestion(questionsStore, id, parsed.data)
    } catch (err) {
      if (isHeldByExamSet(err)) return reply.code(409).send(HELD_BY_EXAM_SET)
      throw err
    }
    if (!outcome.ok) {
      reply.code(outcome.reason === 'not_found' ? 404 : 400)
      return {
        error: outcome.reason === 'not_found' ? 'Khong tim thay cau hoi' : 'Cap do khong ton tai',
      }
    }
    const body: QuestionResponse = { question: outcome.question }
    return body
  })

  app.delete('/questions/:id', { preHandler: requireCanEdit }, async (request, reply) => {
    const { id } = request.params as { id: string }
    let ok: boolean
    try {
      ok = await deleteQuestion(questionsStore, id)
    } catch (err) {
      if (isHeldByExamSet(err)) return reply.code(409).send(HELD_BY_EXAM_SET)
      throw err
    }
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay cau hoi' }
    }
    reply.code(204)
    return null
  })

  app.post('/questions/import', { preHandler: requireCanEdit }, async (request, reply) => {
    const parsed = ImportQuestionsRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu import khong hop le' }
    }
    const outcome = await importQuestions(questionsStore, parsed.data.rows)
    if (!outcome.ok) {
      reply.code(400)
      return { error: 'Import that bai: du lieu sai dinh dang', errors: outcome.errors }
    }
    reply.code(201)
    const body: ImportQuestionsResult = outcome.result
    return body
  })
}
