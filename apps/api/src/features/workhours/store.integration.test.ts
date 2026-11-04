import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'
import { makeAttendanceStore } from '../attendance/index.js'
import { loadWorkHoursReport } from './service.js'
import { makeWorkHoursStore } from './store.js'

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const CENTER_ID = '78000000-0000-4000-8000-000000000001'
const BRANCH_ID = '78000000-0000-4000-8000-000000000002'
const COURSE_ID = '78000000-0000-4000-8000-000000000003'
const CLASS_ID = '78000000-0000-4000-8000-000000000004'
const TEACHER_ID = '78000000-0000-4000-8000-000000000011'
const STAFF_ID = '78000000-0000-4000-8000-000000000012'
const STUDENT_ID = '78000000-0000-4000-8000-000000000021'
const USER_IDS = [TEACHER_ID, STAFF_ID, STUDENT_ID]

describeWithPostgres('work hours store on real Postgres', () => {
  let db: AppDb

  async function cleanup(): Promise<void> {
    // Deleting the center cascades to branch -> class -> sessions/records.
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
    const levelId = (await db.selectFrom('levels').select('id').where('code', '=', 'starter').executeTakeFirstOrThrow()).id
    await db
      .insertInto('users')
      .values([
        { id: TEACHER_ID, phone_number: '0900000911', password_hash: 'test', role: 'teacher' },
        { id: STAFF_ID, phone_number: '0900000912', password_hash: 'test', role: 'staff' },
        { id: STUDENT_ID, phone_number: '0900000921', password_hash: 'test', role: 'student' },
      ])
      .execute()
    await db.insertInto('centers').values({ id: CENTER_ID, name: 'Work hours IT' }).execute()
    await db.insertInto('branches').values({ id: BRANCH_ID, center_id: CENTER_ID, name: 'Branch WH' }).execute()
    await db.insertInto('courses').values({ id: COURSE_ID, level_id: levelId, name: 'Course WH' }).execute()
    await db
      .insertInto('classes')
      .values({ id: CLASS_ID, course_id: COURSE_ID, branch_id: BRANCH_ID, name: 'Class WH' })
      .execute()
    await db
      .insertInto('user_branches')
      .values([
        { user_id: TEACHER_ID, branch_id: BRANCH_ID },
        { user_id: STAFF_ID, branch_id: BRANCH_ID },
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

  it('allows one open shift per user and closes it on check-out', async () => {
    const store = makeWorkHoursStore(db)
    const opened = await store.checkIn(STAFF_ID)
    expect(opened).toMatchObject({ user_id: STAFF_ID, check_out_at: null })
    expect(await store.checkIn(STAFF_ID)).toBeUndefined()
    expect((await store.findOpenShift(STAFF_ID))?.id).toBe(opened!.id)
    const closed = await store.checkOut(STAFF_ID)
    expect(closed?.id).toBe(opened!.id)
    expect(closed?.check_out_at).toBeInstanceOf(Date)
    expect(await store.checkOut(STAFF_ID)).toBeUndefined()
    await db.deleteFrom('staff_shifts').where('user_id', '=', STAFF_ID).execute()
  })

  it('reports 3 taught sessions for 2 regular + 1 make-up of a cancelled session, and local work days', async () => {
    const attendance = makeAttendanceStore(db)
    const plan = async (sessionDate: string, makeupForSessionId: string | null = null) => {
      const created = await attendance.createSession({
        classId: CLASS_ID,
        sessionDate,
        startsAt: '18:00',
        topic: null,
        createdBy: TEACHER_ID,
        durationMinutes: 90,
        makeupForSessionId,
      })
      return created!.id
    }
    const teach = (sessionId: string) =>
      attendance.upsertRecords(sessionId, TEACHER_ID, [{ studentId: STUDENT_ID, status: 'present', note: null }])

    await teach(await plan('2026-11-02'))
    await teach(await plan('2026-11-04'))
    const missed = await plan('2026-11-06')
    expect(await attendance.cancelSession(missed)).toBe(true)
    await teach(await plan('2026-11-07', missed))
    await plan('2026-10-30') // outside the month

    await db
      .insertInto('staff_shifts')
      .values([
        // 01:00-03:00 on 1 Nov in Vietnam, still 31 Oct in UTC.
        { user_id: STAFF_ID, check_in_at: '2026-10-31T18:00:00Z', check_out_at: '2026-10-31T20:00:00Z' },
        { user_id: STAFF_ID, check_in_at: '2026-11-02T01:00:00Z', check_out_at: '2026-11-02T05:00:00Z' },
        { user_id: STAFF_ID, check_in_at: '2026-10-30T01:00:00Z', check_out_at: '2026-10-30T05:00:00Z' },
      ])
      .execute()

    const report = await loadWorkHoursReport(
      makeWorkHoursStore(db),
      '2026-11',
      [BRANCH_ID],
      new Date('2026-11-20T03:00:00Z'),
    )
    expect(report.teachers).toEqual([
      {
        teacherId: TEACHER_ID,
        phoneNumber: '0900000911',
        planned: 3,
        held: 3,
        missed: 1,
        makeup: 1,
        substitute: 0,
        taughtMinutes: 270,
      },
    ])
    expect(report.sessions.map((s) => [s.sessionDate, s.status, s.isMakeup])).toEqual([
      ['2026-11-02', 'held', false],
      ['2026-11-04', 'held', false],
      ['2026-11-06', 'cancelled', false],
      ['2026-11-07', 'held', true],
    ])
    expect(report.staff.find((s) => s.userId === STAFF_ID)).toMatchObject({
      role: 'staff',
      workedMinutes: 360,
      workDays: 2,
      openShifts: 0,
    })
    expect((await loadWorkHoursReport(makeWorkHoursStore(db), '2026-11', [CENTER_ID], new Date())).teachers).toEqual([])
  })
})
