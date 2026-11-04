import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  CreateAiRequestRequest,
  SubmitAiResultsRequest,
  UpdateAiItemRequest,
  type AiRequestDetail,
  type AiRequestList,
  type SaveAiRequestResult,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import {
  createAiRequest,
  getAiRequest,
  listAiRequests,
  saveAiRequest,
  submitAiResults,
  updateAiItem,
  type AiFailure,
  type AiGenerationStore,
  type AiOutcome,
} from './service.js'

interface AiGenerationRoutesDeps {
  rbac: Rbac
  aiGenerationStore: AiGenerationStore
}

const FAILURES: Record<AiFailure, { code: number; error: string }> = {
  not_found: { code: 404, error: 'Khong tim thay yeu cau sinh cau hoi' },
  level_not_found: { code: 400, error: 'Cap do khong ton tai' },
  invalid_samples: { code: 400, error: 'Cau hoi mau phai co trong ngan hang, cung cap do va ky nang' },
  invalid_rows: { code: 400, error: 'Ket qua AI sai dinh dang Question Import Schema' },
  wrong_status: { code: 409, error: 'Trang thai yeu cau khong cho phep thao tac nay' },
  nothing_approved: { code: 409, error: 'Chua co cau hoi nao duoc duyet' },
}

function sendFailure(reply: FastifyReply, outcome: Extract<AiOutcome<unknown>, { ok: false }>) {
  const { code, error } = FAILURES[outcome.reason]
  reply.code(code)
  return outcome.errors ? { error, errors: outcome.errors } : { error }
}

/** slice-4.5 routes. Admin sees every request; a teacher only the requests they created. */
export async function aiGenerationRoutes(
  app: FastifyInstance,
  deps: AiGenerationRoutesDeps,
): Promise<void> {
  const { rbac, aiGenerationStore: store } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')

  app.post('/ai-requests', { preHandler: requireManager }, async (request, reply) => {
    const parsed = CreateAiRequestRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu yeu cau khong hop le' }
    }
    const outcome = await createAiRequest(store, getSessionUser(request), parsed.data)
    if (!outcome.ok) return sendFailure(reply, outcome)
    reply.code(201)
    const body: AiRequestDetail = outcome.data
    return body
  })

  app.get('/ai-requests', { preHandler: requireManager }, async (request) => {
    const body: AiRequestList = { requests: await listAiRequests(store, getSessionUser(request)) }
    return body
  })

  app.get('/ai-requests/:id', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const outcome = await getAiRequest(store, getSessionUser(request), id)
    if (!outcome.ok) return sendFailure(reply, outcome)
    const body: AiRequestDetail = outcome.data
    return body
  })

  app.post('/ai-requests/:id/results', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = SubmitAiResultsRequest.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { error: parsed.error.issues[0]?.message ?? 'Du lieu import khong hop le' }
    }
    const outcome = await submitAiResults(store, getSessionUser(request), id, parsed.data.rows)
    if (!outcome.ok) return sendFailure(reply, outcome)
    const body: AiRequestDetail = outcome.data
    return body
  })

  app.patch(
    '/ai-requests/:id/items/:itemId',
    { preHandler: requireManager },
    async (request, reply) => {
      const { id, itemId } = request.params as { id: string; itemId: string }
      const parsed = UpdateAiItemRequest.safeParse(request.body)
      if (!parsed.success) {
        reply.code(400)
        return { error: parsed.error.issues[0]?.message ?? 'Du lieu cap nhat khong hop le' }
      }
      const outcome = await updateAiItem(store, getSessionUser(request), id, itemId, parsed.data)
      if (!outcome.ok) return sendFailure(reply, outcome)
      const body: AiRequestDetail = outcome.data
      return body
    },
  )

  app.post('/ai-requests/:id/save', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const outcome = await saveAiRequest(store, getSessionUser(request), id)
    if (!outcome.ok) return sendFailure(reply, outcome)
    const body: SaveAiRequestResult = outcome.data
    return body
  })
}
