import { describe, expect, it } from 'vitest'
import type { ExamsStore, GradingRow } from './service.js'
import {
  importGrades,
  looksLikePhoneNumber,
  previewImportGrades,
  type GradeImportInputRow,
} from './service.js'

/**
 * slice-22: XEM TRUOC (dry-run) nhap diem khop commit nhung KHONG ghi DB.
 * slice-23/ADR 0019: chi khop theo ma hoc vien; SDT con lai la du lieu nhung khong con la khoa khop.
 * Store gia lap toi thieu: chi cac method ma preview/commit dung.
 */

const EXAM_ID = 'exam-1'
const NOW = new Date('2026-11-14T00:00:00.000Z')

/** Mot cau 10 diem -> maxScore = 10. */
const SNAPSHOT = JSON.stringify([
  { id: 'q1', question_text: 'Talk about your day', question_type: 'speaking', skill: 'speaking', options: null, points: 10 },
])

/**
 * `student_phone` van la truong BAT BUOC cua GradingRow (SDT con nguyen trong du lieu) — no chi
 * khong con duoc dung lam khoa khop. Giu tham so nay de test noi ro dieu do.
 */
function gradingRow(over: Partial<GradingRow> & { id: string; student_phone: string }): GradingRow {
  return {
    exam_id: EXAM_ID,
    student_id: `stu-${over.id}`,
    student_code: null,
    answers: '{}',
    question_ids: JSON.stringify(['q1']),
    question_snapshot: SNAPSHOT,
    started_at: '2026-11-13T00:00:00.000Z',
    deadline_at: '2026-11-13T01:00:00.000Z',
    submitted_at: '2026-11-13T00:30:00.000Z',
    graded_at: null,
    score: null,
    exam_title: 'Speaking midterm',
    level_code: 'starter',
    skill: 'speaking',
    pass_percent: 50,
    student_first_name: null,
    student_last_name: null,
    ...over,
  } as GradingRow
}

interface FakeOpts {
  queue: GradingRow[]
  skill?: string
  /** ma hoc vien cua cac lop gan cho de (cohort theo lop). */
  classCodes?: string[]
  /** collects saveGrade calls so we can assert preview never writes. */
  saved: string[]
}

function makeStore(opts: FakeOpts): ExamsStore {
  const byId = new Map(opts.queue.map((r) => [r.id, r]))
  return {
    async findExamById(id: string) {
      if (id !== EXAM_ID) return undefined
      return { id: EXAM_ID, skill: opts.skill ?? 'speaking', exam_class_ids: opts.classCodes ? ['class-1'] : [] }
    },
    async listStudentCodesInClasses() {
      return opts.classCodes ?? []
    },
    async listUngradedAttempts() {
      return opts.queue.filter((r) => r.graded_at === null)
    },
    async findGradingRow(attemptId: string) {
      return byId.get(attemptId)
    },
    async saveSubmission(id: string) {
      return byId.get(id)!
    },
    async saveGrade(id: string, grade: { gradedBy: string; gradedAt: string }) {
      opts.saved.push(id)
      const row = byId.get(id)!
      return { ...row, graded_by: grade.gradedBy, graded_at: grade.gradedAt }
    },
  } as unknown as ExamsStore
}

const rows = (...rs: GradeImportInputRow[]): GradeImportInputRow[] => rs

describe('looksLikePhoneNumber (ADR 0019)', () => {
  it('recognises Vietnamese phone shapes, including Excel separators', () => {
    expect(looksLikePhoneNumber('0901234567')).toBe(true)
    expect(looksLikePhoneNumber('02412345678')).toBe(true)
    expect(looksLikePhoneNumber('090 123 4567')).toBe(true)
    expect(looksLikePhoneNumber('090.123.4567')).toBe(true)
    expect(looksLikePhoneNumber('090-123-4567')).toBe(true)
  })

  it('does not confuse student codes with phone numbers', () => {
    // slice-23-c (ADR 0022): ma co dau phan cach — `looksLikePhoneNumber` bo dau '-' nen van phai
    // tra false, neu khong moi file dung ma moi se bi bao "cot ma la so dien thoai".
    expect(looksLikePhoneNumber('HN-0001')).toBe(false)
    expect(looksLikePhoneNumber('HV-10001')).toBe(false)
    // Ma kieu cu (truoc ADR 0022) van duoc xet dung — file cu khong bi bao sai ly do.
    expect(looksLikePhoneNumber('HN0001')).toBe(false)
    expect(looksLikePhoneNumber('090123456')).toBe(false) // 9 chu so: thieu mot
    expect(looksLikePhoneNumber('090123456789')).toBe(false) // 12 chu so: qua dai
    expect(looksLikePhoneNumber('19001234567')).toBe(false) // khong bat dau bang 0
  })
})

describe('previewImportGrades (slice-22)', () => {
  it('marks rows as will-apply / skip without writing anything', async () => {
    const saved: string[] = []
    const store = makeStore({
      queue: [gradingRow({ id: 'a1', student_phone: '0900000001', student_code: 'HN-0001' })],
      saved,
    })
    const out = await previewImportGrades(
      store,
      EXAM_ID,
      rows(
        { row: 2, studentCode: 'HN-0001', score: 8, feedback: null },
        { row: 3, studentCode: 'HN9999', score: 7, feedback: null },
        { row: 4, studentCode: 'HN-0001', score: 5, feedback: null },
      ),
      NOW,
      undefined,
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.applicable).toBe(1)
    expect(out.rows).toEqual([
      { row: 2, studentCode: 'HN-0001', studentName: null, score: 8, maxScore: 10, passed: true, willApply: true, reason: null },
      { row: 3, studentCode: 'HN9999', studentName: null, score: null, maxScore: null, passed: null, willApply: false, reason: 'student_not_found' },
      { row: 4, studentCode: 'HN-0001', studentName: null, score: null, maxScore: null, passed: null, willApply: false, reason: 'duplicate_in_file' },
    ])
    // Preview must not write.
    expect(saved).toEqual([])
  })

  it('flags score over max and out-of-branch-scope', async () => {
    const saved: string[] = []
    const store = makeStore({
      queue: [gradingRow({ id: 'a1', student_phone: '0900000001', student_code: 'HN-0001' })],
      saved,
    })
    const out = await previewImportGrades(
      store,
      EXAM_ID,
      rows(
        { row: 2, studentCode: 'HN-0001', score: 20, feedback: null },
        { row: 3, studentCode: 'HN-0002', score: 6, feedback: null },
      ),
      NOW,
      new Set(['HN-0001']), // branch scope excludes HN-0002
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.rows.map((r) => r.reason)).toEqual(['score_exceeds_max', 'out_of_scope'])
    expect(out.applicable).toBe(0)
    expect(saved).toEqual([])
  })

  it('rejects a non-manual exam', async () => {
    const out = await previewImportGrades(
      makeStore({ queue: [], skill: 'reading', saved: [] }),
      EXAM_ID,
      rows({ row: 2, studentCode: 'HN-0001', score: 8, feedback: null }),
      NOW,
      undefined,
    )
    expect(out).toEqual({ ok: false, reason: 'not_manual' })
  })

  it('preview applicable count matches what commit applies', async () => {
    const saved: string[] = []
    const queue = [gradingRow({ id: 'a1', student_phone: '0900000001', student_code: 'HN-0001' })]
    const input = rows({ row: 2, studentCode: 'HN-0001', score: 8, feedback: 'good' })

    const preview = await previewImportGrades(makeStore({ queue, saved }), EXAM_ID, input, NOW, undefined)
    const commit = await importGrades(makeStore({ queue, saved }), EXAM_ID, input, 'teacher-1', NOW, undefined)
    expect(preview.ok && preview.applicable).toBe(1)
    expect(commit.ok && commit.summary.applied).toBe(1)
  })

  // slice-23: TRUOC DAY ban xem truoc chi tra theo SDT nen file dung MA HOC VIEN hien
  // `student_not_found` o buoc xem truoc, trong khi buoc ghi van nhap duoc — xem truoc noi doi.
  it('matches by student code in both preview and commit', async () => {
    const saved: string[] = []
    const queue = [gradingRow({ id: 'a1', student_phone: '0900000001', student_code: 'HN-0001' })]
    const input = rows({ row: 2, studentCode: 'HN-0001', score: 8, feedback: null })

    const preview = await previewImportGrades(makeStore({ queue, saved }), EXAM_ID, input, NOW, undefined)
    expect(preview.ok && preview.applicable).toBe(1)
    if (!preview.ok) return
    expect(preview.rows[0]).toMatchObject({ willApply: true, reason: null })

    const commit = await importGrades(makeStore({ queue, saved }), EXAM_ID, input, 'teacher-1', NOW, undefined)
    expect(commit.ok && commit.summary.applied).toBe(1)
    if (!commit.ok) return
    expect(commit.summary.skipped).toEqual([])
  })

  // ADR 0019: khong con fallback SDT. File cu dung SDT o cot ma se KHONG nhap duoc nua, va phai
  // duoc goi dung ten benh thay vi "khong tim thay hoc vien" o ca chuc dong.
  it('no longer falls back to phone — a phone-shaped code is reported as such', async () => {
    const saved: string[] = []
    const queue = [gradingRow({ id: 'a1', student_phone: '0900000001', student_code: 'HN-0001' })]
    const input = rows({ row: 2, studentCode: '0900000001', score: 8, feedback: null })

    const preview = await previewImportGrades(makeStore({ queue, saved }), EXAM_ID, input, NOW, undefined)
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.applicable).toBe(0)
    expect(preview.rows[0]).toMatchObject({
      willApply: false,
      reason: 'student_code_looks_like_phone',
      studentName: null,
    })

    const commit = await importGrades(makeStore({ queue, saved }), EXAM_ID, input, 'teacher-1', NOW, undefined)
    expect(commit.ok).toBe(true)
    if (!commit.ok) return
    expect(commit.summary.applied).toBe(0)
    expect(commit.summary.skipped).toEqual([
      { row: 2, studentCode: '0900000001', reason: 'student_code_looks_like_phone' },
    ])
    expect(saved).toEqual([])
  })

  // ADR 0019 quyet dinh 4: trung tam nao dung chinh SDT lam ma hoc vien thi VAN khop binh thuong.
  // Kiem "co dang SDT" phai chay SAU khi tra theo ma, neu khong se chan oan du lieu hop le.
  it('still matches a centre that uses phone numbers as student codes', async () => {
    const saved: string[] = []
    const queue = [gradingRow({ id: 'a1', student_phone: '0900000001', student_code: '0900000001' })]
    const input = rows({ row: 2, studentCode: '0900000001', score: 8, feedback: null })

    const preview = await previewImportGrades(makeStore({ queue, saved }), EXAM_ID, input, NOW, undefined)
    expect(preview.ok && preview.applicable).toBe(1)
    if (!preview.ok) return
    expect(preview.rows[0]).toMatchObject({ willApply: true, reason: null })

    const commit = await importGrades(makeStore({ queue, saved }), EXAM_ID, input, 'teacher-1', NOW, undefined)
    expect(commit.ok && commit.summary.applied).toBe(1)
  })

  // slice-14: de gan lop cu the -> chi cham hoc vien thuoc cac lop do, va pham vi tinh theo MA.
  it('limits the cohort to the exam classes by student code', async () => {
    const queue = [
      gradingRow({ id: 'a1', student_phone: '0900000001', student_code: 'HN-0001' }),
      gradingRow({ id: 'a2', student_phone: '0900000002', student_code: 'HN-0002' }),
    ]
    const input = rows(
      { row: 2, studentCode: 'HN-0001', score: 8, feedback: null },
      { row: 3, studentCode: 'HN-0002', score: 8, feedback: null },
    )
    const out = await previewImportGrades(
      makeStore({ queue, classCodes: ['HN-0001'], saved: [] }),
      EXAM_ID,
      input,
      NOW,
      undefined,
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.rows.map((r) => r.reason)).toEqual([null, 'out_of_scope'])
  })
})
