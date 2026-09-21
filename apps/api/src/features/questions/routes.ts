import type { FastifyInstance } from 'fastify'
import {
  CreateQuestionRequest,
  ImportQuestionsRequest,
  UpdateQuestionRequest,
  type ImportQuestionsResult,
  type QuestionList,
  type QuestionResponse,
} from '@lms/shared'
import type { Rbac } from '../access/index.js'
import type { QuestionsStore } from './service.js'
import {
  createQuestion,
  deleteQuestion,
  importQuestions,
  listQuestions,
  updateQuestion,
} from './service.js'

interface QuestionsRoutesDeps {
  rbac: Rbac
  questionsStore: QuestionsStore
}

/**
 * Route Ngan hang cau hoi (slice-3). Admin + Teacher duoc CRUD va import (RBAC that).
 * Import validate strict theo Question Import Schema: sai field/enum -> 400, khong luu gi.
 */
export async function questionsRoutes(
  app: FastifyInstance,
  deps: QuestionsRoutesDeps,
): Promise<void> {
  const { rbac, questionsStore } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')

  app.get('/questions', { preHandler: requireManager }, async () => {
    const questions = await listQuestions(questionsStore)
    const body: QuestionList = { questions }
    return body
  })

  app.post('/questions', { preHandler: requireManager }, async (request, reply) => {
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

  app.patch('/questions/:id', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateQuestionRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu cap nhat khong hop le' }
    }
    const outcome = await updateQuestion(questionsStore, id, parsed.data)
    if (!outcome.ok) {
      reply.code(outcome.reason === 'not_found' ? 404 : 400)
      return {
        error: outcome.reason === 'not_found' ? 'Khong tim thay cau hoi' : 'Cap do khong ton tai',
      }
    }
    const body: QuestionResponse = { question: outcome.question }
    return body
  })

  app.delete('/questions/:id', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ok = await deleteQuestion(questionsStore, id)
    if (!ok) {
      reply.code(404)
      return { error: 'Khong tim thay cau hoi' }
    }
    reply.code(204)
    return null
  })

  app.post('/questions/import', { preHandler: requireManager }, async (request, reply) => {
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
