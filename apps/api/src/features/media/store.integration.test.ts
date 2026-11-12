import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AddExamSetQuestionRequest } from '@lms/shared'
import { createDb, type AppDb } from '../../platform/db.js'
import { createExam, makeExamsStore, startAttempt } from '../exams/index.js'
import { addExamSetQuestion, createExamSet, makeExamSetsStore, publishExamSet } from '../examsets/index.js'
import { makeMediaStore } from './store.js'
import { readMedia, setQuestionMedia, uploadMedia } from './service.js'
import { makeMemoryMediaStorage } from './storage.js'

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const MANAGER_ID = '12121212-1212-4121-8121-121212121212'
const STUDENT_ID = '13131313-1313-4131-8131-131313131313'
const OTHER_STUDENT_ID = '14141414-1414-4141-8141-141414141414'

function png(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IEND', Buffer.alloc(0))])
}

describeWithPostgres('media store on real Postgres', () => {
  let db: AppDb

  beforeAll(async () => {
    db = createDb(url!)
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await db.insertInto('users').values([
      { id: MANAGER_ID, phone_number: '0900001201', password_hash: 'test', role: 'teacher' },
      { id: STUDENT_ID, phone_number: '0900001202', password_hash: 'test', role: 'student' },
      { id: OTHER_STUDENT_ID, phone_number: '0900001203', password_hash: 'test', role: 'student' },
    ]).onConflict((oc) => oc.column('id').doNothing()).execute()
  })

  afterAll(async () => {
    if (db) await db.destroy()
  })

  it('a published set freezes question images; only the attempt owner may read them; used images cannot be deleted', async () => {
    const media = makeMediaStore(db)
    const storage = makeMemoryMediaStorage()
    const sets = makeExamSetsStore(db)
    const exams = makeExamsStore(db)
    const now = new Date()

    const created = await createExamSet(sets, { title: `Media set ${now.getTime()}`, level: 'starter', skill: 'reading' }, MANAGER_ID)
    if (!created.ok) throw new Error(created.reason)
    const body = AddExamSetQuestionRequest.parse({
      questionType: 'multiple_choice', difficulty: 'easy', questionText: 'Which animal is in the picture?',
      options: ['cat', 'dog'], correctAnswer: 'a', points: 1,
    })
    const added = await addExamSetQuestion(sets, created.examSet.id, body)
    if (!added.ok) throw new Error(added.reason)
    const questionId = added.examSet.items[0]!.id

    const oldImage = await uploadMedia(media, storage, png(10, 11 + (now.getTime() % 1000)), MANAGER_ID)
    const newImage = await uploadMedia(media, storage, png(12, 11 + (now.getTime() % 1000)), MANAGER_ID)
    if (!oldImage.ok || !newImage.ok) throw new Error('upload failed')
    expect((await setQuestionMedia(media, questionId, [
      { mediaId: oldImage.media.id, slot: 'stem', optionIndex: null },
      { mediaId: oldImage.media.id, slot: 'option', optionIndex: 1 },
    ])).ok).toBe(true)

    const published = await publishExamSet(sets, created.examSet.id, now)
    if (!published.ok) throw new Error(published.reason)
    await expect(setQuestionMedia(media, questionId, [{ mediaId: newImage.media.id, slot: 'stem', optionIndex: null }]))
      .rejects.toMatchObject({ code: '23001' })

    const exam = await createExam(exams, {
      title: 'Media exam', level: 'starter', skill: 'reading', mode: 'fixed_set', examSetIds: [created.examSet.id],
      shuffleQuestions: false, shuffleOptions: false, retakeStrategy: 'same_set_shuffled', durationMinutes: 10,
      opensAt: new Date(now.getTime() - 60_000).toISOString(), closesAt: new Date(now.getTime() + 3_600_000).toISOString(),
    }, MANAGER_ID)
    if (!exam.ok) throw new Error(exam.reason)

    const started = await startAttempt(exams, exam.exam.id, STUDENT_ID, now, () => 0)
    if (!started.ok) throw new Error(started.reason)
    const oldUrl = `/api/media/${oldImage.media.id}`
    expect(started.attempt.questions[0]).toMatchObject({ stemImages: [oldUrl], optionImages: { 1: oldUrl } })

    expect((await readMedia(media, storage, oldImage.media.id, { id: STUDENT_ID, role: 'student' })).ok).toBe(true)
    expect(await readMedia(media, storage, oldImage.media.id, { id: OTHER_STUDENT_ID, role: 'student' }))
      .toEqual({ ok: false, reason: 'not_found' })
    expect(await readMedia(media, storage, newImage.media.id, { id: STUDENT_ID, role: 'student' }))
      .toEqual({ ok: false, reason: 'not_found' })
    expect((await readMedia(media, storage, newImage.media.id, { id: MANAGER_ID, role: 'teacher' })).ok).toBe(true)

    await expect(db.deleteFrom('media_assets').where('id', '=', oldImage.media.id).execute()).rejects.toThrow()
  })

  it('a bank question changes its image freely; the attempt snapshot keeps the image it started with', async () => {
    const media = makeMediaStore(db)
    const storage = makeMemoryMediaStorage()
    const exams = makeExamsStore(db)
    const now = new Date()
    const level = (await exams.findLevelByCode('flyer'))!
    const question = await db.insertInto('questions').values({
      level_id: level.id, skill: 'writing', question_type: 'fill_blank', difficulty: 'easy',
      question_text: `Describe the picture ${now.getTime()}`, correct_answer: 'free', points: 1,
    }).returning('id').executeTakeFirstOrThrow()
    const before = await uploadMedia(media, storage, png(20, 21 + (now.getTime() % 1000)), MANAGER_ID)
    const after = await uploadMedia(media, storage, png(22, 21 + (now.getTime() % 1000)), MANAGER_ID)
    if (!before.ok || !after.ok) throw new Error('upload failed')
    await setQuestionMedia(media, question.id, [{ mediaId: before.media.id, slot: 'stem', optionIndex: null }])

    const [lite] = await exams.findQuestionsByIds([question.id])
    const exam = await exams.createExam({ title: 'Bank media exam', levelId: level.id, skill: 'writing', questionCount: 1,
      durationMinutes: 10, opensAt: new Date(now.getTime() - 60_000).toISOString(),
      closesAt: new Date(now.getTime() + 3_600_000).toISOString(), passPercent: 50, maxAttempts: 1, retakeCooldownMinutes: 0,
      createdBy: MANAGER_ID })
    const attempt = await exams.createAttempt({ examId: exam.id, studentId: STUDENT_ID, questionIds: [question.id],
      questionSnapshot: [lite!], attemptNumber: 1, sessionKey: 'media-lease', startedAt: now.toISOString(),
      deadlineAt: new Date(now.getTime() + 600_000).toISOString() })

    const changed = await setQuestionMedia(media, question.id, [{ mediaId: after.media.id, slot: 'stem', optionIndex: null }])
    expect(changed.ok && changed.list.media.map((m) => m.mediaId)).toEqual([after.media.id])
    const snapshot = JSON.parse((await exams.findAttempt(exam.id, STUDENT_ID))!.question_snapshot!)
    expect(snapshot[0].media).toEqual([{ mediaId: before.media.id, slot: 'stem', optionIndex: null }])
    expect(await db.selectFrom('exam_attempt_media').select('media_id').where('attempt_id', '=', attempt.id).execute())
      .toEqual([{ media_id: before.media.id }])
    expect((await readMedia(media, storage, before.media.id, { id: STUDENT_ID, role: 'student' })).ok).toBe(true)
    await expect(db.deleteFrom('media_assets').where('id', '=', before.media.id).execute()).rejects.toThrow()
  })
})
