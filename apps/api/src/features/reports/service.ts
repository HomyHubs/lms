import type {
  ClassReport,
  ClassificationPolicy,
  LevelReport,
  MonthReport,
  StudentClassification,
  StudentRankingRow,
  StudentReport,
  UpdateClassificationPolicyRequest,
} from '@lms/shared'
import { summarize } from '../attendance/index.js'

/** Student classification + admin dashboard (slice-7). Formula: docs/adr/0006-student-grading-dashboard.md. */

export interface PolicyRow {
  level_id: string
  level_code: string
  level_name: string
  exam_weight: number
  attendance_weight: number
  excellent_min: number
  good_min: number
  average_min: number
}

export interface EnrollmentRow {
  class_id: string
  class_name: string
  branch_id: string
  branch_name: string
  level_id: string
  level_code: string
  student_id: string
  phone_number: string
  /** Họ tên ghép (last_name + first_name); null khi chưa có hồ sơ. */
  student_name: string | null
}

export interface GradedAttemptRow {
  id: string
  student_id: string
  exam_id: string
  level_id: string
  attempt_number: number
  score: number
  max_score: number
  passed: boolean
  max_attempts: number
  /** `YYYY-MM` of graded_at. */
  graded_month: string
}

export interface AttendanceStatusRow {
  class_id: string
  student_id: string
  status: string
}

export interface DateRange {
  from?: string
  to?: string
}

export interface EnrollmentFilter {
  branchIds: string[]
  levelId?: string
  classId?: string
}

export interface ReportsStore {
  listPolicies: () => Promise<PolicyRow[]>
  levelExists: (levelId: string) => Promise<boolean>
  upsertPolicy: (levelId: string, policy: UpdateClassificationPolicyRequest) => Promise<void>
  listEnrollments: (filter: EnrollmentFilter) => Promise<EnrollmentRow[]>
  listGradedAttempts: (
    studentIds: string[],
    levelIds: string[],
    range: DateRange,
  ) => Promise<GradedAttemptRow[]>
  listAttendanceStatuses: (classIds: string[], range: DateRange) => Promise<AttendanceStatusRow[]>
}

export function toPolicyDto(row: PolicyRow): ClassificationPolicy {
  return {
    levelId: row.level_id,
    levelCode: row.level_code,
    levelName: row.level_name,
    examWeight: row.exam_weight,
    attendanceWeight: row.attendance_weight,
    excellentMin: row.excellent_min,
    goodMin: row.good_min,
    averageMin: row.average_min,
  }
}

const round1 = (n: number): number => Math.round(n * 10) / 10

function average(values: readonly (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null)
  return known.length === 0 ? null : round1(known.reduce((a, b) => a + b, 0) / known.length)
}

function percentOf(part: number, whole: number): number | null {
  return whole === 0 ? null : round1((part / whole) * 100)
}

/**
 * Weighted final score. No exam result -> not classifiable (null). No countable attendance ->
 * the exam score alone, so a missing roll call never punishes the student.
 */
export function finalScore(
  examScore: number | null,
  attendanceRate: number | null,
  policy: Pick<ClassificationPolicy, 'examWeight' | 'attendanceWeight'>,
): number | null {
  if (examScore === null) return null
  if (attendanceRate === null) return round1(examScore)
  return round1((examScore * policy.examWeight + attendanceRate * policy.attendanceWeight) / 100)
}

export function classify(
  score: number | null,
  policy: Pick<ClassificationPolicy, 'excellentMin' | 'goodMin' | 'averageMin'>,
): StudentClassification | null {
  if (score === null) return null
  if (score >= policy.excellentMin) return 'excellent'
  if (score >= policy.goodMin) return 'good'
  if (score >= policy.averageMin) return 'average'
  return 'weak'
}

interface ExamOutcome {
  bestPercent: number
  passed: boolean
  attempts: number
  maxAttempts: number
}

/** Per exam: best graded percentage, passed if any attempt passed. */
function examOutcomes(attempts: readonly GradedAttemptRow[]): ExamOutcome[] {
  const byExam = new Map<string, ExamOutcome>()
  for (const a of attempts) {
    const percent = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0
    const prev = byExam.get(a.exam_id)
    byExam.set(a.exam_id, {
      bestPercent: Math.max(prev?.bestPercent ?? 0, percent),
      passed: (prev?.passed ?? false) || a.passed,
      attempts: (prev?.attempts ?? 0) + 1,
      maxAttempts: a.max_attempts,
    })
  }
  return [...byExam.values()]
}

const pairKey = (a: string, b: string): string => `${a}|${b}`

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = groups.get(k)
    if (list) list.push(item)
    else groups.set(k, [item])
  }
  return groups
}

/** Competition ranking (1, 2, 2, 4) by final score; unclassifiable rows get no rank. */
function rankRows(rows: Omit<StudentRankingRow, 'rank'>[]): StudentRankingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.finalScore === b.finalScore) return a.phoneNumber.localeCompare(b.phoneNumber)
    if (a.finalScore === null) return 1
    if (b.finalScore === null) return -1
    return b.finalScore - a.finalScore
  })
  return sorted.map((row) => ({
    ...row,
    rank:
      row.finalScore === null
        ? null
        : sorted.findIndex((r) => r.finalScore === row.finalScore) + 1,
  }))
}

interface ReportInput {
  policies: readonly PolicyRow[]
  enrollments: readonly EnrollmentRow[]
  attempts: readonly GradedAttemptRow[]
  attendance: readonly AttendanceStatusRow[]
}

function passFail(rows: readonly StudentRankingRow[]): { passed: number; failed: number } {
  const passed = rows.reduce((n, r) => n + r.examsPassed, 0)
  const taken = rows.reduce((n, r) => n + r.examsTaken, 0)
  return { passed, failed: taken - passed }
}

export function buildStudentReport(input: ReportInput): StudentReport {
  const policyByLevel = new Map(input.policies.map((p) => [p.level_id, toPolicyDto(p)]))
  const attemptsByStudentLevel = groupBy(input.attempts, (a) => pairKey(a.student_id, a.level_id))
  const statusesByEnrollment = groupBy(input.attendance, (r) => pairKey(r.class_id, r.student_id))

  const unranked = input.enrollments.flatMap((e) => {
    const policy = policyByLevel.get(e.level_id)
    if (!policy) return []
    const outcomes = examOutcomes(attemptsByStudentLevel.get(pairKey(e.student_id, e.level_id)) ?? [])
    const examScore = average(outcomes.map((o) => o.bestPercent))
    const statuses = (statusesByEnrollment.get(pairKey(e.class_id, e.student_id)) ?? []).map(
      (r) => r.status,
    )
    const attendanceRate = summarize(statuses).ratePercent
    const score = finalScore(examScore, attendanceRate, policy)
    const attempts = outcomes.reduce((n, o) => n + o.attempts, 0)
    return [
      {
        studentId: e.student_id,
        phoneNumber: e.phone_number,
        studentName: e.student_name,
        classId: e.class_id,
        className: e.class_name,
        branchName: e.branch_name,
        levelCode: e.level_code,
        examScore,
        attendanceRate,
        finalScore: score,
        classification: classify(score, policy),
        examsTaken: outcomes.length,
        examsPassed: outcomes.filter((o) => o.passed).length,
        attempts,
        retakes: attempts - outcomes.length,
        pendingRetakes: outcomes.filter((o) => !o.passed && o.attempts < o.maxAttempts).length,
      },
    ]
  })
  const ranking = rankRows(unranked)

  const enrollmentByClass = new Map(input.enrollments.map((e) => [e.class_id, e]))
  const byClass: ClassReport[] = [...groupBy(ranking, (r) => r.classId)].map(([classId, rows]) => {
    const e = enrollmentByClass.get(classId) as EnrollmentRow
    return {
      classId,
      className: e.class_name,
      branchName: e.branch_name,
      levelCode: e.level_code,
      students: rows.length,
      averageFinal: average(rows.map((r) => r.finalScore)),
      ...passFail(rows),
    }
  })

  const levelIdByCode = new Map(input.enrollments.map((e) => [e.level_code, e.level_id]))
  const byLevel: LevelReport[] = [...groupBy(ranking, (r) => r.levelCode)].map(([code, rows]) => ({
    levelId: levelIdByCode.get(code) as string,
    levelCode: code,
    students: new Set(rows.map((r) => r.studentId)).size,
    averageFinal: average(rows.map((r) => r.finalScore)),
    ...passFail(rows),
  }))

  const inScope = new Set(input.enrollments.map((e) => pairKey(e.student_id, e.level_id)))
  const scopedAttempts = input.attempts.filter((a) => inScope.has(pairKey(a.student_id, a.level_id)))
  const byMonth: MonthReport[] = [...groupBy(scopedAttempts, (a) => a.graded_month)]
    .map(([month, rows]) => {
      const passed = rows.filter((a) => a.passed).length
      return { month, passed, failed: rows.length - passed }
    })
    .sort((a, b) => a.month.localeCompare(b.month))

  const classifications = { excellent: 0, good: 0, average: 0, weak: 0, unranked: 0 }
  for (const r of ranking) classifications[r.classification ?? 'unranked'] += 1

  const totalsPassFail = passFail(ranking)
  return {
    totals: {
      students: new Set(ranking.map((r) => r.studentId)).size,
      averageExamScore: average(ranking.map((r) => r.examScore)),
      averageAttendanceRate: average(ranking.map((r) => r.attendanceRate)),
      averageFinal: average(ranking.map((r) => r.finalScore)),
      passRate: percentOf(totalsPassFail.passed, totalsPassFail.passed + totalsPassFail.failed),
      ...totalsPassFail,
    },
    classifications,
    byClass,
    byLevel,
    byMonth,
    ranking,
  }
}

/** Loads every input of the report for the given scope with 4 flat queries. */
export async function loadStudentReport(
  store: ReportsStore,
  filter: EnrollmentFilter,
  range: DateRange,
): Promise<StudentReport> {
  const enrollments = await store.listEnrollments(filter)
  const studentIds = [...new Set(enrollments.map((e) => e.student_id))]
  const levelIds = [...new Set(enrollments.map((e) => e.level_id))]
  const classIds = [...new Set(enrollments.map((e) => e.class_id))]
  const [policies, attempts, attendance] = await Promise.all([
    store.listPolicies(),
    store.listGradedAttempts(studentIds, levelIds, range),
    store.listAttendanceStatuses(classIds, range),
  ])
  return buildStudentReport({ policies, enrollments, attempts, attendance })
}
