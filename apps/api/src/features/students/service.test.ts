import { describe, expect, it } from 'vitest'
import { STUDENT_CODE_SEPARATOR, type ClassificationPolicy } from '@lms/shared'
import type {
  StudentAttendanceAggRow,
  StudentExamAggRow,
  StudentIdentityRow,
  StudentSearchRow,
  StudentsStore,
  StudentStudyAggRow,
} from './service.js'
import { loadStudentProfile, searchStudents } from './service.js'

/** Mot hoc vien gia lap: danh tinh + co so + so lieu thi/chuyen can/thoi gian hoc. */
interface FakeStudent {
  id: string
  phone_number: string
  student_code: string | null
  full_name: string | null
  branch_id: string
  branch_name: string | null
  level_code: string | null
  level_id: string | null
  /** undefined = dung DEFAULT_POLICY; null = cap do chua co policy. */
  policy?: ClassificationPolicy | null
  exam: StudentExamAggRow
  attendance: StudentAttendanceAggRow
  study: StudentStudyAggRow
}

/** Policy mac dinh theo ADR 0006: thi 90% + chuyen can 10%, nguong 85/70/50. */
const DEFAULT_POLICY: ClassificationPolicy = {
  levelId: '30000000-0000-4000-8000-000000000001',
  levelCode: 'starter',
  levelName: 'Starter',
  examWeight: 90,
  attendanceWeight: 10,
  excellentMin: 85,
  goodMin: 70,
  averageMin: 50,
  passMin: 50,
}

/** Store gia lap trong bo nho — khong can Postgres; branch-scope mo phong o day. */
function makeFakeStore(seed: FakeStudent[]): StudentsStore {
  const inScope = (s: FakeStudent, branchIds: string[] | undefined): boolean =>
    branchIds === undefined ? true : branchIds.includes(s.branch_id)

  return {
    async searchStudents(q, branchIds) {
      if (branchIds && branchIds.length === 0) return []
      const needle = q.toLowerCase()
      // slice-23-c (ADR 0022): ma hoc vien co dau phan cach; so khop ma bo qua dau o CA HAI phia,
      // giong `students/store.ts`. Store gia lap lech khoi store that la cach chac chan nhat de test
      // noi doi.
      const codeNeedle = needle.split(STUDENT_CODE_SEPARATOR).join('')
      const codeOf = (code: string | null): string =>
        (code ?? '').toLowerCase().split(STUDENT_CODE_SEPARATOR).join('')
      // Go moi dau phan cach -> chuoi rong; `includes('')` dung voi MOI ma, phai loai han truong hop
      // nay de giong store that (`%%` khop tat ca).
      const matchesCode = (code: string | null): boolean =>
        codeNeedle !== '' && codeOf(code).includes(codeNeedle)
      return seed
        .filter((s) => inScope(s, branchIds))
        .filter(
          (s) =>
            (s.full_name ?? '').toLowerCase().includes(needle) ||
            s.phone_number.includes(q) ||
            matchesCode(s.student_code),
        )
        .map(
          (s): StudentSearchRow => ({
            id: s.id,
            phone_number: s.phone_number,
            student_code: s.student_code,
            full_name: s.full_name,
            branch_name: s.branch_name,
            level_code: s.level_code,
          }),
        )
    },
    async findStudentIdentity(id, branchIds) {
      const s = seed.find((x) => x.id === id && inScope(x, branchIds))
      if (!s) return undefined
      return {
        id: s.id,
        phone_number: s.phone_number,
        student_code: s.student_code,
        full_name: s.full_name,
        branch_name: s.branch_name,
        level_code: s.level_code,
        level_id: s.level_id,
      } satisfies StudentIdentityRow
    },
    async loadAggregates(studentId) {
      // slice-30: 3 panel lay trong mot truy van; store gia lap tra cung mot luc.
      const s = seed.find((x) => x.id === studentId)
      return {
        exam: s?.exam ?? { attempts: 0, passed: 0, failed: 0, avg_score_pct: null },
        attendance: s?.attendance ?? { present: 0, absent: 0, late: 0, excused: 0 },
        study: s?.study ?? { sessions_attended: 0, study_minutes: 0 },
      }
    },
    async loadPolicy(levelId) {
      const owner = seed.find((s) => s.level_id === levelId)
      if (!owner) return null
      return owner.policy === undefined ? DEFAULT_POLICY : owner.policy
    },
  }
}

const HN = '10000000-0000-4000-8000-000000000001'
const HCM = '10000000-0000-4000-8000-000000000002'

const SEED: FakeStudent[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    phone_number: '0900000001',
    student_code: 'HN-0001',
    full_name: 'Nguyễn An',
    branch_id: HN,
    branch_name: 'Cơ sở HN',
    level_code: 'Starter',
    level_id: DEFAULT_POLICY.levelId,
    exam: { attempts: 4, passed: 3, failed: 1, avg_score_pct: 80 },
    attendance: { present: 8, absent: 1, late: 1, excused: 0 },
    study: { sessions_attended: 9, study_minutes: 810 },
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    phone_number: '0900000002',
    // Hoc vien cu chua duoc backfill ma (slice-23) -> null.
    student_code: null,
    full_name: 'Trần Bình',
    branch_id: HCM,
    branch_name: 'Cơ sở HCM',
    level_code: 'Mover',
    level_id: '30000000-0000-4000-8000-000000000002',
    exam: { attempts: 0, passed: 0, failed: 0, avg_score_pct: null },
    attendance: { present: 0, absent: 0, late: 0, excused: 0 },
    study: { sessions_attended: 0, study_minutes: 0 },
  },
]

describe('searchStudents', () => {
  it('finds a student by name within the caller branches and returns the student code', async () => {
    const store = makeFakeStore(SEED)
    const results = await searchStudents(store, 'An', [HN])
    expect(results).toHaveLength(1)
    expect(results[0]?.phoneNumber).toBe('0900000001')
    expect(results[0]?.studentCode).toBe('HN-0001')
    expect(results[0]?.branchName).toBe('Cơ sở HN')
  })

  it('finds a student by student code', async () => {
    const store = makeFakeStore(SEED)
    const results = await searchStudents(store, 'hn0001', [HN])
    expect(results.map((r) => r.studentCode)).toEqual(['HN-0001'])
  })

  // slice-23-c (ADR 0022): ma co dau phan cach. Go dung nhu tren the, va go lai theo tri nho
  // (khong co dau) — ca hai deu phai tim ra, vi ma la thu nguoi ta dan tay vao o tim kiem.
  it('finds a student by code whether or not the separator is typed', async () => {
    const store = makeFakeStore(SEED)
    for (const q of ['HN-0001', 'hn-0001', 'HN0001', 'hn0001']) {
      const results = await searchStudents(store, q, [HN])
      expect(results.map((r) => r.studentCode), `q=${q}`).toEqual(['HN-0001'])
    }
  })

  // Bỏ dấu phân cách khỏi query '-' cho ra chuỗi rỗng; nếu không chặn thì `%%` khớp mọi học viên.
  it('returns nothing when the query is only the separator', async () => {
    const store = makeFakeStore(SEED)
    const results = await searchStudents(store, '-', [HN])
    expect(results).toEqual([])
  })

  it('keeps studentCode null for a legacy student without a code', async () => {
    const store = makeFakeStore(SEED)
    const results = await searchStudents(store, 'Bình', undefined)
    expect(results).toHaveLength(1)
    expect(results[0]?.studentCode).toBeNull()
  })

  it('excludes out-of-scope students', async () => {
    const store = makeFakeStore(SEED)
    // Nguoi dung chi co co so HN: khong thay hoc vien HCM du khop ten.
    const results = await searchStudents(store, 'Bình', [HN])
    expect(results).toHaveLength(0)
  })

  it('superadmin (branchIds undefined) sees all branches', async () => {
    const store = makeFakeStore(SEED)
    const results = await searchStudents(store, '09000000', undefined)
    expect(results).toHaveLength(2)
  })

  it('returns nothing when the caller has no branch', async () => {
    const store = makeFakeStore(SEED)
    expect(await searchStudents(store, 'An', [])).toHaveLength(0)
  })
})

describe('loadStudentProfile', () => {
  it('aggregates exam, attendance, study and classification panels', async () => {
    const store = makeFakeStore(SEED)
    const profile = await loadStudentProfile(store, SEED[0]!.id, [HN])
    expect(profile).not.toBeNull()
    if (!profile) return
    expect(profile.studentCode).toBe('HN-0001')
    expect(profile.exam).toEqual({ attempts: 4, passed: 3, failed: 1, avgScorePct: 80 })
    // Ti le di hoc = (present + late) / (present + late + absent) = (8+1)/10 = 90%.
    expect(profile.attendance?.ratePct).toBe(90)
    // Chi tinh buoi co mat/di muon, phut = thoi luong buoi hoc that.
    expect(profile.study).toEqual({ sessionsAttended: 9, studyMinutes: 810 })
    // ADR 0006: final = 90% * 80 + 10% * 90 = 81 -> 'good' (nguong 85/70/50).
    expect(profile.classification).toEqual({ finalScore: 81, label: 'good' })
  })

  it('loại vắng có phép khỏi mẫu số tỉ lệ chuyên cần (ADR 0006)', async () => {
    const store = makeFakeStore([
      { ...SEED[0]!, attendance: { present: 5, late: 0, absent: 0, excused: 5 } },
    ])
    const profile = await loadStudentProfile(store, SEED[0]!.id, undefined)
    // Vang co phep khong bi tru: 5/5 = 100%, khong phai 5/10 = 50%.
    expect(profile?.attendance?.ratePct).toBe(100)
  })

  it('dùng trọng số của policy cấp độ cho điểm tổng', async () => {
    const store = makeFakeStore([
      {
        ...SEED[0]!,
        exam: { attempts: 1, passed: 1, failed: 0, avg_score_pct: 80 },
        attendance: { present: 10, late: 0, absent: 0, excused: 0 },
        policy: { ...DEFAULT_POLICY, examWeight: 50, attendanceWeight: 50 },
      },
    ])
    const profile = await loadStudentProfile(store, SEED[0]!.id, undefined)
    // 50% * 80 + 50% * 100 = 90.
    expect(profile?.classification).toEqual({ finalScore: 90, label: 'excellent' })
  })

  it('không xếp loại khi cấp độ chưa có policy', async () => {
    const store = makeFakeStore([{ ...SEED[0]!, policy: null }])
    const profile = await loadStudentProfile(store, SEED[0]!.id, undefined)
    expect(profile?.exam).not.toBeNull()
    expect(profile?.classification).toBeNull()
  })

  it('không xếp loại khi học viên chưa vào lớp nào (không có level_id)', async () => {
    const store = makeFakeStore([{ ...SEED[0]!, level_id: null }])
    const profile = await loadStudentProfile(store, SEED[0]!.id, undefined)
    expect(profile?.classification).toBeNull()
  })

  it('returns null panels when there is no exam/attendance/study data', async () => {
    const store = makeFakeStore(SEED)
    const profile = await loadStudentProfile(store, SEED[1]!.id, undefined)
    expect(profile?.exam).toBeNull()
    expect(profile?.attendance).toBeNull()
    expect(profile?.study).toBeNull()
    expect(profile?.classification).toBeNull()
    expect(profile?.studentCode).toBeNull()
  })

  it.each([
    [95, 'excellent'],
    [85, 'excellent'],
    [84.9, 'good'],
    [70, 'good'],
    [69.9, 'average'],
    [50, 'average'],
    [49.9, 'weak'],
  ])('xếp loại điểm thi %s (không có chuyên cần) thành %s', async (avg, label) => {
    const store = makeFakeStore([
      {
        ...SEED[0]!,
        exam: { attempts: 2, passed: 1, failed: 1, avg_score_pct: avg },
        // Khong co buoi nao -> final = diem thi (ADR 0006: thieu diem danh khong phat).
        attendance: { present: 0, late: 0, absent: 0, excused: 0 },
      },
    ])
    const profile = await loadStudentProfile(store, SEED[0]!.id, undefined)
    expect(profile?.classification).toEqual({ finalScore: avg, label })
  })

  it('does not classify when attempts exist but no score was recorded', async () => {
    const store = makeFakeStore([
      { ...SEED[0]!, exam: { attempts: 2, passed: 0, failed: 0, avg_score_pct: null } },
    ])
    const profile = await loadStudentProfile(store, SEED[0]!.id, undefined)
    expect(profile?.exam).toEqual({ attempts: 2, passed: 0, failed: 0, avgScorePct: null })
    expect(profile?.classification).toBeNull()
  })

  it('returns null for an unknown or out-of-scope student', async () => {
    const store = makeFakeStore(SEED)
    expect(await loadStudentProfile(store, 'missing', undefined)).toBeNull()
    // Hoc vien HCM nhung nguoi dung chi co HN -> ngoai pham vi -> null.
    expect(await loadStudentProfile(store, SEED[1]!.id, [HN])).toBeNull()
  })
})
