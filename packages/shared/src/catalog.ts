import { z } from 'zod'

/**
 * Contract chuong trinh hoc (slice-1 Task 3) dung chung FE-BE.
 * Cay: Level (Starter/Mover/Flyer) -> Course -> Class (moi Class gan 1 Branch) -> Enrollment.
 */

const Name = z.string().trim().min(1, 'Ten khong duoc de trong').max(200)

/** Ma cap do co dinh (Starter/Mover/Flyer) — seed san trong DB, khong CRUD. */
export const LevelCode = z.enum(['starter', 'mover', 'flyer'])
export type LevelCode = z.infer<typeof LevelCode>

export const Level = z.object({
  id: z.string().uuid(),
  code: LevelCode,
  name: z.string(),
})
export type Level = z.infer<typeof Level>

export const LevelList = z.object({ levels: z.array(Level) })
export type LevelList = z.infer<typeof LevelList>

// ----- Course -----

export const Course = z.object({
  id: z.string().uuid(),
  levelId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
})
export type Course = z.infer<typeof Course>

export const CreateCourseRequest = z.object({
  levelId: z.string().uuid(),
  name: Name,
})
export type CreateCourseRequest = z.infer<typeof CreateCourseRequest>

export const UpdateCourseRequest = z
  .object({
    levelId: z.string().uuid().optional(),
    name: Name.optional(),
  })
  .refine((v) => v.levelId !== undefined || v.name !== undefined, {
    message: 'Can it nhat mot truong de cap nhat',
  })
export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequest>

export const CourseList = z.object({ courses: z.array(Course) })
export type CourseList = z.infer<typeof CourseList>

export const CourseResponse = z.object({ course: Course })
export type CourseResponse = z.infer<typeof CourseResponse>

// ----- Class (moi Class gan dung 1 Branch) -----

export const Class = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  branchId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
})
export type Class = z.infer<typeof Class>

export const CreateClassRequest = z.object({
  courseId: z.string().uuid(),
  branchId: z.string().uuid(),
  name: Name,
})
export type CreateClassRequest = z.infer<typeof CreateClassRequest>

export const UpdateClassRequest = z
  .object({
    branchId: z.string().uuid().optional(),
    name: Name.optional(),
  })
  .refine((v) => v.branchId !== undefined || v.name !== undefined, {
    message: 'Can it nhat mot truong de cap nhat',
  })
export type UpdateClassRequest = z.infer<typeof UpdateClassRequest>

export const ClassList = z.object({ classes: z.array(Class) })
export type ClassList = z.infer<typeof ClassList>

export const ClassResponse = z.object({ class: Class })
export type ClassResponse = z.infer<typeof ClassResponse>

// ----- Enrollment (ghi danh hoc vien vao lop) -----

export const Enrollment = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  createdAt: z.string(),
})
export type Enrollment = z.infer<typeof Enrollment>

export const CreateEnrollmentRequest = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
})
export type CreateEnrollmentRequest = z.infer<typeof CreateEnrollmentRequest>

export const EnrollmentList = z.object({ enrollments: z.array(Enrollment) })
export type EnrollmentList = z.infer<typeof EnrollmentList>

export const EnrollmentResponse = z.object({ enrollment: Enrollment })
export type EnrollmentResponse = z.infer<typeof EnrollmentResponse>
