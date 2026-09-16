import type { AppDb } from '../../platform/db.js'
import type { CatalogStore } from './service.js'

const LEVEL_COLUMNS = ['id', 'code', 'name'] as const
const COURSE_COLUMNS = ['id', 'level_id', 'name', 'created_at'] as const
const CLASS_COLUMNS = ['id', 'course_id', 'branch_id', 'name', 'created_at'] as const
const ENROLLMENT_COLUMNS = ['id', 'class_id', 'student_id', 'created_at'] as const

/** Hien thuc CatalogStore bang Kysely tren Postgres THUC (khong mock). */
export function makeCatalogStore(db: AppDb): CatalogStore {
  return {
    async listLevels() {
      return db.selectFrom('levels').select(LEVEL_COLUMNS).orderBy('name', 'asc').execute()
    },
    async findLevelById(id) {
      return db.selectFrom('levels').select(LEVEL_COLUMNS).where('id', '=', id).executeTakeFirst()
    },

    async listCourses() {
      return db.selectFrom('courses').select(COURSE_COLUMNS).orderBy('created_at', 'asc').execute()
    },
    async findCourseById(id) {
      return db.selectFrom('courses').select(COURSE_COLUMNS).where('id', '=', id).executeTakeFirst()
    },
    async createCourse({ levelId, name }) {
      return db
        .insertInto('courses')
        .values({ level_id: levelId, name })
        .returning(COURSE_COLUMNS)
        .executeTakeFirstOrThrow()
    },
    async updateCourse(id, input) {
      return db
        .updateTable('courses')
        .set({
          updated_at: new Date().toISOString(),
          ...(input.levelId !== undefined ? { level_id: input.levelId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
        })
        .where('id', '=', id)
        .returning(COURSE_COLUMNS)
        .executeTakeFirst()
    },
    async deleteCourse(id) {
      const res = await db.deleteFrom('courses').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },

    async listClasses(branchIds) {
      if (branchIds && branchIds.length === 0) return []
      let query = db.selectFrom('classes').select(CLASS_COLUMNS).orderBy('created_at', 'asc')
      if (branchIds) query = query.where('branch_id', 'in', branchIds)
      return query.execute()
    },
    async findClassById(id) {
      return db.selectFrom('classes').select(CLASS_COLUMNS).where('id', '=', id).executeTakeFirst()
    },
    async createClass({ courseId, branchId, name }) {
      return db
        .insertInto('classes')
        .values({ course_id: courseId, branch_id: branchId, name })
        .returning(CLASS_COLUMNS)
        .executeTakeFirstOrThrow()
    },
    async updateClass(id, input) {
      return db
        .updateTable('classes')
        .set({
          updated_at: new Date().toISOString(),
          ...(input.branchId !== undefined ? { branch_id: input.branchId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
        })
        .where('id', '=', id)
        .returning(CLASS_COLUMNS)
        .executeTakeFirst()
    },
    async deleteClass(id) {
      const res = await db.deleteFrom('classes').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },

    async branchExists(id) {
      const row = await db.selectFrom('branches').select('id').where('id', '=', id).executeTakeFirst()
      return row !== undefined
    },
    async userExists(id) {
      const row = await db.selectFrom('users').select('id').where('id', '=', id).executeTakeFirst()
      return row !== undefined
    },

    async listEnrollmentsByClass(classId) {
      return db
        .selectFrom('enrollments')
        .select(ENROLLMENT_COLUMNS)
        .where('class_id', '=', classId)
        .orderBy('created_at', 'asc')
        .execute()
    },
    async findEnrollment(classId, studentId) {
      return db
        .selectFrom('enrollments')
        .select(ENROLLMENT_COLUMNS)
        .where('class_id', '=', classId)
        .where('student_id', '=', studentId)
        .executeTakeFirst()
    },
    async createEnrollment({ classId, studentId }) {
      return db
        .insertInto('enrollments')
        .values({ class_id: classId, student_id: studentId })
        .returning(ENROLLMENT_COLUMNS)
        .executeTakeFirstOrThrow()
    },
    async deleteEnrollment(id) {
      const res = await db.deleteFrom('enrollments').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },
  }
}
