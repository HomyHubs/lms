import { describe, expect, it } from 'vitest'
import {
  buildStudentReport,
  classify,
  finalScore,
  type EnrollmentRow,
  type GradedAttemptRow,
  type PolicyRow,
} from './service.js'

const LEVEL = '10000000-0000-0000-0000-000000000001'
const CLASS = '50000000-0000-0000-0000-000000000001'
const A = '80000000-0000-0000-0000-000000000001'
const B = '80000000-0000-0000-0000-000000000002'
const C = '80000000-0000-0000-0000-000000000003'

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
