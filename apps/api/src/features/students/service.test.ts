import { describe, expect, it } from 'vitest'
import type {
  StudentAttendanceAggRow,
  StudentExamAggRow,
  StudentIdentityRow,
  StudentSearchRow,
  StudentsStore,
} from './service.js'
import { loadStudentProfile, searchStudents } from './service.js'

/** Mot hoc vien gia lap: danh tinh + co so + so lieu thi/chuyen can. */
interface FakeStudent {
  id: string
  phone_number: string
  full_name: string | null
  branch_id: string
  branch_name: string | null
  level_code: string | null
  exam: StudentExamAggRow
  attendance: StudentAttendanceAggRow
}

/** Store gia lap trong bo nho — khong can Postgres; branch-scope mo phong o day. */
function makeFakeStore(seed: FakeStudent[]): StudentsStore {
  const inScope = (s: FakeStudent, branchIds: string[] | undefined): boolean =>
    branchIds === undefined ? true : branchIds.includes(s.branch_id)

  return {
    async searchStudents(q, branchIds) {
      if (branchIds && branchIds.length === 0) return []
      const needle = q.toLowerCase()
      return seed
        .filter((s) => inScope(s, branchIds))
        .filter(
          (s) =>
            (s.full_name ?? '').toLowerCase().includes(needle) || s.phone_number.includes(q),
        )
        .map(
          (s): StudentSearchRow => ({
            id: s.id,
            phone_number: s.phone_number,
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
        full_name: s.full_name,
        branch_name: s.branch_name,
        level_code: s.level_code,
      } satisfies StudentIdentityRow
    },
    async loadExamAgg(studentId) {
      return seed.find((x) => x.id === studentId)?.exam ?? { attempts: 0, passed: 0, failed: 0, avg_score_pct: null }
    },
    async loadAttendanceAgg(studentId) {
      return (
        seed.find((x) => x.id === studentId)?.attendance ?? {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        }
      )
    },
  }
}

const HN = '10000000-0000-0000-0000-000000000001'
const HCM = '10000000-0000-0000-0000-000000000002'

const SEED: FakeStudent[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    phone_number: '0900000001',
    full_name: 'Nguyễn An',
    branch_id: HN,
    branch_name: 'Cơ sở HN',
    level_code: 'Starter',
    exam: { attempts: 4, passed: 3, failed: 1, avg_score_pct: 80 },
    attendance: { present: 8, absent: 1, late: 1, excused: 0 },
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    phone_number: '0900000002',
    full_name: 'Trần Bình',
    branch_id: HCM,
    branch_name: 'Cơ sở HCM',
    level_code: 'Mover',
    exam: { attempts: 0, passed: 0, failed: 0, avg_score_pct: null },
    attendance: { present: 0, absent: 0, late: 0, excused: 0 },
  },
]

describe('searchStudents', () => {
  it('finds a student by name within the caller branches', async () => {
    const store = makeFakeStore(SEED)
    const results = await searchStudents(store, 'An', [HN])
    expect(results).toHaveLength(1)
    expect(results[0]?.phoneNumber).toBe('0900000001')
    expect(results[0]?.studentCode).toBeNull()
    expect(results[0]?.branchName).toBe('Cơ sở HN')
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
  it('aggregates exam, attendance and classification panels', async () => {
    const store = makeFakeStore(SEED)
    const profile = await loadStudentProfile(store, SEED[0]!.id, [HN])
    expect(profile).not.toBeNull()
    if (!profile) return
    expect(profile.exam).toEqual({ attempts: 4, passed: 3, failed: 1, avgScorePct: 80 })
    // Ti le di hoc = (present + late) / tong = (8+1)/10 = 90%.
    expect(profile.attendance?.ratePct).toBe(90)
    // Xep loai tam thoi tu diem thi trung binh 80 -> 'good'.
    expect(profile.classification).toEqual({ finalScore: 80, label: 'good' })
  })

  it('returns null panels when there is no exam/attendance data', async () => {
    const store = makeFakeStore(SEED)
    const profile = await loadStudentProfile(store, SEED[1]!.id, undefined)
    expect(profile?.exam).toBeNull()
    expect(profile?.attendance).toBeNull()
    expect(profile?.classification).toBeNull()
  })

  it('returns null for an unknown or out-of-scope student', async () => {
    const store = makeFakeStore(SEED)
    expect(await loadStudentProfile(store, 'missing', undefined)).toBeNull()
    // Hoc vien HCM nhung nguoi dung chi co HN -> ngoai pham vi -> null.
    expect(await loadStudentProfile(store, SEED[1]!.id, [HN])).toBeNull()
  })
})
