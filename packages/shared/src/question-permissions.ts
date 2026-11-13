import { z } from 'zod'

/**
 * Contract quyen sua cau hoi theo role — slice-19 (ADR 0015). Dung chung FE-BE.
 *
 * Cau hinh o muc TOAN HE THONG (chua scope theo co so). Lop cau hinh nay nam TREN
 * nen RBAC hien co: no chi dung de bat/tat quyen GHI cau hoi (POST/PATCH/DELETE
 * /questions, POST /questions/import) theo tung role, khong noi long cac guard khac.
 *
 * Server BAT BUOC enforce (route guard feature questions); an nut o UI khong thay the.
 * Bang settings trong/chua seed -> dung DEFAULT_QUESTION_EDIT_PERMISSIONS (fail-safe han che).
 */

/** Map day du role -> duoc sua cau hoi hay khong (true = duoc GHI cau hoi). */
export const QuestionEditPermissions = z.object({
  superadmin: z.boolean(),
  admin: z.boolean(),
  teacher: z.boolean(),
  student: z.boolean(),
  staff: z.boolean(),
})
export type QuestionEditPermissions = z.infer<typeof QuestionEditPermissions>

/**
 * Mac dinh theo yeu cau 3.3 / ADR 0015: Staff/Admin/Superadmin duoc sua; Teacher/Student khong.
 * Service API tron mac dinh nay cho role thieu dong trong bang settings.
 */
export const DEFAULT_QUESTION_EDIT_PERMISSIONS: QuestionEditPermissions = {
  superadmin: true,
  admin: true,
  teacher: false,
  student: false,
  staff: true,
}
