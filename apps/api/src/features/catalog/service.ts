import type {
  Class,
  Course,
  CreateClassRequest,
  CreateCourseRequest,
  CreateEnrollmentRequest,
  Enrollment,
  Level,
  LevelCode,
  UpdateClassRequest,
  UpdateCourseRequest,
} from '@lms/shared'

/**
 * Logic chuong trinh hoc (slice-1 Task 3) — thuan, khong phu thuoc Fastify de test de.
 * Level (seed) -> Course -> Class (moi Class gan 1 Branch) -> Enrollment.
 */

export interface LevelRow {
  id: string
  code: string
  name: string
}

export interface CourseRow {
  id: string
  level_id: string
  name: string
  created_at: Date | string
}

export interface ClassRow {
  id: string
  course_id: string
  branch_id: string
  name: string
  created_at: Date | string
}

export interface EnrollmentRow {
  id: string
  class_id: string
  student_id: string
  created_at: Date | string
}

export interface CreateCourseFields {
  levelId: string
  name: string
}

export interface UpdateCourseFields {
  levelId?: string
  name?: string
}

export interface CreateClassFields {
  courseId: string
  branchId: string
  name: string
}

export interface UpdateClassFields {
  branchId?: string
  name?: string
}

/** Cong ra DB ma service can — cho phep test bang cach tiem gia lap. */
export interface CatalogStore {
  listLevels: () => Promise<LevelRow[]>
  findLevelById: (id: string) => Promise<LevelRow | undefined>

  listCourses: () => Promise<CourseRow[]>
  findCourseById: (id: string) => Promise<CourseRow | undefined>
  createCourse: (input: CreateCourseFields) => Promise<CourseRow>
  updateCourse: (id: string, input: UpdateCourseFields) => Promise<CourseRow | undefined>
  deleteCourse: (id: string) => Promise<boolean>

  // `branchIds` undefined = tat ca; mang rong = khong co (branch-scoped, Task 4).
  listClasses: (branchIds?: string[]) => Promise<ClassRow[]>
  findClassById: (id: string) => Promise<ClassRow | undefined>
  createClass: (input: CreateClassFields) => Promise<ClassRow>
  updateClass: (id: string, input: UpdateClassFields) => Promise<ClassRow | undefined>
  deleteClass: (id: string) => Promise<boolean>

  branchExists: (id: string) => Promise<boolean>
  userExists: (id: string) => Promise<boolean>

  listEnrollmentsByClass: (classId: string) => Promise<EnrollmentRow[]>
  findEnrollment: (classId: string, studentId: string) => Promise<EnrollmentRow | undefined>
  createEnrollment: (input: { classId: string; studentId: string }) => Promise<EnrollmentRow>
  deleteEnrollment: (id: string) => Promise<boolean>
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

function toLevel(row: LevelRow): Level {
  return { id: row.id, code: row.code as LevelCode, name: row.name }
}

function toCourse(row: CourseRow): Course {
  return { id: row.id, levelId: row.level_id, name: row.name, createdAt: toIso(row.created_at) }
}

function toClass(row: ClassRow): Class {
  return {
    id: row.id,
    courseId: row.course_id,
    branchId: row.branch_id,
    name: row.name,
    createdAt: toIso(row.created_at),
  }
}

function toEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    classId: row.class_id,
    studentId: row.student_id,
    createdAt: toIso(row.created_at),
  }
}

// ----- Levels (chi doc) -----

export async function listLevels(store: CatalogStore): Promise<Level[]> {
  const rows = await store.listLevels()
  return rows.map(toLevel)
}

// ----- Courses -----

export async function listCourses(store: CatalogStore): Promise<Course[]> {
  const rows = await store.listCourses()
  return rows.map(toCourse)
}

export type CreateCourseOutcome =
  | { ok: true; course: Course }
  | { ok: false; reason: 'level_not_found' }

export async function createCourse(
  store: CatalogStore,
  input: CreateCourseRequest,
): Promise<CreateCourseOutcome> {
  const level = await store.findLevelById(input.levelId)
  if (!level) return { ok: false, reason: 'level_not_found' }

  const row = await store.createCourse({ levelId: input.levelId, name: input.name })
  return { ok: true, course: toCourse(row) }
}

export type UpdateCourseOutcome =
  | { ok: true; course: Course }
  | { ok: false; reason: 'not_found' | 'level_not_found' }

export async function updateCourse(
  store: CatalogStore,
  id: string,
  input: UpdateCourseRequest,
): Promise<UpdateCourseOutcome> {
  if (input.levelId !== undefined) {
    const level = await store.findLevelById(input.levelId)
    if (!level) return { ok: false, reason: 'level_not_found' }
  }
  const fields: UpdateCourseFields = {}
  if (input.levelId !== undefined) fields.levelId = input.levelId
  if (input.name !== undefined) fields.name = input.name

  const row = await store.updateCourse(id, fields)
  return row ? { ok: true, course: toCourse(row) } : { ok: false, reason: 'not_found' }
}

export async function deleteCourse(store: CatalogStore, id: string): Promise<boolean> {
  return store.deleteCourse(id)
}

// ----- Classes (moi Class gan 1 Branch) -----

export async function listClasses(store: CatalogStore, branchIds?: string[]): Promise<Class[]> {
  const rows = await store.listClasses(branchIds)
  return rows.map(toClass)
}

export type CreateClassOutcome =
  | { ok: true; class: Class }
  | { ok: false; reason: 'course_not_found' | 'branch_not_found' }

export async function createClass(
  store: CatalogStore,
  input: CreateClassRequest,
): Promise<CreateClassOutcome> {
  const course = await store.findCourseById(input.courseId)
  if (!course) return { ok: false, reason: 'course_not_found' }
  const branchOk = await store.branchExists(input.branchId)
  if (!branchOk) return { ok: false, reason: 'branch_not_found' }

  const row = await store.createClass({
    courseId: input.courseId,
    branchId: input.branchId,
    name: input.name,
  })
  return { ok: true, class: toClass(row) }
}

export type UpdateClassOutcome =
  | { ok: true; class: Class }
  | { ok: false; reason: 'not_found' | 'branch_not_found' }

export async function updateClass(
  store: CatalogStore,
  id: string,
  input: UpdateClassRequest,
): Promise<UpdateClassOutcome> {
  if (input.branchId !== undefined) {
    const branchOk = await store.branchExists(input.branchId)
    if (!branchOk) return { ok: false, reason: 'branch_not_found' }
  }
  const fields: UpdateClassFields = {}
  if (input.branchId !== undefined) fields.branchId = input.branchId
  if (input.name !== undefined) fields.name = input.name

  const row = await store.updateClass(id, fields)
  return row ? { ok: true, class: toClass(row) } : { ok: false, reason: 'not_found' }
}

export async function deleteClass(store: CatalogStore, id: string): Promise<boolean> {
  return store.deleteClass(id)
}

// ----- Enrollments -----

export async function listEnrollments(store: CatalogStore, classId: string): Promise<Enrollment[]> {
  const rows = await store.listEnrollmentsByClass(classId)
  return rows.map(toEnrollment)
}

export type CreateEnrollmentOutcome =
  | { ok: true; enrollment: Enrollment }
  | { ok: false; reason: 'class_not_found' | 'student_not_found' | 'already_enrolled' }

export async function createEnrollment(
  store: CatalogStore,
  input: CreateEnrollmentRequest,
): Promise<CreateEnrollmentOutcome> {
  const klass = await store.findClassById(input.classId)
  if (!klass) return { ok: false, reason: 'class_not_found' }
  const studentOk = await store.userExists(input.studentId)
  if (!studentOk) return { ok: false, reason: 'student_not_found' }
  const existing = await store.findEnrollment(input.classId, input.studentId)
  if (existing) return { ok: false, reason: 'already_enrolled' }

  const row = await store.createEnrollment({ classId: input.classId, studentId: input.studentId })
  return { ok: true, enrollment: toEnrollment(row) }
}

export async function deleteEnrollment(store: CatalogStore, id: string): Promise<boolean> {
  return store.deleteEnrollment(id)
}
