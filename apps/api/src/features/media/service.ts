import { createHash } from 'node:crypto'
import {
  MEDIA_MAX_BYTES,
  MEDIA_MAX_DIMENSION,
  mediaUrl,
  type MediaAsset,
  type MediaMime,
  type QuestionMediaItem,
  type QuestionMediaList,
  type UserRole,
} from '@lms/shared'
import { sniffImage, stripMetadata } from './image.js'
import type { MediaStorage } from './storage.js'

/** Question images (slice-12, ADR 0013): upload, access check, question links. */

export interface MediaAssetRow {
  id: string
  sha256: string
  mime: string
  bytes: number
  width: number
  height: number
  storage_key: string
}

export type NewMediaAsset = Omit<MediaAssetRow, 'id'> & { created_by: string }

export interface QuestionMediaRow {
  media_id: string
  slot: string
  option_index: number | null
}

export interface MediaStore {
  findAssetBySha: (sha256: string) => Promise<MediaAssetRow | undefined>
  /** Inserts or, when the same content raced in first, returns the existing asset. */
  insertAsset: (fields: NewMediaAsset) => Promise<MediaAssetRow>
  findAssetById: (id: string) => Promise<MediaAssetRow | undefined>
  countAssets: (ids: string[]) => Promise<number>
  isInStudentAttempt: (mediaId: string, studentId: string) => Promise<boolean>
  findQuestionOptions: (questionId: string) => Promise<{ options: string | null } | undefined>
  listQuestionMedia: (questionId: string) => Promise<QuestionMediaRow[]>
  replaceQuestionMedia: (questionId: string, items: QuestionMediaItem[]) => Promise<void>
}

const MANAGER_ROLES: readonly UserRole[] = ['admin', 'teacher']

function toAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id, mime: row.mime as MediaMime, bytes: row.bytes, width: row.width, height: row.height, url: mediaUrl(row.id),
  }
}

export type UploadOutcome =
  | { ok: true; media: MediaAsset }
  | { ok: false; reason: 'empty' | 'too_large' | 'unsupported_type' | 'too_many_pixels' }

export async function uploadMedia(
  store: MediaStore, storage: MediaStorage, body: Buffer, userId: string,
): Promise<UploadOutcome> {
  if (body.length === 0) return { ok: false, reason: 'empty' }
  if (body.length > MEDIA_MAX_BYTES) return { ok: false, reason: 'too_large' }
  const info = sniffImage(body)
  if (!info) return { ok: false, reason: 'unsupported_type' }
  const fits = (n: number) => n >= 1 && n <= MEDIA_MAX_DIMENSION
  if (!fits(info.width) || !fits(info.height)) return { ok: false, reason: 'too_many_pixels' }
  const clean = stripMetadata(body, info.mime)
  const sha256 = createHash('sha256').update(clean).digest('hex')
  const existing = await store.findAssetBySha(sha256)
  if (existing) return { ok: true, media: toAsset(existing) }
  await storage.put(sha256, clean)
  const row = await store.insertAsset({
    sha256, mime: info.mime, bytes: clean.length, width: info.width, height: info.height,
    storage_key: sha256, created_by: userId,
  })
  return { ok: true, media: toAsset(row) }
}

export type ReadOutcome = { ok: true; mime: string; data: Buffer } | { ok: false; reason: 'not_found' }

/** Managers read any asset; a student only assets frozen into one of their own attempts. */
export async function readMedia(
  store: MediaStore, storage: MediaStorage, id: string, user: { id: string; role: UserRole },
): Promise<ReadOutcome> {
  const asset = await store.findAssetById(id)
  if (!asset) return { ok: false, reason: 'not_found' }
  const allowed = MANAGER_ROLES.includes(user.role)
    || (user.role === 'student' && (await store.isInStudentAttempt(id, user.id)))
  if (!allowed) return { ok: false, reason: 'not_found' }
  const data = await storage.get(asset.storage_key)
  if (!data) throw new Error(`Media blob missing for asset ${asset.id}`)
  return { ok: true, mime: asset.mime, data }
}

function toMediaList(rows: QuestionMediaRow[]): QuestionMediaList {
  return {
    media: rows.map((r) => ({
      mediaId: r.media_id, slot: r.slot === 'option' ? 'option' : 'stem', optionIndex: r.option_index, url: mediaUrl(r.media_id),
    })),
  }
}

export type QuestionMediaOutcome =
  | { ok: true; list: QuestionMediaList }
  | { ok: false; reason: 'not_found' | 'media_not_found' | 'invalid_option' }

export async function getQuestionMedia(store: MediaStore, questionId: string): Promise<QuestionMediaOutcome> {
  if (!(await store.findQuestionOptions(questionId))) return { ok: false, reason: 'not_found' }
  return { ok: true, list: toMediaList(await store.listQuestionMedia(questionId)) }
}

function optionCount(options: string | null): number {
  if (!options) return 0
  const parsed: unknown = JSON.parse(options)
  return Array.isArray(parsed) ? parsed.length : 0
}

export async function setQuestionMedia(
  store: MediaStore, questionId: string, items: QuestionMediaItem[],
): Promise<QuestionMediaOutcome> {
  const question = await store.findQuestionOptions(questionId)
  if (!question) return { ok: false, reason: 'not_found' }
  const count = optionCount(question.options)
  if (items.some((m) => m.optionIndex !== null && m.optionIndex >= count)) return { ok: false, reason: 'invalid_option' }
  const ids = [...new Set(items.map((m) => m.mediaId))]
  if (ids.length > 0 && (await store.countAssets(ids)) !== ids.length) return { ok: false, reason: 'media_not_found' }
  await store.replaceQuestionMedia(questionId, items)
  return { ok: true, list: toMediaList(await store.listQuestionMedia(questionId)) }
}
