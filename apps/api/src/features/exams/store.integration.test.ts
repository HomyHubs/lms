import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'kysely'
import { createDb, type AppDb } from '../../platform/db.js'
import { makeExamsStore } from './store.js'
import { createExam, startAttempt, submitAttempt, getAttempt, saveAttemptAnswers, gradeManually, listManualGradingQueue } from './service.js'
import { AddExamSetQuestionRequest } from '@lms/shared'
import { addExamSetQuestion, archiveExamSet, commitImport, createExamSet, makeExamSetsStore, publishExamSet } from '../examsets/index.js'

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
    // Only the known disposable databases: local slice-4 container and the CI service container (ci.yml).
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await db
      .insertInto('users')
      .values([
        { id: MANAGER_ID, phone_number: '0900000001', password_hash: 'test', role: 'teacher' },
        { id: STUDENT_ID, phone_number: '0900000002', password_hash: 'test', role: 'student' },
      ])
      .onConflict((oc) => oc.column('id').doNothing())
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
      .onConflict((oc) => oc.column('id').doNothing())
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
      passPercent: 50,
      maxAttempts: 1,
      retakeCooldownMinutes: 0,
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
    await saveAttemptAnswers(store, exam.id, STUDENT_ID, { [questionId]: 'A' }, 0, now, 'internal')
    const submitted = await submitAttempt(
      store,
      exam.id,
      STUDENT_ID,
      { [questionId]: 'A', outsidePaper: 'ignored' },
      new Date(now.getTime() + 11 * 60_000),
    )
    expect(submitted.ok).toBe(true)
    if (submitted.ok) expect(submitted.attempt.answers).toEqual({ [questionId]: 'A' })
    if (submitted.ok) expect(submitted.attempt.result).toMatchObject({ status: 'graded', score: 1, maxScore: 1, passed: true })
  })

  it('failed attempt allows a retake with another paper; grades are immutable and attempt numbers unique', async () => {
    const store = makeExamsStore(db)
    const level = (await store.findLevelByCode('starter'))!
    const now = new Date()
    const exam = await store.createExam({ title: 'Retake exam', levelId: level.id, skill: 'reading',
      questionCount: 1, durationMinutes: 5, passPercent: 100, maxAttempts: 2, retakeCooldownMinutes: 0,
      opensAt: new Date(now.getTime() - 60_000).toISOString(),
      closesAt: new Date(now.getTime() + 3_600_000).toISOString(), createdBy: MANAGER_ID })
    const one = await startAttempt(store, exam.id, STUDENT_ID, now, () => 0)
    if (!one.ok) throw new Error(one.reason)
    const failed = await submitAttempt(store, exam.id, STUDENT_ID, { [one.attempt.questions[0]!.id]: 'B' }, now)
    expect(failed.ok && failed.attempt.result).toMatchObject({ score: 0, passed: false })

    const two = await startAttempt(store, exam.id, STUDENT_ID, now, () => 0)
    if (!two.ok) throw new Error(two.reason)
    expect(two.attempt.attemptNumber).toBe(2)
    expect(two.attempt.questions[0]!.id).not.toBe(one.attempt.questions[0]!.id)
    const rows = await store.listAttempts(exam.id, STUDENT_ID)
    expect(rows.map((r) => r.attempt_number)).toEqual([1, 2])

    await expect(db.updateTable('exam_attempts').set({ score: 1, passed: true }).where('id', '=', rows[0]!.id).execute())
      .rejects.toThrow('immutable')
    await expect(db.insertInto('exam_attempts').values({ exam_id: exam.id, student_id: STUDENT_ID, attempt_number: 2,
      question_ids: '[]', question_snapshot: '[]', deadline_at: new Date(now.getTime() + 60_000).toISOString() }).execute())
      .rejects.toThrow('exam_attempts_exam_student_attempt_key')
  })

  it('published exam set is frozen in the DB and a fixed exam serves its order', async () => {
    const sets = makeExamSetsStore(db)
    const created = await createExamSet(sets, { title: 'Fixed set', level: 'starter', skill: 'reading' }, MANAGER_ID)
    if (!created.ok) throw new Error(created.reason)
    const setId = created.examSet.id
    for (const questionText of ['Fixed 1', 'Fixed 2']) {
      const body = AddExamSetQuestionRequest.parse({
        questionType: 'multiple_choice', difficulty: 'easy', questionText, options: ['cat', 'dog'], correctAnswer: 'dog', points: 1,
      })
      expect((await addExamSetQuestion(sets, setId, body)).ok).toBe(true)
    }
    const published = await publishExamSet(sets, setId, new Date())
    if (!published.ok) throw new Error(published.reason)
    const itemIds = published.examSet.items.map((x) => x.id)

    await expect(db.deleteFrom('exam_set_items').where('exam_set_id', '=', setId).execute()).rejects.toThrow()
    await expect(db.updateTable('questions').set({ question_text: 'x' }).where('id', '=', itemIds[0]!).execute()).rejects.toThrow()
    await expect(db.deleteFrom('questions').where('id', '=', itemIds[0]!).execute()).rejects.toThrow()

    const store = makeExamsStore(db)
    const level = (await store.findLevelByCode('starter'))!
    expect(await store.listQuestionIdsFor(level.id, 'reading')).not.toContain(itemIds[0])
    const now = new Date()
    const exam = await createExam(store, {
      title: 'Fixed exam', level: 'starter', skill: 'reading', mode: 'fixed_set', examSetIds: [setId],
      shuffleQuestions: false, shuffleOptions: false, retakeStrategy: 'same_set_shuffled', durationMinutes: 10,
      opensAt: new Date(now.getTime() - 60_000).toISOString(), closesAt: new Date(now.getTime() + 60_000).toISOString(),
    }, MANAGER_ID)
    if (!exam.ok) throw new Error(exam.reason)
    expect(exam.exam).toMatchObject({ mode: 'fixed_set', examSetIds: [setId], questionCount: 2 })
    expect((await store.findExamById(exam.exam.id))?.exam_set_ids).toEqual([setId])
    const started = await startAttempt(store, exam.exam.id, STUDENT_ID, now, () => 0)
    expect(started.ok && started.attempt.questions.map((x) => x.id)).toEqual(itemIds)
    expect((await store.listAttempts(exam.exam.id, STUDENT_ID))[0]?.exam_set_id).toBe(setId)

    const archived = await archiveExamSet(sets, setId)
    expect(archived.ok && archived.examSet.status).toBe('archived')
  })

  it('imported exam set is one draft in preview order; an invalid item writes nothing', async () => {
    const sets = makeExamSetsStore(db)
    const countSets = async () => Number((await db.selectFrom('exam_sets').select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()).n)
    const before = await countSets()
    const item = (questionText: string, correctAnswer: string) =>
      ({ questionType: 'multiple_choice' as const, difficulty: 'easy' as const, questionText, options: ['cat', 'dog'], correctAnswer })
    const rejected = await commitImport(sets, { title: 'Import bad', level: 'starter', skill: 'reading',
      items: [item('Imp 1', 'cat'), item('Imp 2', 'bird')] }, MANAGER_ID)
    expect(rejected.ok).toBe(false)
    expect(await countSets()).toBe(before)

    const imported = await commitImport(sets, { title: 'Import ok', level: 'starter', skill: 'reading',
      items: [item('Imp B', 'dog'), item('Imp A', 'cat'), item('Imp C', 'b')] }, MANAGER_ID)
    if (!imported.ok) throw new Error(imported.reason)
    expect(imported.examSet).toMatchObject({ status: 'draft', itemCount: 3 })
    expect(imported.examSet.items.map((q) => [q.questionText, q.source])).toEqual([
      ['Imp B', 'exam_set'], ['Imp A', 'exam_set'], ['Imp C', 'exam_set'],
    ])
    expect((await publishExamSet(sets, imported.examSet.id, new Date())).ok).toBe(true)
  })

  async function submitReason(attemptId: string) {
    const row = await db.selectFrom('exam_attempts').select('submit_reason').where('id', '=', attemptId).executeTakeFirstOrThrow()
    return row.submit_reason
  }

  async function freshAttempt(deadlineMs = 60_000, skill: 'reading' | 'writing' = 'reading') {
    const store = makeExamsStore(db)
    const level = (await store.findLevelByCode('starter'))!
    const now = new Date()
    const exam = await store.createExam({ title: 'Integrity regression', levelId: level.id,
      skill, questionCount: 1, durationMinutes: 1,
      opensAt: new Date(now.getTime() - 120_000).toISOString(),
      closesAt: new Date(now.getTime() + 120_000).toISOString(), createdBy: MANAGER_ID,
      passPercent: 50, maxAttempts: 1, retakeCooldownMinutes: 0 })
    const questions = await store.findQuestionsByIds(QUESTION_IDS)
    const question = questions[0]!
    const attempt = await store.createAttempt({ examId: exam.id, studentId: STUDENT_ID,
      questionIds: [question.id], questionSnapshot: [question], attemptNumber: 1, sessionKey: 'lease-A',
      startedAt: new Date(now.getTime() - 60_000).toISOString(),
      deadlineAt: new Date(now.getTime() + deadlineMs).toISOString() })
    return { store, exam, attempt, question, now }
  }

  it('concurrent different submissions and retries preserve exactly one canonical result', async () => {
    const { store, attempt, now } = await freshAttempt()
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      store.saveSubmission(attempt.id, JSON.stringify({ value: String(i) }), now.toISOString())))
    expect(new Set(results.map((r) => r.answers)).size).toBe(1)
    expect(new Set(results.map((r) => new Date(r.submitted_at!).toISOString())).size).toBe(1)
    const retry = await store.saveSubmission(attempt.id, '{"value":"overwrite"}', new Date().toISOString())
    expect(retry.answers).toBe(results[0]!.answers)
    expect(await submitReason(attempt.id)).toBe('manual')
  })

  it('checkpoint revision CAS and deadline cutoff preserve saved answers', async () => {
    const { store, attempt, now } = await freshAttempt()
    const saves = await Promise.all([
      store.saveAnswers(attempt.id, '{"saved":"A"}', 0, now.toISOString()),
      store.saveAnswers(attempt.id, '{"saved":"B"}', 0, now.toISOString()),
    ])
    expect(saves.filter(Boolean)).toHaveLength(1)
    const winner = saves.find(Boolean)!
    const late = new Date(new Date(attempt.deadline_at).getTime())
    const ended = await store.saveAnswers(attempt.id, '{"late":"discard"}', 1, late.toISOString())
    expect(ended!.answers).toBe(winner.answers)
    expect(ended!.submitted_at).not.toBeNull()
    expect(await submitReason(attempt.id)).toBe('deadline_auto')
    const retry = await store.saveSubmission(attempt.id, '{"late":"overwrite"}', late.toISOString())
    expect(retry.answers).toBe(winner.answers)
  })

  it('rechecks the database clock after a lock wait, not request start time', async () => {
    const { store, attempt, now } = await freshAttempt(250)
    let locked!: () => void
    const acquired = new Promise<void>((resolve) => { locked = resolve })
    const holder = db.transaction().execute(async (trx) => {
      await trx.selectFrom('exam_attempts').select('id').where('id', '=', attempt.id).forUpdate().execute()
      locked()
      await sql`select pg_sleep(0.4)`.execute(trx)
    })
    await acquired
    const pending = store.saveSubmission(attempt.id, '{"late":"discard"}', now.toISOString())
    await holder
    const ended = await pending
    expect(ended.answers).toBeNull()
    expect(new Date(ended.submitted_at!).getTime()).toBe(new Date(attempt.deadline_at).getTime())
    expect(await submitReason(attempt.id)).toBe('deadline_auto')
  })

  it('immutable question and grading snapshot survives edits/deletion and never leaks grading fields', async () => {
    const { store, attempt, exam, question, now } = await freshAttempt()
    await db.updateTable('questions').set({ question_text: 'Changed', correct_answer: 'B', points: 9 })
      .where('id', '=', question.id).execute()
    const view = await getAttempt(store, exam.id, STUDENT_ID, now, 'lease-A')
    expect(view.ok).toBe(true)
    if (view.ok) {
      expect(view.attempt.questions[0]!.questionText).toBe(question.question_text)
      expect(view.attempt.questions[0]!.points).toBe(question.points)
      expect(JSON.stringify(view)).not.toContain('correct_answer')
      expect(JSON.stringify(view)).not.toContain('explanation')
    }
    await db.deleteFrom('questions').where('id', '=', question.id).execute()
    const after = await getAttempt(store, exam.id, STUDENT_ID, now, 'lease-A')
    expect(after).toEqual(view)
    expect(JSON.parse((await store.findAttempt(exam.id, STUDENT_ID))!.question_snapshot!)[0].correct_answer).toBe(question.correct_answer)
    await expect(db.updateTable('exam_attempts').set({ question_snapshot: '[]' }).where('id', '=', attempt.id).execute())
      .rejects.toThrow('immutable')
    // Restore only this fixture, never delete or truncate unrelated data.
    const level = (await store.findLevelByCode('starter'))!
    await db.insertInto('questions').values({ ...question, level_id: level.id, difficulty: 'easy', correct_answer: question.correct_answer! }).execute()
  })

  it('one session lease wins atomic legacy claim; other session cannot read/save/submit', async () => {
    const { store, exam, attempt, now } = await freshAttempt()
    expect(await store.claimSession(attempt.id, 'lease-B')).toBe(false)
    expect(await getAttempt(store, exam.id, STUDENT_ID, now, 'lease-B')).toEqual({ ok: false, reason: 'session_conflict' })
    expect(await submitAttempt(store, exam.id, STUDENT_ID, {}, now, 'lease-B')).toEqual({ ok: false, reason: 'session_conflict' })
    expect(await saveAttemptAnswers(store, exam.id, STUDENT_ID, {}, 0, now, 'lease-B')).toEqual({ ok: false, reason: 'session_conflict' })
    const legacy = await db.insertInto('exam_attempts').values({ exam_id: exam.id, student_id: MANAGER_ID,
      question_ids: '[]', question_snapshot: '[]', deadline_at: new Date(Date.now() + 60_000).toISOString() })
      .returning('id').executeTakeFirstOrThrow()
    const claimed = await Promise.all([store.claimSession(legacy.id, 'A'), store.claimSession(legacy.id, 'B')])
    expect(claimed.filter(Boolean)).toHaveLength(1)
  })

  it('manual grade is queued, written once with grader and feedback, then immutable', async () => {
    const { store, attempt, question, now } = await freshAttempt(60_000, 'writing')
    await store.saveSubmission(attempt.id, JSON.stringify({ [question.id]: 'essay' }), now.toISOString())
    const queue = await listManualGradingQueue(store, now)
    expect(queue.find((item) => item.attemptId === attempt.id)).toMatchObject({ studentPhone: '0900000002', skill: 'writing' })

    const graded = await gradeManually(store, attempt.id, { scores: { [question.id]: question.points }, feedback: 'Good' }, MANAGER_ID, now)
    expect(graded.ok && graded.attempt.result).toMatchObject({ status: 'graded', passed: true, feedback: 'Good' })
    expect(await gradeManually(store, attempt.id, { scores: { [question.id]: 0 }, feedback: '' }, MANAGER_ID, now))
      .toEqual({ ok: false, reason: 'already_graded' })
    expect((await listManualGradingQueue(store, now)).some((item) => item.attemptId === attempt.id)).toBe(false)
    await expect(db.updateTable('exam_attempts').set({ grader_feedback: 'Edited' }).where('id', '=', attempt.id).execute())
      .rejects.toThrow('immutable')
  })
})
