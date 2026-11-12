import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  AddExamSetQuestionRequest,
  CommitExamSetImportRequest,
  CreateExamSetRequest,
  EXAM_IMPORT_MAX_BYTES,
  ExamSetImportPreviewQuery,
  ExamSetListQuery,
  ReplaceExamSetItemsRequest,
  UpdateExamSetRequest,
  type ExamSetList,
  type ExamSetPublishIssue,
  type ExamSetResponse,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import {
  addExamSetQuestion,
  archiveExamSet,
  createExamSet,
  deleteExamSet,
  duplicateExamSet,
  getExamSet,
  listExamSets,
  publishExamSet,
  replaceExamSetItems,
  updateExamSet,
  type ExamSetsStore,
} from './service.js'
import { attachImportImages, commitImport, previewImport, type ImportMedia } from './import-service.js'

const IdParam = z.object({ id: z.string().uuid() })

const ERRORS = {
  not_found: { status: 404, error: 'Khong tim thay bo de' },
  not_draft: { status: 409, error: 'Bo de da phat hanh, khong the sua' },
  not_published: { status: 409, error: 'Chi luu tru bo de da phat hanh' },
  level_not_found: { status: 400, error: 'Cap do khong ton tai' },
  media_not_found: { status: 400, error: 'Hinh anh dinh kem khong ton tai' },
  too_many_items: { status: 409, error: 'Bo de da du so cau toi da' },
  invalid_items: { status: 400, error: 'Danh sach cau hoi khong hop le' },
  invalid_set: { status: 400, error: 'Bo de chua du dieu kien phat hanh' },
} as const

type Failure = { reason: keyof typeof ERRORS; issues?: ExamSetPublishIssue[] } | { reason: 'invalid_question'; message: string }

function fail(reply: FastifyReply, failure: Failure) {
  if (failure.reason === 'invalid_question') {
    return reply.code(400).send({ error: failure.message, code: failure.reason })
  }
  const { status, error } = ERRORS[failure.reason]
  return reply.code(status).send({ error, code: failure.reason, ...(failure.issues ? { issues: failure.issues } : {}) })
}

/** A DB trigger rejects writes to a non-draft set (race with publish) with restrict_violation. */
async function guardImmutable<T>(reply: FastifyReply, run: () => Promise<T>): Promise<T | FastifyReply> {
  try {
    return await run()
  } catch (err) {
    if ((err as { code?: unknown } | null)?.code === '23001') return fail(reply, { reason: 'not_draft' })
    throw err
  }
}

interface ExamSetsRoutesDeps {
  rbac: Rbac
  examSetsStore: ExamSetsStore
  /** Where Word-embedded images are stored at preview (slice-12.2). */
  media: ImportMedia
}

/**
 * Bo de co dinh (slice-11a, ADR 0011): chi Admin/Teacher. Hoc vien khong co duong nao doc noi dung bo de;
 * ho chi nhan cau hoi (khong dap an) qua luot thi trong cua so thi (feature exams).
 */
export async function examSetsRoutes(app: FastifyInstance, deps: ExamSetsRoutesDeps): Promise<void> {
  const { rbac, examSetsStore: store } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')

  // slice-11b: the import file is sent as the raw request body (no multipart dependency).
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: EXAM_IMPORT_MAX_BYTES },
    (_request, body, done) => done(null, body))

  app.post('/exam-sets/import/preview', { preHandler: requireManager, bodyLimit: EXAM_IMPORT_MAX_BYTES }, async (request, reply) => {
    const query = ExamSetImportPreviewQuery.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: query.error.issues[0]?.message ?? 'Thong tin import khong hop le' })
    if (!Buffer.isBuffer(request.body)) {
      return reply.code(415).send({ error: 'Gui file voi Content-Type application/octet-stream' })
    }
    const outcome = previewImport(request.body, query.data)
    if (!outcome.ok) return reply.code(400).send({ error: outcome.message, code: 'invalid_file' })
    return attachImportImages(outcome.preview, outcome.images, deps.media, getSessionUser(request).id)
  })

  app.post('/exam-sets/import/commit', { preHandler: requireManager, bodyLimit: 5 * 1024 * 1024 }, async (request, reply) => {
    const parsed = CommitExamSetImportRequest.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Du lieu import khong hop le' })
    const outcome = await commitImport(store, parsed.data, getSessionUser(request).id)
    if (outcome.ok) return reply.code(201).send({ examSet: outcome.examSet } satisfies ExamSetResponse)
    if (outcome.reason !== 'invalid_import') return fail(reply, { reason: outcome.reason })
    return reply.code(400).send({
      error: 'Du lieu import khong hop le',
      code: 'invalid_import',
      errors: outcome.errors.map((e) => ({ row: e.block ?? 0, field: e.field, message: e.message })),
    })
  })

  app.get('/exam-sets', { preHandler: requireManager }, async (request, reply) => {
    const query = ExamSetListQuery.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: query.error.issues[0]?.message ?? 'Bo loc khong hop le' })
    return { examSets: await listExamSets(store, query.data) } satisfies ExamSetList
  })

  app.post('/exam-sets', { preHandler: requireManager }, async (request, reply) => {
    const parsed = CreateExamSetRequest.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Du lieu bo de khong hop le' })
    const outcome = await createExamSet(store, parsed.data, getSessionUser(request).id)
    if (!outcome.ok) return fail(reply, outcome)
    return reply.code(201).send({ examSet: outcome.examSet } satisfies ExamSetResponse)
  })

  app.get('/exam-sets/:id', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    const outcome = await getExamSet(store, params.data.id)
    if (!outcome.ok) return fail(reply, outcome)
    return { examSet: outcome.examSet } satisfies ExamSetResponse
  })

  app.patch('/exam-sets/:id', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    const parsed = UpdateExamSetRequest.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Du lieu bo de khong hop le' })
    return guardImmutable(reply, async () => {
      const outcome = await updateExamSet(store, params.data.id, parsed.data)
      if (!outcome.ok) return fail(reply, outcome)
      return { examSet: outcome.examSet } satisfies ExamSetResponse
    })
  })

  app.delete('/exam-sets/:id', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    return guardImmutable(reply, async () => {
      const outcome = await deleteExamSet(store, params.data.id)
      if (!outcome.ok) return fail(reply, outcome)
      return reply.code(204).send()
    })
  })

  app.put('/exam-sets/:id/items', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    const parsed = ReplaceExamSetItemsRequest.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Danh sach cau hoi khong hop le' })
    return guardImmutable(reply, async () => {
      const outcome = await replaceExamSetItems(store, params.data.id, parsed.data.questionIds)
      if (!outcome.ok) return fail(reply, outcome)
      return { examSet: outcome.examSet } satisfies ExamSetResponse
    })
  })

  app.post('/exam-sets/:id/questions', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    const parsed = AddExamSetQuestionRequest.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Du lieu cau hoi khong hop le' })
    return guardImmutable(reply, async () => {
      const outcome = await addExamSetQuestion(store, params.data.id, parsed.data)
      if (!outcome.ok) return fail(reply, outcome)
      return reply.code(201).send({ examSet: outcome.examSet } satisfies ExamSetResponse)
    })
  })

  app.post('/exam-sets/:id/publish', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    const outcome = await publishExamSet(store, params.data.id, new Date())
    if (!outcome.ok) return fail(reply, outcome)
    return { examSet: outcome.examSet } satisfies ExamSetResponse
  })

  app.post('/exam-sets/:id/archive', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    const outcome = await archiveExamSet(store, params.data.id)
    if (!outcome.ok) return fail(reply, outcome)
    return { examSet: outcome.examSet } satisfies ExamSetResponse
  })

  app.post('/exam-sets/:id/duplicate', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, { reason: 'not_found' })
    const outcome = await duplicateExamSet(store, params.data.id, getSessionUser(request).id)
    if (!outcome.ok) return fail(reply, outcome)
    return reply.code(201).send({ examSet: outcome.examSet } satisfies ExamSetResponse)
  })
}
