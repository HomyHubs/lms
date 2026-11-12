import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'
import { makeAttendanceStore } from './store.js'

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const CENTER_ID = '61000000-0000-4000-8000-000000000001'
const BRANCH_ID = '61000000-0000-4000-8000-000000000002'
const COURSE_ID = '61000000-0000-4000-8000-000000000003'
const CLASS_ID = '61000000-0000-4000-8000-000000000004'
const TEACHER_ID = '61000000-0000-4000-8000-000000000011'
const STUDENT_A = '61000000-0000-4000-8000-000000000021'
const STUDENT_B = '61000000-0000-4000-8000-000000000022'
const USER_IDS = [TEACHER_ID, STUDENT_A, STUDENT_B]

describeWithPostgres('attendance store on real Postgres', () => {
  let db: AppDb

  async function cleanup(): Promise<void> {
    // Deleting the center cascades to branch -> class -> sessions/records/teachers/enrollments.
    await db.deleteFrom('centers').where('id', '=', CENTER_ID).execute()
    await db.deleteFrom('courses').where('id', '=', COURSE_ID).execute()
    await db.deleteFrom('users').where('id', 'in', USER_IDS).execute()
  }

  beforeAll(async () => {
    db = createDb(url!)
    // Only the known disposable databases: local slice-4 container and the CI service container (ci.yml).
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await cleanup()
    await db
      .insertInto('users')
      .values([
        { id: TEACHER_ID, phone_number: '0900000611', password_hash: 'test', role: 'teacher' },
        { id: STUDENT_A, phone_number: '0900000621', password_hash: 'test', role: 'student' },
        { id: STUDENT_B, phone_number: '0900000622', password_hash: 'test', role: 'student' },
      ])
      .execute()
    const level = await db.selectFrom('levels').select('id').where('code', '=', 'starter').executeTakeFirstOrThrow()
    await db.insertInto('centers').values({ id: CENTER_ID, name: 'Attendance IT' }).execute()
    await db.insertInto('branches').values({ id: BRANCH_ID, center_id: CENTER_ID, name: 'Branch IT' }).execute()
    await db.insertInto('courses').values({ id: COURSE_ID, level_id: level.id, name: 'Course IT' }).execute()
    await db
      .insertInto('classes')
      .values({ id: CLASS_ID, course_id: COURSE_ID, branch_id: BRANCH_ID, name: 'Class IT' })
      .execute()
    await db
      .insertInto('enrollments')
      .values([
        { class_id: CLASS_ID, student_id: STUDENT_A },
        { class_id: CLASS_ID, student_id: STUDENT_B },
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

  it('round-trips teachers, sessions, upserted records, history and scoped rates', async () => {
    const store = makeAttendanceStore(db)
    expect(await store.addClassTeacher(CLASS_ID, TEACHER_ID)).toBe(true)
    expect(await store.addClassTeacher(CLASS_ID, TEACHER_ID)).toBe(false)
    expect(await store.isClassTeacher(CLASS_ID, TEACHER_ID)).toBe(true)
    expect((await store.listTeachingClasses(TEACHER_ID)).map((c) => c.id)).toEqual([CLASS_ID])

    const session = await store.createSession({
      classId: CLASS_ID,
      sessionDate: '2026-11-05',
      startsAt: '18:30',
      topic: 'Unit 1',
      createdBy: TEACHER_ID,
      durationMinutes: 90,
      makeupForSessionId: null,
    })
    // Date and time come back exactly as written (no timezone shift).
    expect(session).toMatchObject({ class_id: CLASS_ID, session_date: '2026-11-05', starts_at: '18:30' })
    expect(
      await store.createSession({
        classId: CLASS_ID,
        sessionDate: '2026-11-05',
        startsAt: '18:30',
        topic: null,
        createdBy: TEACHER_ID,
        durationMinutes: 90,
        makeupForSessionId: null,
      }),
    ).toBeUndefined()

    await store.upsertRecords(session!.id, TEACHER_ID, [
      { studentId: STUDENT_A, status: 'present', note: null },
      { studentId: STUDENT_B, status: 'absent', note: null },
    ])
    await store.upsertRecords(session!.id, TEACHER_ID, [{ studentId: STUDENT_B, status: 'late', note: 'bus' }])
    // A session with attendance is held and can no longer be cancelled.
    expect(await store.cancelSession(session!.id)).toBe(false)
    const records = await store.listRecords(session!.id)
    expect(records.map((r) => [r.student_id, r.status, r.note]).sort()).toEqual([
      [STUDENT_A, 'present', null],
      [STUDENT_B, 'late', 'bus'],
    ])

    const history = await store.listStudentHistory(STUDENT_B, [BRANCH_ID])
    expect(history).toEqual([
      {
        session_id: session!.id,
        class_id: CLASS_ID,
        class_name: 'Class IT',
        session_date: '2026-11-05',
        starts_at: '18:30',
        topic: 'Unit 1',
        status: 'late',
        note: 'bus',
      },
    ])
    expect(await store.listStudentHistory(STUDENT_B, [])).toEqual([])

    const scoped = await store.listScopedRecords({ courseId: COURSE_ID, branchIds: [BRANCH_ID] })
    expect(scoped.map((r) => r.status).sort()).toEqual(['late', 'present'])
    expect(await store.listScopedRecords({ classId: CLASS_ID, branchIds: [CENTER_ID] })).toEqual([])
  })
})
