import { describe, expect, it } from 'vitest'
import type {
  CatalogStore,
  ClassRow,
  CourseRow,
  EnrollmentRow,
  LevelRow,
} from './service.js'
import {
  createClass,
  createCourse,
  createEnrollment,
  deleteCourse,
  listClasses,
  listCourses,
  listEnrollments,
  listLevels,
  updateClass,
  updateCourse,
} from './service.js'

const LEVELS: LevelRow[] = [
  { id: 'lvl-starter', code: 'starter', name: 'Starter' },
  { id: 'lvl-mover', code: 'mover', name: 'Mover' },
  { id: 'lvl-flyer', code: 'flyer', name: 'Flyer' },
]

/** Store gia lap trong bo nho de test logic ma khong can Postgres. */
function makeFakeStore(opts: { branchIds?: string[]; userIds?: string[] } = {}): CatalogStore {
  const levels: LevelRow[] = [...LEVELS]
  const courses: CourseRow[] = []
  const classes: ClassRow[] = []
  const enrollments: EnrollmentRow[] = []
  const branches = new Set(opts.branchIds ?? [])
  const users = new Set(opts.userIds ?? [])
  let seq = 0
  const now = new Date('2026-09-16T00:00:00.000Z')
  return {
    async listLevels() {
      return [...levels]
    },
    async findLevelById(id) {
      return levels.find((l) => l.id === id)
    },
    async listCourses() {
      return [...courses]
    },
    async findCourseById(id) {
      return courses.find((c) => c.id === id)
    },
    async createCourse({ levelId, name }) {
      const row: CourseRow = { id: `course-${(seq += 1)}`, level_id: levelId, name, created_at: now }
      courses.push(row)
      return row
    },
    async updateCourse(id, input) {
      const row = courses.find((c) => c.id === id)
      if (!row) return undefined
      if (input.levelId !== undefined) row.level_id = input.levelId
      if (input.name !== undefined) row.name = input.name
      return row
    },
    async deleteCourse(id) {
      const idx = courses.findIndex((c) => c.id === id)
      if (idx < 0) return false
      courses.splice(idx, 1)
      return true
    },
    async listClasses(branchIds) {
      if (branchIds && branchIds.length === 0) return []
      const all = [...classes]
      return branchIds ? all.filter((c) => branchIds.includes(c.branch_id)) : all
    },
    async findClassById(id) {
      return classes.find((c) => c.id === id)
    },
    async createClass({ courseId, branchId, name }) {
      const row: ClassRow = {
        id: `class-${(seq += 1)}`,
        course_id: courseId,
        branch_id: branchId,
        name,
        created_at: now,
      }
      classes.push(row)
      return row
    },
    async updateClass(id, input) {
      const row = classes.find((c) => c.id === id)
      if (!row) return undefined
      if (input.branchId !== undefined) row.branch_id = input.branchId
      if (input.name !== undefined) row.name = input.name
      return row
    },
    async deleteClass(id) {
      const idx = classes.findIndex((c) => c.id === id)
      if (idx < 0) return false
      classes.splice(idx, 1)
      return true
    },
    async branchExists(id) {
      return branches.has(id)
    },
    async userExists(id) {
      return users.has(id)
    },
    async listEnrollmentsByClass(classId) {
      return enrollments.filter((e) => e.class_id === classId)
    },
    async findEnrollment(classId, studentId) {
      return enrollments.find((e) => e.class_id === classId && e.student_id === studentId)
    },
    async createEnrollment({ classId, studentId }) {
      const row: EnrollmentRow = {
        id: `enr-${(seq += 1)}`,
        class_id: classId,
        student_id: studentId,
        created_at: now,
      }
      enrollments.push(row)
      return row
    },
    async deleteEnrollment(id) {
      const idx = enrollments.findIndex((e) => e.id === id)
      if (idx < 0) return false
      enrollments.splice(idx, 1)
      return true
    },
  }
}

describe('levels', () => {
  it('lists the three seeded levels', async () => {
    expect(await listLevels(makeFakeStore())).toHaveLength(3)
  })
})

describe('courses', () => {
  it('rejects a course under a missing level', async () => {
    const store = makeFakeStore()
    expect(await createCourse(store, { levelId: 'nope', name: 'KH1' })).toEqual({
      ok: false,
      reason: 'level_not_found',
    })
  })

  it('creates, lists, updates and deletes a course', async () => {
    const store = makeFakeStore()
    const created = await createCourse(store, { levelId: 'lvl-starter', name: 'KH1' })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    expect(await listCourses(store)).toHaveLength(1)

    const updated = await updateCourse(store, created.course.id, { name: 'KH1-moi' })
    expect(updated.ok).toBe(true)
    if (updated.ok) expect(updated.course.name).toBe('KH1-moi')

    expect(await updateCourse(store, created.course.id, { levelId: 'nope' })).toEqual({
      ok: false,
      reason: 'level_not_found',
    })

    expect(await deleteCourse(store, created.course.id)).toBe(true)
    expect(await deleteCourse(store, created.course.id)).toBe(false)
  })
})

describe('classes', () => {
  it('requires an existing course and branch', async () => {
    const store = makeFakeStore({ branchIds: ['branch-1'] })
    const created = await createCourse(store, { levelId: 'lvl-mover', name: 'KH' })
    if (!created.ok) throw new Error('setup failed')

    expect(await createClass(store, { courseId: 'nope', branchId: 'branch-1', name: 'L1' })).toEqual({
      ok: false,
      reason: 'course_not_found',
    })
    expect(
      await createClass(store, { courseId: created.course.id, branchId: 'nope', name: 'L1' }),
    ).toEqual({ ok: false, reason: 'branch_not_found' })

    const klass = await createClass(store, {
      courseId: created.course.id,
      branchId: 'branch-1',
      name: 'L1',
    })
    expect(klass.ok).toBe(true)
    if (klass.ok) expect(klass.class.branchId).toBe('branch-1')
  })

  it('scopes the class list by branch (branch-scoped)', async () => {
    const store = makeFakeStore({ branchIds: ['b1', 'b2'] })
    const course = await createCourse(store, { levelId: 'lvl-flyer', name: 'KH' })
    if (!course.ok) throw new Error('setup failed')
    await createClass(store, { courseId: course.course.id, branchId: 'b1', name: 'L1' })
    await createClass(store, { courseId: course.course.id, branchId: 'b2', name: 'L2' })

    expect(await listClasses(store)).toHaveLength(2)
    expect(await listClasses(store, ['b1'])).toHaveLength(1)
    expect(await listClasses(store, [])).toHaveLength(0)

    const moved = await updateClass(store, (await store.listClasses())[0]!.id, { branchId: 'nope' })
    expect(moved).toEqual({ ok: false, reason: 'branch_not_found' })
  })
})

describe('enrollments', () => {
  it('enforces class, student and duplicate rules', async () => {
    const store = makeFakeStore({ branchIds: ['b1'], userIds: ['student-1'] })
    const course = await createCourse(store, { levelId: 'lvl-starter', name: 'KH' })
    if (!course.ok) throw new Error('setup failed')
    const klass = await createClass(store, { courseId: course.course.id, branchId: 'b1', name: 'L1' })
    if (!klass.ok) throw new Error('setup failed')

    expect(
      await createEnrollment(store, { classId: 'nope', studentId: 'student-1' }),
    ).toEqual({ ok: false, reason: 'class_not_found' })

    expect(
      await createEnrollment(store, { classId: klass.class.id, studentId: 'ghost' }),
    ).toEqual({ ok: false, reason: 'student_not_found' })

    const first = await createEnrollment(store, { classId: klass.class.id, studentId: 'student-1' })
    expect(first.ok).toBe(true)

    expect(
      await createEnrollment(store, { classId: klass.class.id, studentId: 'student-1' }),
    ).toEqual({ ok: false, reason: 'already_enrolled' })

    expect(await listEnrollments(store, klass.class.id)).toHaveLength(1)
  })
})
