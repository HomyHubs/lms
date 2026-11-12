import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'
import { makeAiGenerationStore } from './store.js'

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const TEACHER_ID = '62000000-0000-4000-8000-000000000011'
const PAYLOAD = JSON.stringify({
  level: 'starter',
  skill: 'reading',
  question_type: 'fill_blank',
  difficulty: 'easy',
  question_text: 'I have two ___ (cat).',
  correct_answer: 'cats',
})

describeWithPostgres('ai generation store on real Postgres', () => {
  let db: AppDb

  async function cleanup(): Promise<void> {
    const requests = db.selectFrom('ai_generation_requests').select('id').where('created_by', '=', TEACHER_ID)
    const saved = await db
      .selectFrom('ai_generated_items')
      .select('question_id')
      .where('request_id', 'in', requests)
      .where('question_id', 'is not', null)
      .execute()
    await db.deleteFrom('ai_generation_requests').where('created_by', '=', TEACHER_ID).execute()
    const questionIds = saved.map((s) => s.question_id!)
    if (questionIds.length > 0) await db.deleteFrom('questions').where('id', 'in', questionIds).execute()
    await db.deleteFrom('users').where('id', '=', TEACHER_ID).execute()
  }

  beforeAll(async () => {
    db = createDb(url!)
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await cleanup()
    await db
      .insertInto('users')
      .values({ id: TEACHER_ID, phone_number: '0900000711', password_hash: 'test', role: 'teacher' })
      .execute()
  })

  afterAll(async () => {
    if (!db) return
    try {
      await cleanup()
    } finally {
      await db.destroy()
    }
  })

  it('guards status transitions in SQL and saves approved items as ai_generated questions', async () => {
    const store = makeAiGenerationStore(db)
    const level = await store.findLevelByCode('starter')
    const request = await store.createRequest({
      createdBy: TEACHER_ID,
      levelId: level!.id,
      skill: 'reading',
      questionType: 'fill_blank',
      difficulty: null,
      count: 2,
      sampleQuestionIds: [],
      prompt: 'prompt text',
    })
    expect(request).toMatchObject({ level_code: 'starter', status: 'draft', sample_question_ids: '[]' })
    expect((await store.listRequests(TEACHER_ID)).map((r) => r.id)).toEqual([request.id])

    expect(await store.replaceItems(request.id, [PAYLOAD, PAYLOAD])).toBe(true)
    expect(await store.replaceItems(request.id, [PAYLOAD])).toBe(true)
    const [item] = await store.listItems(request.id)
    expect(await store.listItems(request.id)).toHaveLength(1)
    expect(item).toMatchObject({ position: 1, status: 'pending', question_id: null })

    expect(await store.updateItem(request.id, item!.id, { status: 'approved' })).toBe(true)
    const fields = {
      levelId: level!.id,
      skill: 'reading' as const,
      questionType: 'fill_blank' as const,
      difficulty: 'easy' as const,
      questionText: 'I have two ___ (cat).',
      options: null,
      correctAnswer: 'cats',
      explanation: null,
      sourceReference: null,
      source: 'ai_generated' as const,
    }
    expect(await store.saveApproved(request.id, [{ itemId: item!.id, fields }])).toBeNull()

    await store.setRequestStatus(request.id, 'reviewed')
    expect(await store.saveApproved(request.id, [{ itemId: item!.id, fields }])).toBe(1)
    expect(await store.replaceItems(request.id, [PAYLOAD])).toBe(false)
    expect(await store.updateItem(request.id, item!.id, { status: 'rejected' })).toBe(false)

    const [savedItem] = await store.listItems(request.id)
    expect(savedItem!.status).toBe('saved')
    const question = await db
      .selectFrom('questions')
      .select(['source', 'question_text', 'points'])
      .where('id', '=', savedItem!.question_id!)
      .executeTakeFirstOrThrow()
    expect(question).toEqual({ source: 'ai_generated', question_text: 'I have two ___ (cat).', points: 1 })
    expect((await store.findRequest(request.id))!.status).toBe('saved_to_bank')
  })
})
