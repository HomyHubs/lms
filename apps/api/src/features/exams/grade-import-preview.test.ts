import { describe, expect, it } from 'vitest'
import type { ExamsStore, GradingRow } from './service.js'
import { importGrades, previewImportGrades, type GradeImportInputRow } from './service.js'

/**
 * slice-22: XEM TRUOC (dry-run) nhap diem khop commit nhung KHONG ghi DB.
 * Store gia lap toi thieu: chi cac method ma preview/commit dung.
 */

const EXAM_ID = 'exam-1'
const NOW = new Date('2026-11-14T00:00:00.000Z')

/** Mot cau 10 diem -> maxScore = 10. */
const SNAPSHOT = JSON.stringify([
  { id: 'q1', question_text: 'Talk about your day', question_type: 'speaking', skill: 'speaking', options: null, points: 10 },
])

function gradingRow(over: Partial<GradingRow> & { id: string; student_phone: string }): GradingRow {
  return {
    exam_id: EXAM_ID,
    student_id: `stu-${over.id}`,
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
  classPhones?: string[]
  /** collects saveGrade calls so we can assert preview never writes. */
  saved: string[]
}

function makeStore(opts: FakeOpts): ExamsStore {
  const byId = new Map(opts.queue.map((r) => [r.id, r]))
  return {
    async findExamById(id: string) {
      if (id !== EXAM_ID) return undefined
      return { id: EXAM_ID, skill: opts.skill ?? 'speaking', exam_class_ids: opts.classPhones ? ['class-1'] : [] }
    },
    async listStudentPhonesInClasses() {
      return opts.classPhones ?? []
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

describe('previewImportGrades (slice-22)', () => {
  it('marks rows as will-apply / skip without writing anything', async () => {
    const saved: string[] = []
    const store = makeStore({
      queue: [gradingRow({ id: 'a1', student_phone: '0900000001' })],
      saved,
    })
    const out = await previewImportGrades(
      store,
      EXAM_ID,
      rows(
        { row: 2, studentCode: '0900000001', score: 8, feedback: null },
        { row: 3, studentCode: '0900000099', score: 7, feedback: null },
        { row: 4, studentCode: '0900000001', score: 5, feedback: null },
      ),
      NOW,
      undefined,
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.applicable).toBe(1)
    expect(out.rows).toEqual([
      { row: 2, studentCode: '0900000001', studentName: null, score: 8, maxScore: 10, passed: true, willApply: true, reason: null },
      { row: 3, studentCode: '0900000099', studentName: null, score: null, maxScore: null, passed: null, willApply: false, reason: 'student_not_found' },
      { row: 4, studentCode: '0900000001', studentName: null, score: null, maxScore: null, passed: null, willApply: false, reason: 'duplicate_in_file' },
    ])
    // Preview must not write.
    expect(saved).toEqual([])
  })

  it('flags score over max and out-of-branch-scope', async () => {
    const saved: string[] = []
    const store = makeStore({ queue: [gradingRow({ id: 'a1', student_phone: '0900000001' })], saved })
    const out = await previewImportGrades(
      store,
      EXAM_ID,
      rows(
        { row: 2, studentCode: '0900000001', score: 20, feedback: null },
        { row: 3, studentCode: '0900000002', score: 6, feedback: null },
      ),
      NOW,
      new Set(['0900000001']), // branch scope excludes ...002
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
      rows({ row: 2, studentCode: '0900000001', score: 8, feedback: null }),
      NOW,
      undefined,
    )
    expect(out).toEqual({ ok: false, reason: 'not_manual' })
  })

  it('preview applicable count matches what commit applies', async () => {
    const saved: string[] = []
    const queue = [gradingRow({ id: 'a1', student_phone: '0900000001' })]
    const input = rows({ row: 2, studentCode: '0900000001', score: 8, feedback: 'good' })

    const preview = await previewImportGrades(makeStore({ queue, saved }), EXAM_ID, input, NOW, undefined)
    const commit = await importGrades(makeStore({ queue, saved }), EXAM_ID, input, 'teacher-1', NOW, undefined)
    expect(preview.ok && preview.applicable).toBe(1)
    expect(commit.ok && commit.summary.applied).toBe(1)
  })
})
