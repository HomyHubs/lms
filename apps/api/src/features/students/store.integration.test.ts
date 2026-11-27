import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'
import { loadStudentProfile } from './service.js'
import { makeStudentsStore } from './store.js'

/**
 * Store học viên trên Postgres THẬT.
 *
 * Trọng tâm: phần SQL không thể kiểm bằng unit test —
 *  - `loadExamAgg` tính điểm thi = trung bình điểm CAO NHẤT của TỪNG đề (ADR 0006),
 *    không phải trung bình mọi lượt thi;
 *  - `loadPolicy` đọc đúng policy xếp loại của cấp độ;
 *  - `findStudentIdentity` trả `level_id` để service lấy được policy.
 */

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const CENTER_ID = '72000000-0000-4000-8000-000000000001'
const BRANCH_ID = '72000000-0000-4000-8000-000000000002'
const COURSE_ID = '72000000-0000-4000-8000-000000000003'
const CLASS_ID = '72000000-0000-4000-8000-000000000004'
const EXAM_A_ID = '72000000-0000-4000-8000-000000000005'
const EXAM_B_ID = '72000000-0000-4000-8000-000000000006'
const ADMIN_ID = '72000000-0000-4000-8000-000000000011'
const STUDENT_ID = '72000000-0000-4000-8000-000000000021'
const USER_IDS = [ADMIN_ID, STUDENT_ID]

describeWithPostgres('students store on real Postgres', () => {
  let db: AppDb
  let levelId: string

  async function cleanup(): Promise<void> {
    await db.deleteFrom('exam_attempts').where('exam_id', 'in', [EXAM_A_ID, EXAM_B_ID]).execute()
    await db.deleteFrom('exams').where('id', 'in', [EXAM_A_ID, EXAM_B_ID]).execute()
    // Xoá center kéo theo branch -> class -> enrollment.
    await db.deleteFrom('centers').where('id', '=', CENTER_ID).execute()
    await db.deleteFrom('courses').where('id', '=', COURSE_ID).execute()
    await db.deleteFrom('users').where('id', 'in', USER_IDS).execute()
  }

  beforeAll(async () => {
    db = createDb(url!)
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await cleanup()
    levelId = (
      await db.selectFrom('levels').select('id').where('code', '=', 'starter').executeTakeFirstOrThrow()
    ).id

    await db
      .insertInto('users')
      .values([
        { id: ADMIN_ID, phone_number: '0900000721', password_hash: 'test', role: 'admin' },
        { id: STUDENT_ID, phone_number: '0900000722', password_hash: 'test', role: 'student' },
      ])
      .execute()
    await db.insertInto('centers').values({ id: CENTER_ID, name: 'Students IT' }).execute()
    await db
      .insertInto('branches')
      .values({ id: BRANCH_ID, center_id: CENTER_ID, name: 'Branch IT' })
      .execute()
    await db.insertInto('courses').values({ id: COURSE_ID, level_id: levelId, name: 'Course IT' }).execute()
    await db
      .insertInto('classes')
      .values({ id: CLASS_ID, course_id: COURSE_ID, branch_id: BRANCH_ID, name: 'Class IT' })
      .execute()
    await db.insertInto('enrollments').values({ class_id: CLASS_ID, student_id: STUDENT_ID }).execute()

    const examRow = (id: string, title: string) => ({
      id,
      title,
      level_id: levelId,
      skill: 'reading' as const,
      question_count: 10,
      duration_minutes: 30,
      opens_at: '2026-01-01T00:00:00Z',
      closes_at: '2026-12-31T00:00:00Z',
      created_by: ADMIN_ID,
    })
    await db.insertInto('exams').values([examRow(EXAM_A_ID, 'Exam A'), examRow(EXAM_B_ID, 'Exam B')]).execute()

    // Đề A: 2 lượt (50% rồi 90%) -> điểm của đề A = 90 (lấy lượt cao nhất).
    // Đề B: 1 lượt 80%.
    // => avg_score_pct = (90 + 80) / 2 = 85, KHÔNG phải (50+90+80)/3 = 73.3.
    const attempt = (examId: string, attemptNumber: number, score: number, passed: boolean) => ({
      exam_id: examId,
      student_id: STUDENT_ID,
      question_ids: '[]',
      deadline_at: '2026-12-31T00:00:00Z',
      attempt_number: attemptNumber,
      score,
      max_score: 10,
      passed,
      graded_at: '2026-06-01T00:00:00Z',
    })
    await db
      .insertInto('exam_attempts')
      .values([
        attempt(EXAM_A_ID, 1, 5, false),
        attempt(EXAM_A_ID, 2, 9, true),
        { ...attempt(EXAM_B_ID, 1, 8, true), max_score: 10 },
      ])
      .execute()
  })

  afterAll(async () => {
    await cleanup()
    await db.destroy()
  })

  it('loadExamAgg lấy điểm cao nhất của từng đề rồi mới lấy trung bình', async () => {
    const store = makeStudentsStore(db)
    const agg = await store.loadExamAgg(STUDENT_ID)
    expect(agg.attempts).toBe(3)
    expect(agg.passed).toBe(2)
    expect(agg.failed).toBe(1)
    expect(agg.avg_score_pct).toBe(85)
  })

  it('findStudentIdentity trả level_id của lớp học viên đang ghi danh', async () => {
    const store = makeStudentsStore(db)
    const identity = await store.findStudentIdentity(STUDENT_ID, undefined)
    expect(identity?.level_id).toBe(levelId)
    expect(identity?.level_code).toBe('starter')
  })

  it('loadPolicy trả policy xếp loại của cấp độ (mặc định 90/10, ngưỡng 85/70/50)', async () => {
    const store = makeStudentsStore(db)
    const policy = await store.loadPolicy(levelId)
    expect(policy).toMatchObject({
      levelId,
      levelCode: 'starter',
      examWeight: 90,
      attendanceWeight: 10,
      excellentMin: 85,
      goodMin: 70,
      averageMin: 50,
    })
    expect(policy?.passMin).toBeGreaterThanOrEqual(0)
  })

  it('loadPolicy trả null khi cấp độ không tồn tại', async () => {
    const store = makeStudentsStore(db)
    expect(await store.loadPolicy('72000000-0000-4000-8000-0000000000ff')).toBeNull()
  })

  it('hồ sơ đầy đủ: xếp loại theo policy thật, không có chuyên cần thì chỉ dùng điểm thi', async () => {
    const store = makeStudentsStore(db)
    const profile = await loadStudentProfile(store, STUDENT_ID, undefined)
    expect(profile?.exam?.avgScorePct).toBe(85)
    // Chưa điểm danh buổi nào -> final = điểm thi 85 -> 'excellent' (>= 85).
    expect(profile?.attendance).toBeNull()
    expect(profile?.classification).toEqual({ finalScore: 85, label: 'excellent' })
  })
})
