import {
  EXAM_SET_MAX_ITEMS,
  type AddExamSetQuestionRequest,
  type CreateExamSetRequest,
  type ExamSet,
  type ExamSetDetail,
  type ExamSetListQuery,
  type ExamSetPublishIssue,
  type ExamSetStatus,
  type LevelCode,
  type QuestionSkill,
  type UpdateExamSetRequest,
} from '@lms/shared'
import { normalizeAnswer } from '../exams/index.js'
import { toQuestion, type CreateQuestionFields, type LevelRef, type QuestionRow } from '../questions/index.js'

/**
 * Bo de co dinh — slice-11a (ADR 0011). Thuan, khong phu thuoc Fastify.
 * Chi bo de `draft` duoc sua; `published` bat bien (service + trigger DB), chi chuyen sang `archived`.
 */

export interface ExamSetRow {
  id: string
  title: string
  level_id: string
  level_code: string
  skill: string
  description: string | null
  status: string
  item_count: number
  created_by: string
  created_at: Date | string
  updated_at: Date | string
  published_at: Date | string | null
}

export interface ExamSetFilter {
  levelId?: string
  skill?: string
  status?: string
}

export interface CreateExamSetFields {
  title: string
  levelId: string
  skill: string
  description: string | null
  createdBy: string
}

/** An imported question plus the media ids shown under its stem (slice-12.2). */
export type ImportQuestionFields = CreateQuestionFields & { stemMediaIds: string[] }

export interface ExamSetsStore {
  findLevelByCode: (code: string) => Promise<LevelRef | undefined>
  listSets: (filter: ExamSetFilter) => Promise<ExamSetRow[]>
  findSet: (id: string) => Promise<ExamSetRow | undefined>
  createSet: (input: CreateExamSetFields) => Promise<ExamSetRow>
  updateSet: (id: string, patch: { title?: string; description?: string | null }) => Promise<ExamSetRow>
  deleteSet: (id: string) => Promise<void>
  /** Questions of the set in `position` order. */
  listItems: (id: string) => Promise<QuestionRow[]>
  findQuestions: (ids: string[]) => Promise<QuestionRow[]>
  /** Replaces the ordered list in one transaction (position = index + 1). */
  replaceItems: (id: string, questionIds: string[]) => Promise<void>
  /** Inserts a bank question (source exam_set) and appends it, in one transaction. */
  appendNewQuestion: (id: string, fields: CreateQuestionFields) => Promise<void>
  /** slice-11b: new draft set + its questions (source exam_set) and stem images in the given order, in one transaction. */
  importSet: (input: CreateExamSetFields, questions: ImportQuestionFields[]) => Promise<ExamSetRow>
  publish: (id: string, publishedAtIso: string) => Promise<ExamSetRow>
  archive: (id: string) => Promise<ExamSetRow>
  /** Copies metadata + items into a new draft. */
  duplicate: (id: string, title: string, createdBy: string) => Promise<ExamSetRow>
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString()
}

function toExamSet(row: ExamSetRow): ExamSet {
  return {
    id: row.id,
    title: row.title,
    levelId: row.level_id,
    levelCode: row.level_code as LevelCode,
    skill: row.skill as QuestionSkill,
    description: row.description,
    status: row.status as ExamSetStatus,
    itemCount: row.item_count,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    publishedAt: row.published_at === null ? null : toIso(row.published_at),
  }
}

async function toDetail(store: ExamSetsStore, row: ExamSetRow): Promise<ExamSetDetail> {
  const items = await store.listItems(row.id)
  return { ...toExamSet(row), items: items.map(toQuestion) }
}

function parseOptions(raw: string | null): string[] {
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : []
  } catch {
    return []
  }
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/** Publish rule for one question: same level/skill as the set; multiple choice has >= 2 options and a matching answer. */
export function questionIssue(q: Pick<QuestionRow, 'level_id' | 'skill' | 'question_type' | 'options' | 'correct_answer'>,
  set: Pick<ExamSetRow, 'level_id' | 'skill'>): string | null {
  if (q.level_id !== set.level_id || q.skill !== set.skill) return 'Cau hoi khac cap do/ky nang voi bo de'
  if (q.question_type !== 'multiple_choice') return null
  const options = parseOptions(q.options).map(normalizeAnswer)
  if (options.length < 2) return 'Cau trac nghiem can it nhat 2 lua chon'
  const answer = normalizeAnswer(q.correct_answer)
  const letterIndex = answer.length === 1 ? LETTERS.indexOf(answer) : -1
  if (!options.includes(answer) && !(letterIndex >= 0 && letterIndex < options.length)) {
    return 'Dap an dung phai khop mot lua chon'
  }
  return null
}

export async function listExamSets(store: ExamSetsStore, query: ExamSetListQuery): Promise<ExamSet[]> {
  let levelId: string | undefined
  if (query.level) {
    const level = await store.findLevelByCode(query.level)
    if (!level) return []
    levelId = level.id
  }
  const rows = await store.listSets({ levelId, skill: query.skill, status: query.status })
  return rows.map(toExamSet)
}

export type ExamSetOutcome<Extra extends string = never> =
  | { ok: true; examSet: ExamSetDetail }
  | { ok: false; reason: 'not_found' | Extra }

export async function getExamSet(store: ExamSetsStore, id: string): Promise<ExamSetOutcome> {
  const row = await store.findSet(id)
  return row ? { ok: true, examSet: await toDetail(store, row) } : { ok: false, reason: 'not_found' }
}

export async function createExamSet(
  store: ExamSetsStore, input: CreateExamSetRequest, createdBy: string,
): Promise<{ ok: true; examSet: ExamSetDetail } | { ok: false; reason: 'level_not_found' }> {
  const level = await store.findLevelByCode(input.level)
  if (!level) return { ok: false, reason: 'level_not_found' }
  const row = await store.createSet({
    title: input.title, levelId: level.id, skill: input.skill, description: input.description ?? null, createdBy,
  })
  return { ok: true, examSet: await toDetail(store, row) }
}

type DraftOutcome = { ok: true; row: ExamSetRow } | { ok: false; reason: 'not_found' | 'not_draft' }

async function loadDraft(store: ExamSetsStore, id: string): Promise<DraftOutcome> {
  const row = await store.findSet(id)
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.status !== 'draft') return { ok: false, reason: 'not_draft' }
  return { ok: true, row }
}

async function reloadDetail(store: ExamSetsStore, id: string): Promise<ExamSetDetail> {
  const row = await store.findSet(id)
  if (!row) throw new Error(`Exam set ${id} vanished during an update`)
  return toDetail(store, row)
}

export async function updateExamSet(
  store: ExamSetsStore, id: string, input: UpdateExamSetRequest,
): Promise<ExamSetOutcome<'not_draft'>> {
  const draft = await loadDraft(store, id)
  if (!draft.ok) return draft
  const row = await store.updateSet(id, { title: input.title, description: input.description })
  return { ok: true, examSet: await toDetail(store, row) }
}

export async function deleteExamSet(
  store: ExamSetsStore, id: string,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'not_draft' }> {
  const draft = await loadDraft(store, id)
  if (!draft.ok) return draft
  await store.deleteSet(id)
  return { ok: true }
}

export type ReplaceItemsOutcome =
  | { ok: true; examSet: ExamSetDetail }
  | { ok: false; reason: 'not_found' | 'not_draft' }
  | { ok: false; reason: 'invalid_items'; issues: ExamSetPublishIssue[] }

/** Every id must be a bank question of the set's level/skill; order is kept as given. */
export async function replaceExamSetItems(
  store: ExamSetsStore, id: string, questionIds: string[],
): Promise<ReplaceItemsOutcome> {
  const draft = await loadDraft(store, id)
  if (!draft.ok) return draft
  const found = new Map((await store.findQuestions(questionIds)).map((q) => [q.id, q]))
  const issues: ExamSetPublishIssue[] = []
  questionIds.forEach((questionId, index) => {
    const q = found.get(questionId)
    const position = index + 1
    if (!q) issues.push({ position, questionId, message: 'Khong tim thay cau hoi' })
    else if (q.level_id !== draft.row.level_id || q.skill !== draft.row.skill) {
      issues.push({ position, questionId, message: 'Cau hoi khac cap do/ky nang voi bo de' })
    }
  })
  if (issues.length > 0) return { ok: false, reason: 'invalid_items', issues }
  await store.replaceItems(id, questionIds)
  return { ok: true, examSet: await reloadDetail(store, id) }
}

export type AddQuestionOutcome =
  | { ok: true; examSet: ExamSetDetail }
  | { ok: false; reason: 'not_found' | 'not_draft' | 'too_many_items' }
  | { ok: false; reason: 'invalid_question'; message: string }

/** Authors a new objective question straight into the set (source `exam_set`, kept out of random papers). */
export async function addExamSetQuestion(
  store: ExamSetsStore, id: string, input: AddExamSetQuestionRequest,
): Promise<AddQuestionOutcome> {
  const draft = await loadDraft(store, id)
  if (!draft.ok) return draft
  if (draft.row.item_count >= EXAM_SET_MAX_ITEMS) return { ok: false, reason: 'too_many_items' }
  const options = input.questionType === 'multiple_choice' ? input.options ?? [] : null
  const message = questionIssue({
    level_id: draft.row.level_id,
    skill: draft.row.skill,
    question_type: input.questionType,
    options: options === null ? null : JSON.stringify(options),
    correct_answer: input.correctAnswer,
  }, draft.row)
  if (message) return { ok: false, reason: 'invalid_question', message }
  await store.appendNewQuestion(id, {
    levelId: draft.row.level_id,
    skill: draft.row.skill as QuestionSkill,
    questionType: input.questionType,
    difficulty: input.difficulty,
    questionText: input.questionText,
    options,
    correctAnswer: input.correctAnswer,
    points: input.points,
    explanation: input.explanation ?? null,
    sourceReference: null,
    source: 'exam_set',
  })
  return { ok: true, examSet: await reloadDetail(store, id) }
}

export type PublishOutcome =
  | { ok: true; examSet: ExamSetDetail }
  | { ok: false; reason: 'not_found' | 'not_draft' }
  | { ok: false; reason: 'invalid_set'; issues: ExamSetPublishIssue[] }

export async function publishExamSet(store: ExamSetsStore, id: string, now: Date): Promise<PublishOutcome> {
  const draft = await loadDraft(store, id)
  if (!draft.ok) return draft
  const items = await store.listItems(id)
  const issues: ExamSetPublishIssue[] = items.length === 0
    ? [{ position: null, questionId: null, message: 'Bo de can it nhat 1 cau hoi' }]
    : items.flatMap((q, index) => {
      const message = questionIssue(q, draft.row)
      return message ? [{ position: index + 1, questionId: q.id, message }] : []
    })
  if (issues.length > 0) return { ok: false, reason: 'invalid_set', issues }
  const row = await store.publish(id, now.toISOString())
  return { ok: true, examSet: await toDetail(store, row) }
}

export async function archiveExamSet(store: ExamSetsStore, id: string): Promise<ExamSetOutcome<'not_published'>> {
  const row = await store.findSet(id)
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.status !== 'published') return { ok: false, reason: 'not_published' }
  return { ok: true, examSet: await toDetail(store, await store.archive(id)) }
}

const COPY_SUFFIX = ' (ban sao)'

export async function duplicateExamSet(store: ExamSetsStore, id: string, createdBy: string): Promise<ExamSetOutcome> {
  const row = await store.findSet(id)
  if (!row) return { ok: false, reason: 'not_found' }
  const title = [...row.title].slice(0, 200 - COPY_SUFFIX.length).join('') + COPY_SUFFIX
  return { ok: true, examSet: await toDetail(store, await store.duplicate(id, title, createdBy)) }
}
