import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'kysely'
import { createDb, type AppDb } from '../../platform/db.js'
import { makeExamsStore } from './store.js'
import { startAttempt, submitAttempt } from './service.js'

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const MANAGER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = '22222222-2222-4222-8222-222222222222'
const QUESTION_IDS = [
  '33333333-3333-4333-8333-333333333331',
  '33333333-3333-4333-8333-333333333332',
]

describeWithPostgres('exams store on real Postgres', () => {
  let db: AppDb

  beforeAll(async () => {
    db = createDb(url!)
    await sql`truncate table exam_attempts, exams, questions, users cascade`.execute(db)
    await db
      .insertInto('users')
      .values([
        { id: MANAGER_ID, phone_number: '0900000001', password_hash: 'test', role: 'teacher' },
        { id: STUDENT_ID, phone_number: '0900000002', password_hash: 'test', role: 'student' },
      ])
      .execute()
    const level = await db.selectFrom('levels').select('id').where('code', '=', 'starter').executeTakeFirstOrThrow()
    await db
      .insertInto('questions')
      .values(
        QUESTION_IDS.map((id, index) => ({
          id,
          level_id: level.id,
          skill: 'reading',
          question_type: 'multiple_choice',
          difficulty: 'easy',
          question_text: `Question ${index + 1}`,
          options: JSON.stringify(['A', 'B']),
          correct_answer: 'A',
          points: 1,
        })),
      )
      .execute()
  })

  afterAll(async () => {
    if (db) await db.destroy()
  })

  it('round-trips store, resolves concurrent start to one attempt, and submits', async () => {
    const store = makeExamsStore(db)
    const level = await store.findLevelByCode('starter')
    expect(level).toBeDefined()
    const now = new Date()
    const exam = await store.createExam({
      title: 'Integration exam',
      levelId: level!.id,
      skill: 'reading',
      questionCount: 1,
      durationMinutes: 10,
      opensAt: new Date(now.getTime() - 60_000).toISOString(),
      closesAt: new Date(now.getTime() + 60_000).toISOString(),
      createdBy: MANAGER_ID,
    })

    const [first, second] = await Promise.all([
      startAttempt(store, exam.id, STUDENT_ID, now, () => 0),
      startAttempt(store, exam.id, STUDENT_ID, now, () => 0),
    ])
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    const count = await db
      .selectFrom('exam_attempts')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('exam_id', '=', exam.id)
      .where('student_id', '=', STUDENT_ID)
      .executeTakeFirstOrThrow()
    expect(Number(count.count)).toBe(1)

    const active = first.ok ? first.attempt : undefined
    expect(active?.questions).toHaveLength(1)
    expect(active?.questions[0]).not.toHaveProperty('correctAnswer')
    const questionId = active!.questions[0]!.id
    const submitted = await submitAttempt(
      store,
      exam.id,
      STUDENT_ID,
      { [questionId]: 'A', outsidePaper: 'ignored' },
      new Date(now.getTime() + 11 * 60_000),
    )
    expect(submitted.ok).toBe(true)
    if (submitted.ok) expect(submitted.attempt.answers).toEqual({ [questionId]: 'A' })
  })
})
