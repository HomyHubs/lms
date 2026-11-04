import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'
import { loadStudentReport } from './service.js'
import { makeReportsStore } from './store.js'

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const CENTER_ID = '71000000-0000-4000-8000-000000000001'
const BRANCH_ID = '71000000-0000-4000-8000-000000000002'
const COURSE_ID = '71000000-0000-4000-8000-000000000003'
const CLASS_ID = '71000000-0000-4000-8000-000000000004'
const EXAM_ID = '71000000-0000-4000-8000-000000000005'
const ADMIN_ID = '71000000-0000-4000-8000-000000000011'
const STUDENT_ID = '71000000-0000-4000-8000-000000000021'
const USER_IDS = [ADMIN_ID, STUDENT_ID]

describeWithPostgres('reports store on real Postgres', () => {
  let db: AppDb
  let levelId: string

  async function cleanup(): Promise<void> {
    await db.deleteFrom('exams').where('id', '=', EXAM_ID).execute()
    // Deleting the center cascades to branch -> class -> sessions/records/enrollments.
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
    levelId = (await db.selectFrom('levels').select('id').where('code', '=', 'starter').executeTakeFirstOrThrow()).id
    await db
      .insertInto('users')
      .values([
        { id: ADMIN_ID, phone_number: '0900000811', password_hash: 'test', role: 'admin' },
        { id: STUDENT_ID, phone_number: '0900000821', password_hash: 'test', role: 'student' },
      ])
      .execute()
    await db.insertInto('centers').values({ id: CENTER_ID, name: 'Reports IT' }).execute()
    await db.insertInto('branches').values({ id: BRANCH_ID, center_id: CENTER_ID, name: 'Branch IT' }).execute()
    await db.insertInto('courses').values({ id: COURSE_ID, level_id: levelId, name: 'Course IT' }).execute()
    await db
      .insertInto('classes')
      .values({ id: CLASS_ID, course_id: COURSE_ID, branch_id: BRANCH_ID, name: 'Class IT' })
      .execute()
    await db.insertInto('enrollments').values({ class_id: CLASS_ID, student_id: STUDENT_ID }).execute()
    await db
      .insertInto('exams')
      .values({
        id: EXAM_ID,
        title: 'Reports IT exam',
        level_id: levelId,
        skill: 'reading',
        question_count: 1,
        duration_minutes: 10,
        opens_at: '2026-10-01T00:00:00Z',
        closes_at: '2026-12-01T00:00:00Z',
        created_by: ADMIN_ID,
      })
      .execute()
    const attempt = (n: number, score: number, passed: boolean, gradedAt: string) => ({
      exam_id: EXAM_ID,
      student_id: STUDENT_ID,
      question_ids: '[]',
      deadline_at: gradedAt,
      submitted_at: gradedAt,
      attempt_number: n,
      score,
      max_score: 10,
      passed,
      graded_at: gradedAt,
    })
    await db
      .insertInto('exam_attempts')
      .values([attempt(1, 4, false, '2026-10-15T10:00:00Z'), attempt(2, 8, true, '2026-11-15T10:00:00Z')])
      .execute()
    const sessions = await db
      .insertInto('class_sessions')
      .values([
        { class_id: CLASS_ID, session_date: '2026-10-20', created_by: ADMIN_ID },
        { class_id: CLASS_ID, session_date: '2026-11-20', created_by: ADMIN_ID },
      ])
      .returning(['id', 'session_date'])
      .execute()
    await db
      .insertInto('attendance_records')
      .values(
        sessions.map((s, i) => ({
          session_id: s.id,
          student_id: STUDENT_ID,
          status: i === 0 ? 'absent' : 'present',
          recorded_by: ADMIN_ID,
        })),
      )
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

  it('builds the branch-scoped report from real attempts and attendance, honoring the date range', async () => {
    const store = makeReportsStore(db)
    const all = await loadStudentReport(store, { branchIds: [BRANCH_ID] }, {})
    expect(all.ranking).toHaveLength(1)
    // best attempt 80%, attendance 1/2 = 50%: 0.9 * 80 + 0.1 * 50 = 77 (default policy 90/10)
    expect(all.ranking[0]).toMatchObject({
      studentId: STUDENT_ID,
      className: 'Class IT',
      examScore: 80,
      attendanceRate: 50,
      finalScore: 77,
      attempts: 2,
      retakes: 1,
    })
    expect(all.byMonth).toEqual([
      { month: '2026-10', passed: 0, failed: 1 },
      { month: '2026-11', passed: 1, failed: 0 },
    ])

    const october = await loadStudentReport(
      store,
      { branchIds: [BRANCH_ID], classId: CLASS_ID },
      { from: '2026-10-01', to: '2026-10-31' },
    )
    expect(october.ranking[0]).toMatchObject({ examScore: 40, attendanceRate: 0, attempts: 1 })

    expect((await loadStudentReport(store, { branchIds: [CENTER_ID] }, {})).ranking).toEqual([])
    // A level without a policy row (created after the migration) falls back to the column defaults.
    await db.deleteFrom('student_grading_policies').where('level_id', '=', levelId).execute()
    expect((await store.listPolicies()).find((p) => p.level_id === levelId)).toMatchObject({
      exam_weight: 90,
      attendance_weight: 10,
    })
  })
})
