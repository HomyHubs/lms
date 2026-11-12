import {
  QuestionImportRow,
  buildAiPrompt,
  type AiGeneratedItem,
  type AiGenerationRequest,
  type AiItemReviewStatus,
  type AiItemStatus,
  type AiRequestDetail,
  type AiRequestStatus,
  type LevelCode,
  type PublicUser,
  type QuestionDifficulty,
  type QuestionImportError,
  type QuestionSkill,
  type QuestionType,
} from '@lms/shared'
import type { CreateQuestionFields } from '../questions/index.js'

/**
 * slice-4.5: prompt generation + reverse import + review queue (ADR 0005).
 * Flow: draft (prompt built) -> imported (AI rows pasted, schema-valid) -> reviewed (no pending
 * item left) -> saved_to_bank (approved rows inserted as questions with source ai_generated).
 */

export interface AiRequestRow {
  id: string
  created_by: string
  level_id: string
  level_code: string
  skill: string
  question_type: string | null
  difficulty: string | null
  question_count: number
  sample_question_ids: string
  prompt: string
  status: string
  created_at: Date | string
  updated_at: Date | string
}

export interface AiItemRow {
  id: string
  request_id: string
  position: number
  payload: string
  status: string
  question_id: string | null
}

export interface SampleQuestionRow {
  id: string
  level_id: string
  skill: string
  question_type: string
  difficulty: string
  question_text: string
  options: string | null
  correct_answer: string
  points: number
  explanation: string | null
}

export interface NewAiRequestFields {
  createdBy: string
  levelId: string
  skill: QuestionSkill
  questionType: QuestionType | null
  difficulty: QuestionDifficulty | null
  count: number
  sampleQuestionIds: string[]
  prompt: string
}

export interface ApprovedItemToSave {
  itemId: string
  fields: CreateQuestionFields
}

export interface AiGenerationStore {
  findLevelByCode: (code: string) => Promise<{ id: string; code: string } | undefined>
  findQuestionsByIds: (ids: string[]) => Promise<SampleQuestionRow[]>
  createRequest: (fields: NewAiRequestFields) => Promise<AiRequestRow>
  /** All requests when `createdBy` is undefined, otherwise only that user's. Newest first. */
  listRequests: (createdBy?: string) => Promise<AiRequestRow[]>
  findRequest: (id: string) => Promise<AiRequestRow | undefined>
  listItems: (requestId: string) => Promise<AiItemRow[]>
  /** Replaces the queue and moves the request to `imported`; false when it is no longer draft/imported. */
  replaceItems: (requestId: string, payloads: string[]) => Promise<boolean>
  /** false when the item does not exist in that request or is already saved. */
  updateItem: (
    requestId: string,
    itemId: string,
    patch: { payload?: string; status?: AiItemReviewStatus },
  ) => Promise<boolean>
  setRequestStatus: (requestId: string, status: AiRequestStatus) => Promise<void>
  /** One transaction: reviewed -> saved_to_bank, insert questions, mark items saved. null if not reviewed. */
  saveApproved: (requestId: string, items: ApprovedItemToSave[]) => Promise<number | null>
}

export type Actor = Pick<PublicUser, 'id' | 'role'>

export interface CreateAiRequestInput {
  level: LevelCode
  skill: QuestionSkill
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  count: number
  sampleQuestionIds: string[]
  notes?: string
}

export type AiFailure =
  | 'not_found'
  | 'level_not_found'
  | 'invalid_samples'
  | 'invalid_rows'
  | 'wrong_status'
  | 'nothing_approved'

export type AiOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AiFailure; errors?: QuestionImportError[] }

const IMPORTABLE_STATUSES: readonly string[] = ['draft', 'imported']
const REVIEWABLE_STATUSES: readonly string[] = ['imported', 'reviewed']

function fail<T>(reason: AiFailure, errors?: QuestionImportError[]): AiOutcome<T> {
  return errors ? { ok: false, reason, errors } : { ok: false, reason }
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

function parseStringArray(raw: string | null): string[] | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

function toRequest(row: AiRequestRow): AiGenerationRequest {
  return {
    id: row.id,
    createdBy: row.created_by,
    levelCode: row.level_code as LevelCode,
    skill: row.skill as QuestionSkill,
    questionType: row.question_type as QuestionType | null,
    difficulty: row.difficulty as QuestionDifficulty | null,
    count: row.question_count,
    sampleQuestionIds: parseStringArray(row.sample_question_ids) ?? [],
    prompt: row.prompt,
    status: row.status as AiRequestStatus,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

// Payloads are written only after QuestionImportRow validation, so they are trusted on read.
function toItem(row: AiItemRow): AiGeneratedItem {
  return {
    id: row.id,
    position: row.position,
    row: JSON.parse(row.payload) as QuestionImportRow,
    status: row.status as AiItemStatus,
    questionId: row.question_id,
  }
}

function canAccess(actor: Actor, row: AiRequestRow): boolean {
  return actor.role === 'admin' || row.created_by === actor.id
}

async function findAccessible(
  store: AiGenerationStore,
  actor: Actor,
  id: string,
): Promise<AiRequestRow | undefined> {
  const row = await store.findRequest(id)
  return row && canAccess(actor, row) ? row : undefined
}

async function loadDetail(store: AiGenerationStore, id: string): Promise<AiRequestDetail> {
  const [row, items] = await Promise.all([store.findRequest(id), store.listItems(id)])
  if (!row) throw new Error(`ai request ${id} vanished during the call`)
  return { request: toRequest(row), items: items.map(toItem) }
}

type RowCheck = { ok: true; row: QuestionImportRow } | { ok: false; error: QuestionImportError }

/** Strict Question Import Schema + the row must stay inside what the request asked for. */
export function validateAiRow(raw: unknown, request: AiRequestRow, rowNumber: number): RowCheck {
  const parsed = QuestionImportRow.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      ok: false,
      error: {
        row: rowNumber,
        field: issue && issue.path.length > 0 ? issue.path.join('.') : '(row)',
        message: issue?.message ?? 'Du lieu khong hop le',
      },
    }
  }
  const row = parsed.data
  const expected: [keyof QuestionImportRow, string | null][] = [
    ['level', request.level_code],
    ['skill', request.skill],
    ['question_type', request.question_type],
    ['difficulty', request.difficulty],
  ]
  for (const [field, value] of expected) {
    if (value !== null && row[field] !== value) {
      return {
        ok: false,
        error: { row: rowNumber, field, message: `Phai la "${value}" theo yeu cau da tao prompt` },
      }
    }
  }
  return { ok: true, row }
}

export async function createAiRequest(
  store: AiGenerationStore,
  actor: Actor,
  input: CreateAiRequestInput,
): Promise<AiOutcome<AiRequestDetail>> {
  const level = await store.findLevelByCode(input.level)
  if (!level) return fail('level_not_found')

  const sampleIds = [...new Set(input.sampleQuestionIds)]
  const found = sampleIds.length > 0 ? await store.findQuestionsByIds(sampleIds) : []
  const samples: SampleQuestionRow[] = []
  for (const id of sampleIds) {
    const q = found.find((candidate) => candidate.id === id)
    if (!q || q.level_id !== level.id || q.skill !== input.skill) return fail('invalid_samples')
    samples.push(q)
  }

  const prompt = buildAiPrompt({
    level: input.level,
    skill: input.skill,
    questionType: input.questionType,
    difficulty: input.difficulty,
    count: input.count,
    notes: input.notes,
    samples: samples.map((q) => ({
      question_type: q.question_type as QuestionType,
      difficulty: q.difficulty as QuestionDifficulty,
      question_text: q.question_text,
      options: parseStringArray(q.options),
      correct_answer: q.correct_answer,
      points: q.points,
      explanation: q.explanation,
    })),
  })

  const row = await store.createRequest({
    createdBy: actor.id,
    levelId: level.id,
    skill: input.skill,
    questionType: input.questionType ?? null,
    difficulty: input.difficulty ?? null,
    count: input.count,
    sampleQuestionIds: sampleIds,
    prompt,
  })
  return { ok: true, data: { request: toRequest(row), items: [] } }
}

export async function listAiRequests(
  store: AiGenerationStore,
  actor: Actor,
): Promise<AiGenerationRequest[]> {
  const rows = await store.listRequests(actor.role === 'admin' ? undefined : actor.id)
  return rows.map(toRequest)
}

export async function getAiRequest(
  store: AiGenerationStore,
  actor: Actor,
  id: string,
): Promise<AiOutcome<AiRequestDetail>> {
  const row = await findAccessible(store, actor, id)
  if (!row) return fail('not_found')
  return { ok: true, data: await loadDetail(store, id) }
}

/** All-or-nothing: one invalid row rejects the whole paste and nothing enters the queue. */
export async function submitAiResults(
  store: AiGenerationStore,
  actor: Actor,
  id: string,
  rows: unknown[],
): Promise<AiOutcome<AiRequestDetail>> {
  const request = await findAccessible(store, actor, id)
  if (!request) return fail('not_found')
  if (!IMPORTABLE_STATUSES.includes(request.status)) return fail('wrong_status')

  const errors: QuestionImportError[] = []
  const payloads: string[] = []
  rows.forEach((raw, i) => {
    const check = validateAiRow(raw, request, i + 1)
    if (check.ok) payloads.push(JSON.stringify(check.row))
    else errors.push(check.error)
  })
  if (errors.length > 0) return fail('invalid_rows', errors)

  const replaced = await store.replaceItems(id, payloads)
  if (!replaced) return fail('wrong_status')
  return { ok: true, data: await loadDetail(store, id) }
}

export async function updateAiItem(
  store: AiGenerationStore,
  actor: Actor,
  id: string,
  itemId: string,
  patch: { row?: unknown; status?: AiItemReviewStatus },
): Promise<AiOutcome<AiRequestDetail>> {
  const request = await findAccessible(store, actor, id)
  if (!request) return fail('not_found')
  if (!REVIEWABLE_STATUSES.includes(request.status)) return fail('wrong_status')

  const items = await store.listItems(id)
  const item = items.find((it) => it.id === itemId)
  if (!item) return fail('not_found')

  let payload: string | undefined
  if (patch.row !== undefined) {
    const check = validateAiRow(patch.row, request, item.position)
    if (!check.ok) return fail('invalid_rows', [check.error])
    payload = JSON.stringify(check.row)
  }
  const updated = await store.updateItem(id, itemId, { payload, status: patch.status })
  if (!updated) return fail('wrong_status')

  const statuses = items.map((it) => (it.id === itemId ? (patch.status ?? it.status) : it.status))
  const next: AiRequestStatus = statuses.includes('pending') ? 'imported' : 'reviewed'
  if (next !== request.status) await store.setRequestStatus(id, next)
  return { ok: true, data: await loadDetail(store, id) }
}

function toQuestionFields(levelId: string, row: QuestionImportRow): CreateQuestionFields {
  return {
    levelId,
    skill: row.skill,
    questionType: row.question_type,
    difficulty: row.difficulty,
    questionText: row.question_text,
    options: row.options ?? null,
    correctAnswer: row.correct_answer,
    points: row.points,
    explanation: row.explanation ?? null,
    sourceReference: row.source_reference ?? null,
    source: 'ai_generated',
  }
}

/** Saving requires a finished review (no pending item) and at least one approved item. */
export async function saveAiRequest(
  store: AiGenerationStore,
  actor: Actor,
  id: string,
): Promise<AiOutcome<AiRequestDetail & { saved: number }>> {
  const request = await findAccessible(store, actor, id)
  if (!request) return fail('not_found')
  if (request.status !== 'reviewed') return fail('wrong_status')

  const approved = (await store.listItems(id)).filter((it) => it.status === 'approved')
  if (approved.length === 0) return fail('nothing_approved')

  const saved = await store.saveApproved(
    id,
    approved.map((it) => ({ itemId: it.id, fields: toQuestionFields(request.level_id, toItem(it).row) })),
  )
  if (saved === null) return fail('wrong_status')
  return { ok: true, data: { saved, ...(await loadDetail(store, id)) } }
}
