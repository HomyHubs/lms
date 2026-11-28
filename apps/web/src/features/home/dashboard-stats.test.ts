import { describe, expect, it } from 'vitest'
import type { Class, Course, Level } from '@lms/shared'
import { buildStudentsByLevel } from './dashboard-stats'

/**
 * slice-16: dữ liệu cột "Tổng số học viên theo cấp độ".
 * Hàm thuần nên test trực tiếp, không cần recharts/jsdom.
 */

const LEVELS: Level[] = [
  // Cố tình trả về sai thứ tự để kiểm tra hàm tự sắp Starter → Mover → Flyer.
  { id: 'lv-flyer', code: 'flyer', name: 'Flyer' },
  { id: 'lv-starter', code: 'starter', name: 'Starter' },
  { id: 'lv-mover', code: 'mover', name: 'Mover' },
]

const COURSES: Course[] = [
  { id: 'co-s1', levelId: 'lv-starter', name: 'Starters 1', createdAt: '' },
  { id: 'co-s2', levelId: 'lv-starter', name: 'Starters 2', createdAt: '' },
  { id: 'co-m1', levelId: 'lv-mover', name: 'Movers 1', createdAt: '' },
]

const CLASSES: Class[] = [
  { id: 'cl-1', courseId: 'co-s1', branchId: 'br-1', name: 'Lớp S1-A', createdAt: '' },
  { id: 'cl-2', courseId: 'co-s1', branchId: 'br-2', name: 'Lớp S1-B', createdAt: '' },
  { id: 'cl-3', courseId: 'co-s2', branchId: 'br-1', name: 'Lớp S2-A', createdAt: '' },
  { id: 'cl-4', courseId: 'co-m1', branchId: 'br-1', name: 'Lớp M1-A', createdAt: '' },
]

const COUNTS = new Map<string, number>([
  ['cl-1', 10],
  ['cl-2', 5],
  ['cl-3', 2],
  ['cl-4', 7],
])

describe('buildStudentsByLevel', () => {
  it('cộng dồn học viên theo cấp độ qua mọi khóa và mọi lớp', () => {
    const result = buildStudentsByLevel(LEVELS, COURSES, CLASSES, COUNTS)
    expect(result.map((r) => [r.levelCode, r.value])).toEqual([
      ['starter', 17],
      ['mover', 7],
      ['flyer', 0],
    ])
  })

  it('sắp theo Starter → Mover → Flyer, không theo alphabet hay thứ tự API', () => {
    const result = buildStudentsByLevel(LEVELS, COURSES, CLASSES, COUNTS)
    expect(result.map((r) => r.name)).toEqual(['Starter', 'Mover', 'Flyer'])
  })

  it('giữ cấp độ chưa có khóa học với value 0 thay vì bỏ khỏi biểu đồ', () => {
    const result = buildStudentsByLevel(LEVELS, COURSES, CLASSES, COUNTS)
    const flyer = result.find((r) => r.levelCode === 'flyer')
    expect(flyer).toBeDefined()
    expect(flyer?.value).toBe(0)
    expect(flyer?.courses).toEqual([])
  })

  it('trả chi tiết từng khóa học bên trong cấp độ (cho tooltip)', () => {
    const result = buildStudentsByLevel(LEVELS, COURSES, CLASSES, COUNTS)
    const starter = result.find((r) => r.levelCode === 'starter')
    expect(starter?.courses).toEqual([
      { name: 'Starters 1', value: 15 },
      { name: 'Starters 2', value: 2 },
    ])
  })

  it('bỏ qua cấp độ lạ không nằm trong LEVEL_CODES', () => {
    const levels: Level[] = [
      ...LEVELS,
      { id: 'lv-x', code: 'unknown' as unknown as Level['code'], name: 'Unknown' },
    ]
    const result = buildStudentsByLevel(levels, COURSES, CLASSES, COUNTS)
    expect(result).toHaveLength(3)
  })

  it('trả mảng rỗng khi API chưa có cấp độ nào', () => {
    expect(buildStudentsByLevel([], COURSES, CLASSES, COUNTS)).toEqual([])
  })
})
