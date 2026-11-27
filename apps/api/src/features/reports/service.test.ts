import { describe, expect, it } from 'vitest'
import {
  buildStudentReport,
  classify,
  finalScore,
  type EnrollmentRow,
  type GradedAttemptRow,
  type PolicyRow,
} from './service.js'

const LEVEL = '10000000-0000-4000-8000-000000000001'
const CLASS = '50000000-0000-4000-8000-000000000001'
const A = '80000000-0000-4000-8000-000000000001'
const B = '80000000-0000-4000-8000-000000000002'
const C = '80000000-0000-4000-8000-000000000003'

const POLICY: PolicyRow = {
  level_id: LEVEL,
  level_code: 'starter',
  level_name: 'Starter',
  exam_weight: 90,
  attendance_weight: 10,
  excellent_min: 85,
  good_min: 70,
  average_min: 50,
  pass_min: 50,
}

function enrollment(studentId: string, phone: string): EnrollmentRow {
  return {
    class_id: CLASS,
    class_name: 'Starter A',
    branch_id: 'b1',
    branch_name: 'Co so 1',
    level_id: LEVEL,
    level_code: 'starter',
    student_id: studentId,
    phone_number: phone,
    student_name: null,
  }
}

let seq = 0
function attempt(
  studentId: string,
  examId: string,
  score: number,
  passed: boolean,
  month: string,
  attemptNumber = 1,
): GradedAttemptRow {
  seq += 1
  return {
    id: `att-${seq}`,
    student_id: studentId,
    exam_id: examId,
    level_id: LEVEL,
    attempt_number: attemptNumber,
    score,
    max_score: 10,
    passed,
    max_attempts: 3,
    graded_month: month,
  }
}

describe('finalScore + classify', () => {
  it('weights exam/attendance by the level policy, falling back to the exam alone', () => {
    expect(finalScore(80, 100, { examWeight: 90, attendanceWeight: 10 })).toBe(82)
    expect(finalScore(80, 100, { examWeight: 50, attendanceWeight: 50 })).toBe(90)
    expect(finalScore(80, null, { examWeight: 90, attendanceWeight: 10 })).toBe(80)
    expect(finalScore(null, 100, { examWeight: 90, attendanceWeight: 10 })).toBeNull()
  })

  it('maps the final score onto the configured bands (inclusive lower bound)', () => {
    const bands = { excellentMin: 85, goodMin: 70, averageMin: 50 }
    expect([85, 84.9, 70, 50, 49.9].map((s) => classify(s, bands))).toEqual([
      'excellent',
      'good',
      'good',
      'average',
      'weak',
    ])
    expect(classify(null, bands)).toBeNull()
  })
})

describe('buildStudentReport', () => {
  const report = buildStudentReport({
    policies: [POLICY],
    enrollments: [enrollment(A, '0900000001'), enrollment(B, '0900000002'), enrollment(C, '0900000003')],
    attempts: [
      // A: exam 1 failed at 40% then passed at 90% on retake; exam 2 passed at 70%.
      attempt(A, 'e1', 4, false, '2026-10'),
      attempt(A, 'e1', 9, true, '2026-11', 2),
      attempt(A, 'e2', 7, true, '2026-11'),
      // B: exam 1 failed at 30% with retakes left.
      attempt(B, 'e1', 3, false, '2026-11'),
    ],
    attendance: [
      { class_id: CLASS, student_id: A, status: 'present' },
      { class_id: CLASS, student_id: A, status: 'present' },
      { class_id: CLASS, student_id: A, status: 'absent' },
      { class_id: CLASS, student_id: A, status: 'excused' },
    ],
  })

  it('scores the best attempt per exam, blends attendance and ranks students', () => {
    const [a, b, c] = report.ranking
    // exam = avg(90, 70) = 80; attendance = 2/3 = 66.7; final = 0.9*80 + 0.1*66.7 = 78.7
    expect(a).toMatchObject({
      studentId: A,
      rank: 1,
      examScore: 80,
      attendanceRate: 66.7,
      finalScore: 78.7,
      classification: 'good',
      passed: true,
      examsTaken: 2,
      examsPassed: 2,
      attempts: 3,
      retakes: 1,
      pendingRetakes: 0,
    })
    expect(b).toMatchObject({ studentId: B, rank: 2, finalScore: 30, classification: 'weak', passed: false, pendingRetakes: 1 })
    expect(c).toMatchObject({ studentId: C, rank: null, finalScore: null, classification: null, passed: null })
  })

  it('aggregates pass/fail by class, level and month', () => {
    expect(report.totals).toMatchObject({ students: 3, passed: 2, failed: 1, passRate: 66.7 })
    expect(report.byClass).toEqual([
      expect.objectContaining({ classId: CLASS, students: 3, passed: 2, failed: 1 }),
    ])
    expect(report.byLevel).toEqual([expect.objectContaining({ levelCode: 'starter', passed: 2, failed: 1 })])
    expect(report.byMonth).toEqual([
      { month: '2026-10', passed: 0, failed: 1 },
      { month: '2026-11', passed: 2, failed: 1 },
    ])
    expect(report.classifications).toEqual({ excellent: 0, good: 1, average: 0, weak: 1, unranked: 1 })
  })
})

describe('buildStudentReport — phân trang xếp hạng (slice-24)', () => {
  const input = {
    policies: [POLICY],
    enrollments: [
      enrollment(A, '0900000001'),
      enrollment(B, '0900000002'),
      enrollment(C, '0900000003'),
    ],
    attempts: [attempt(A, 'e1', 9, true, '2026-11'), attempt(B, 'e1', 3, false, '2026-11')],
    attendance: [],
  }

  it('không truyền trang (dùng cho export) -> trả toàn bộ trong một trang', () => {
    const full = buildStudentReport(input)
    expect(full.ranking).toHaveLength(3)
    expect(full.rankingPage).toEqual({ page: 1, pageSize: 3, total: 3, totalPages: 1 })
  })

  it('cắt trang SAU khi xếp hạng nên rank vẫn đúng toàn cục', () => {
    const page2 = buildStudentReport(input, { page: 2, pageSize: 2 })
    expect(page2.ranking).toHaveLength(1)
    // Dòng duy nhất của trang 2 vẫn giữ rank toàn cục (không đánh lại số từ 1).
    expect(page2.ranking[0]).toMatchObject({ studentId: C, rank: null })
    expect(page2.rankingPage).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 })
  })

  it('trang vượt phạm vi được kẹp về trang cuối thay vì trả rỗng', () => {
    const far = buildStudentReport(input, { page: 99, pageSize: 2 })
    expect(far.rankingPage.page).toBe(2)
    expect(far.ranking).toHaveLength(1)
  })

  it('q lọc sau khi xếp hạng: rank giữ nguyên và các panel tổng hợp không đổi', () => {
    const found = buildStudentReport(input, { page: 1, pageSize: 20, q: '0900000003' })
    expect(found.ranking).toHaveLength(1)
    expect(found.ranking[0]).toMatchObject({ studentId: C })
    expect(found.rankingPage).toMatchObject({ total: 1, totalPages: 1 })
    // Tim kiem chi anh huong bang xep hang, khong lam thay doi so lieu tong hop.
    expect(found.totals.students).toBe(3)
    expect(found.classifications).toEqual({
      excellent: 1,
      good: 0,
      average: 0,
      weak: 1,
      unranked: 1,
    })
  })

  it('q không khớp ai -> trang rỗng nhưng vẫn có metadata hợp lệ', () => {
    const none = buildStudentReport(input, { page: 1, pageSize: 20, q: 'khong-ton-tai' })
    expect(none.ranking).toEqual([])
    expect(none.rankingPage).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  })
})
