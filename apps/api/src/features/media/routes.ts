import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  MEDIA_MAX_BYTES,
  SetQuestionMediaRequest,
  type MediaResponse,
  type QuestionMediaList,
} from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import { getQuestionMedia, readMedia, setQuestionMedia, uploadMedia, type MediaStore } from './service.js'
import type { MediaStorage } from './storage.js'

const IdParam = z.object({ id: z.string().uuid() })

const ERRORS = {
  empty: { status: 400, error: 'Chua chon anh' },
  too_large: { status: 413, error: 'Anh toi da 2MB' },
  unsupported_type: { status: 415, error: 'Chi nhan anh PNG, JPEG, WebP hoac GIF' },
  too_many_pixels: { status: 400, error: 'Anh toi da 4000x4000 px' },
  not_found: { status: 404, error: 'Khong tim thay' },
  media_not_found: { status: 400, error: 'Anh khong ton tai' },
  invalid_option: { status: 400, error: 'Lua chon khong ton tai trong cau hoi' },
  published: { status: 409, error: 'Cau hoi thuoc bo de da phat hanh, khong the doi anh' },
} as const

function fail(reply: FastifyReply, reason: keyof typeof ERRORS) {
  const { status, error } = ERRORS[reason]
  return reply.code(status).send({ error, code: reason })
}

interface MediaRoutesDeps {
  rbac: Rbac
  mediaStore: MediaStore
  mediaStorage: MediaStorage
}

/** slice-12 (ADR 0013): image upload/serve + per-question image links. */
export async function mediaRoutes(app: FastifyInstance, deps: MediaRoutesDeps): Promise<void> {
  const { rbac, mediaStore: store, mediaStorage: storage } = deps
  const requireManager = rbac.requireRole('admin', 'teacher')
  const requireUser = rbac.requireRole()

  await app.register(async (scope) => {
    // Raw bytes, so the type is decided by magic bytes and no multipart dependency is needed. Another feature may
    // already own a root octet-stream parser (slice-11b import); uploadMedia enforces the 2MB limit either way.
    if (!scope.hasContentTypeParser('application/octet-stream')) {
      scope.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: MEDIA_MAX_BYTES },
        (_request, body, done) => done(null, body))
    }
    scope.setErrorHandler((err: FastifyError, _request, reply) => {
      if (err.code === 'FST_ERR_CTP_BODY_TOO_LARGE') return fail(reply, 'too_large')
      throw err
    })
    scope.post('/media', { preHandler: requireManager }, async (request, reply) => {
      const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0)
      const outcome = await uploadMedia(store, storage, body, getSessionUser(request).id)
      if (!outcome.ok) return fail(reply, outcome.reason)
      return reply.code(201).send({ media: outcome.media } satisfies MediaResponse)
    })
  })

  // A paper can hold dozens of images; the global 100/min limit would starve an exam page.
  app.get('/media/:id', { preHandler: requireUser, config: { rateLimit: { max: 600, timeWindow: '1 minute' } } }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, 'not_found')
    const outcome = await readMedia(store, storage, params.data.id, getSessionUser(request))
    if (!outcome.ok) return fail(reply, outcome.reason)
    return reply
      .header('content-type', outcome.mime)
      .header('cache-control', 'private, max-age=86400')
      .header('x-content-type-options', 'nosniff')
      .header('content-disposition', 'inline')
      .send(outcome.data)
  })

  app.get('/questions/:id/media', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, 'not_found')
    const outcome = await getQuestionMedia(store, params.data.id)
    if (!outcome.ok) return fail(reply, outcome.reason)
    return outcome.list satisfies QuestionMediaList
  })

  app.put('/questions/:id/media', { preHandler: requireManager }, async (request, reply) => {
    const params = IdParam.safeParse(request.params)
    if (!params.success) return fail(reply, 'not_found')
    const parsed = SetQuestionMediaRequest.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Danh sach anh khong hop le' })
    try {
      const outcome = await setQuestionMedia(store, params.data.id, parsed.data.media)
      if (!outcome.ok) return fail(reply, outcome.reason)
      return outcome.list satisfies QuestionMediaList
    } catch (err) {
      // DB trigger: images of a question held by a published exam set are frozen.
      if ((err as { code?: unknown } | null)?.code === '23001') return fail(reply, 'published')
      throw err
    }
  })
}
