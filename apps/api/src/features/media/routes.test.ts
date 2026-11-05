import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { MEDIA_MAX_BYTES, type MediaResponse, type QuestionMediaItem, type QuestionMediaList } from '@lms/shared'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import { mediaRoutes } from './routes.js'
import type { MediaAssetRow, MediaStore, QuestionMediaRow } from './service.js'
import { makeMemoryMediaStorage } from './storage.js'

const TEACHER: UserRecord = { id: '70000000-0000-4000-8000-000000000001', phone_number: '0911000001', password_hash: 'x', role: 'teacher' }
const STUDENT: UserRecord = { id: '80000000-0000-4000-8000-000000000001', phone_number: '0933000001', password_hash: 'x', role: 'student' }
const QUESTION_ID = '90000000-0000-4000-8000-000000000001'
const PUBLISHED_QUESTION_ID = '90000000-0000-4000-8000-000000000002'
const COOKIE = { cookie: `${SESSION_COOKIE}=any-token` }

function tinyPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(2, 0)
  header.writeUInt32BE(3, 4)
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IEND', Buffer.alloc(0))])
}

function makeFakeAuthStore(sessionUser: UserRecord): AuthStore {
  return {
    async findUserByPhone() { return undefined },
    async findUserById(id) { return sessionUser.id === id ? sessionUser : undefined },
    async createSession() {},
    async findSession() { return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) } },
    async deleteSession() {},
  }
}

/** Questions: QUESTION_ID has 3 options; PUBLISHED_QUESTION_ID behaves like the DB trigger (23001). */
function makeFakeStore(): MediaStore & { attemptMedia: Set<string> } {
  const assets: MediaAssetRow[] = []
  const links = new Map<string, QuestionMediaRow[]>()
  const attemptMedia = new Set<string>()
  return {
    attemptMedia,
    async findAssetBySha(sha256) { return assets.find((a) => a.sha256 === sha256) },
    async insertAsset(fields) {
      const row = { ...fields, id: `a0000000-0000-4000-8000-${String(assets.length + 1).padStart(12, '0')}` }
      assets.push(row)
      return row
    },
    async findAssetById(id) { return assets.find((a) => a.id === id) },
    async countAssets(ids) { return assets.filter((a) => ids.includes(a.id)).length },
    async isInStudentAttempt(mediaId) { return attemptMedia.has(mediaId) },
    async findQuestionOptions(id) {
      return [QUESTION_ID, PUBLISHED_QUESTION_ID].includes(id) ? { options: JSON.stringify(['a', 'b', 'c']) } : undefined
    },
    async listQuestionMedia(id) { return links.get(id) ?? [] },
    async replaceQuestionMedia(id, items: QuestionMediaItem[]) {
      if (id === PUBLISHED_QUESTION_ID) throw Object.assign(new Error('immutable'), { code: '23001' })
      links.set(id, items.map((m) => ({ media_id: m.mediaId, slot: m.slot, option_index: m.optionIndex })))
    },
  }
}

describe('media routes', () => {
  const apps: FastifyInstance[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  async function client(sessionUser: UserRecord, store: MediaStore, storage = makeMemoryMediaStorage()) {
    const app = Fastify({ logger: false })
    await app.register(cookie)
    await mediaRoutes(app, { rbac: makeRbac(makeFakeAuthStore(sessionUser)), mediaStore: store, mediaStorage: storage })
    apps.push(app)
    return app
  }

  function upload(app: FastifyInstance, payload: Buffer) {
    return app.inject({ method: 'POST', url: '/media', payload, headers: { ...COOKIE, 'content-type': 'application/octet-stream' } })
  }

  it('only managers upload; non-images and bodies over 2MB are rejected', async () => {
    const store = makeFakeStore()
    const student = await client(STUDENT, store)
    expect((await upload(student, tinyPng())).statusCode).toBe(403)
    const teacher = await client(TEACHER, store)
    expect((await upload(teacher, Buffer.from('MZ fake executable named photo.png'))).statusCode).toBe(415)
    const tooBig = await upload(teacher, Buffer.concat([tinyPng(), Buffer.alloc(MEDIA_MAX_BYTES)]))
    expect(tooBig.statusCode).toBe(413)
    expect(tooBig.json()).toMatchObject({ code: 'too_large' })
    const created = await upload(teacher, tinyPng())
    expect(created.statusCode).toBe(201)
    expect(created.json<MediaResponse>().media).toMatchObject({ mime: 'image/png', width: 2, height: 3 })
  })

  it('serves an image privately; a student sees it only through their own attempt', async () => {
    const store = makeFakeStore()
    const storage = makeMemoryMediaStorage()
    const teacher = await client(TEACHER, store, storage)
    const { media } = (await upload(teacher, tinyPng())).json<MediaResponse>()

    const served = await teacher.inject({ method: 'GET', url: `/media/${media.id}`, headers: COOKIE })
    expect(served.statusCode).toBe(200)
    expect(served.headers['content-type']).toBe('image/png')
    expect(served.headers['cache-control']).toBe('private, max-age=86400')
    expect(served.headers['x-content-type-options']).toBe('nosniff')
    expect(served.rawPayload.equals(tinyPng())).toBe(true)

    const student = await client(STUDENT, store, storage)
    expect((await student.inject({ method: 'GET', url: `/media/${media.id}`, headers: COOKIE })).statusCode).toBe(404)
    store.attemptMedia.add(media.id)
    expect((await student.inject({ method: 'GET', url: `/media/${media.id}`, headers: COOKIE })).statusCode).toBe(200)
    expect((await student.inject({ method: 'GET', url: '/media/not-a-uuid', headers: COOKIE })).statusCode).toBe(404)
  })

  it('links images to a question; bad option, unknown image and published question are refused', async () => {
    const store = makeFakeStore()
    const teacher = await client(TEACHER, store)
    const { media } = (await upload(teacher, tinyPng())).json<MediaResponse>()
    const put = (questionId: string, body: unknown) =>
      teacher.inject({ method: 'PUT', url: `/questions/${questionId}/media`, payload: body as object, headers: COOKIE })

    expect((await put(QUESTION_ID, { media: [{ mediaId: media.id, slot: 'option', optionIndex: 3 }] })).statusCode).toBe(400)
    expect((await put(QUESTION_ID, { media: [{ mediaId: QUESTION_ID, slot: 'stem' }] })).json()).toMatchObject({ code: 'media_not_found' })
    expect((await put(PUBLISHED_QUESTION_ID, { media: [{ mediaId: media.id, slot: 'stem' }] })).statusCode).toBe(409)

    const saved = await put(QUESTION_ID, { media: [{ mediaId: media.id, slot: 'stem' }, { mediaId: media.id, slot: 'option', optionIndex: 1 }] })
    expect(saved.statusCode).toBe(200)
    expect(saved.json<QuestionMediaList>().media).toEqual([
      { mediaId: media.id, slot: 'stem', optionIndex: null, url: `/api/media/${media.id}` },
      { mediaId: media.id, slot: 'option', optionIndex: 1, url: `/api/media/${media.id}` },
    ])
    const student = await client(STUDENT, store)
    expect((await student.inject({ method: 'PUT', url: `/questions/${QUESTION_ID}/media`, payload: { media: [] }, headers: COOKIE })).statusCode).toBe(403)
  })
})
