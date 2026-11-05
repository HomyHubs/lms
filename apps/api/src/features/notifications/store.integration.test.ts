import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'
import { retakeReminder, SESSION_REMINDER_WINDOW_MS, sessionReminder } from './service.js'
import { makeNotificationsStore } from './store.js'

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const CENTER_ID = '79000000-0000-4000-8000-000000000001'
const BRANCH_ID = '79000000-0000-4000-8000-000000000002'
const COURSE_ID = '79000000-0000-4000-8000-000000000003'
const CLASS_ID = '79000000-0000-4000-8000-000000000004'
const EXAM_ID = '79000000-0000-4000-8000-000000000005'
const TEACHER_ID = '79000000-0000-4000-8000-000000000011'
const CLASS_TEACHER_ID = '79000000-0000-4000-8000-000000000012'
const FAILED_STUDENT_ID = '79000000-0000-4000-8000-000000000021'
const PASSED_STUDENT_ID = '79000000-0000-4000-8000-000000000022'
const LAST_TRY_STUDENT_ID = '79000000-0000-4000-8000-000000000023'
const USER_IDS = [TEACHER_ID, CLASS_TEACHER_ID, FAILED_STUDENT_ID, PASSED_STUDENT_ID, LAST_TRY_STUDENT_ID]
// 10:00 in Vietnam; the reminder window ends 10:00 the next day.
const NOW = new Date('2026-11-11T03:00:00Z')

describeWithPostgres('notifications store on real Postgres', () => {
  let db: AppDb

  async function cleanup(): Promise<void> {
    // Deleting the center cascades to branch -> class -> sessions; users cascade to notifications.
    await db.deleteFrom('centers').where('id', '=', CENTER_ID).execute()
    await db.deleteFrom('courses').where('id', '=', COURSE_ID).execute()
    await db.deleteFrom('exam_attempts').where('exam_id', '=', EXAM_ID).execute()
    await db.deleteFrom('exams').where('id', '=', EXAM_ID).execute()
    await db.deleteFrom('users').where('id', 'in', USER_IDS).execute()
  }

  beforeAll(async () => {
    db = createDb(url!)
    // Only the known disposable databases: local slice-4 container and the CI service container (ci.yml).
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await cleanup()
    const levelId = (await db.selectFrom('levels').select('id').where('code', '=', 'starter').executeTakeFirstOrThrow()).id
    await db
      .insertInto('users')
      .values([
        { id: TEACHER_ID, phone_number: '0900000931', password_hash: 'test', role: 'teacher' },
        { id: CLASS_TEACHER_ID, phone_number: '0900000932', password_hash: 'test', role: 'teacher' },
        { id: FAILED_STUDENT_ID, phone_number: '0900000941', password_hash: 'test', role: 'student' },
        { id: PASSED_STUDENT_ID, phone_number: '0900000942', password_hash: 'test', role: 'student' },
        { id: LAST_TRY_STUDENT_ID, phone_number: '0900000943', password_hash: 'test', role: 'student' },
      ])
      .execute()
    await db.insertInto('centers').values({ id: CENTER_ID, name: 'Notify IT' }).execute()
    await db.insertInto('branches').values({ id: BRANCH_ID, center_id: CENTER_ID, name: 'Branch NT' }).execute()
    await db.insertInto('courses').values({ id: COURSE_ID, level_id: levelId, name: 'Course NT' }).execute()
    await db.insertInto('classes').values({ id: CLASS_ID, course_id: COURSE_ID, branch_id: BRANCH_ID, name: 'Class NT' }).execute()
    await db.insertInto('class_teachers').values({ class_id: CLASS_ID, teacher_id: CLASS_TEACHER_ID }).execute()
    await db
      .insertInto('exams')
      .values({
        id: EXAM_ID,
        title: 'Exam NT',
        level_id: levelId,
        skill: 'reading',
        question_count: 1,
        duration_minutes: 10,
        opens_at: '2026-11-01T00:00:00Z',
        closes_at: '2026-11-20T00:00:00Z',
        max_attempts: 2,
        retake_cooldown_minutes: 60,
        created_by: TEACHER_ID,
      })
      .execute()
    const graded = (studentId: string, attemptNumber: number, passed: boolean, submittedAt: string) => ({
      exam_id: EXAM_ID,
      student_id: studentId,
      question_ids: '[]',
      attempt_number: attemptNumber,
      started_at: submittedAt,
      deadline_at: submittedAt,
      submitted_at: submittedAt,
      score: passed ? 1 : 0,
      max_score: 1,
      passed,
      graded_at: submittedAt,
    })
    await db
      .insertInto('exam_attempts')
      .values([
        graded(FAILED_STUDENT_ID, 1, false, '2026-11-11T01:00:00Z'),
        graded(PASSED_STUDENT_ID, 1, true, '2026-11-11T01:00:00Z'),
        graded(LAST_TRY_STUDENT_ID, 1, false, '2026-11-10T01:00:00Z'),
        graded(LAST_TRY_STUDENT_ID, 2, false, '2026-11-11T01:00:00Z'),
      ])
      .execute()
    const session = (sessionDate: string, startsAt: string, plannedTeacherId: string | null, cancelledAt: string | null = null) => ({
      class_id: CLASS_ID,
      session_date: sessionDate,
      starts_at: startsAt,
      created_by: TEACHER_ID,
      planned_teacher_id: plannedTeacherId,
      cancelled_at: cancelledAt,
    })
    await db
      .insertInto('class_sessions')
      .values([
        session('2026-11-11', '18:00', TEACHER_ID),
        session('2026-11-12', '08:00', null),
        session('2026-11-11', '19:00', TEACHER_ID, '2026-11-10T00:00:00Z'),
        session('2026-11-11', '09:00', TEACHER_ID),
        session('2026-11-12', '18:00', TEACHER_ID),
      ])
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

  it('finds retakeable failed attempts and upcoming sessions, enqueues once, and tracks delivery and reads', async () => {
    const store = makeNotificationsStore(db)
    const retakes = (await store.listRetakeCandidates(NOW)).filter((r) => USER_IDS.includes(r.student_id))
    expect(retakes).toEqual([
      expect.objectContaining({ student_id: FAILED_STUDENT_ID, exam_title: 'Exam NT', attempt_number: 1, max_attempts: 2 }),
    ])
    // Still cooling down 30 minutes after the attempt.
    expect((await store.listRetakeCandidates(new Date('2026-11-11T01:30:00Z'))).some((r) => r.student_id === FAILED_STUDENT_ID)).toBe(false)

    const sessions = (await store.listSessionCandidates(NOW, new Date(NOW.getTime() + SESSION_REMINDER_WINDOW_MS)))
      .filter((s) => USER_IDS.includes(s.teacher_id))
    expect(sessions.map((s) => [s.teacher_id, s.session_date, s.starts_at, s.class_name])).toEqual([
      [TEACHER_ID, '2026-11-11', '18:00', 'Class NT'],
      [CLASS_TEACHER_ID, '2026-11-12', '08:00', 'Class NT'],
    ])

    const items = [...retakes.map(retakeReminder), ...sessions.map(sessionReminder)]
    expect(await store.enqueue(items, 'console')).toBe(3)
    expect(await store.enqueue(items, 'console')).toBe(0)

    const pending = (await store.listPendingDeliveries(1000)).filter((p) => ['0900000931', '0900000932', '0900000941'].includes(p.phone_number))
    expect(pending).toHaveLength(3)
    const [first, second] = pending
    await store.markSent(first!.id)
    await store.markDeliveryFailed(second!.id, 'provider down', true)
    const remaining = (await store.listPendingDeliveries(1000)).filter((p) => pending.some((x) => x.id === p.id))
    expect(remaining).toHaveLength(1)

    const [note] = await store.listForUser(FAILED_STUDENT_ID, 20)
    expect(note).toMatchObject({ kind: 'retake_reminder', title: 'Được thi lại: Exam NT', read_at: null })
    expect(await store.countUnread(FAILED_STUDENT_ID)).toBe(1)
    expect(await store.markRead(TEACHER_ID, note!.id)).toBe(false)
    expect(await store.markRead(FAILED_STUDENT_ID, note!.id)).toBe(true)
    expect(await store.countUnread(FAILED_STUDENT_ID)).toBe(0)
    await store.markAllRead(TEACHER_ID)
    expect(await store.countUnread(TEACHER_ID)).toBe(0)
  })
})
