import { z } from 'zod'
import { Email, PhoneNumber, UserRole } from './auth.js'

/**
 * Contract quan ly nguoi dung (slice-1 Task 1) dung chung FE-BE.
 * CRUD User (Admin/Teacher/Student/Staff) + RBAC theo role — thay role gia dinh o slice-0.
 * KHONG bao gio tra `password_hash` ra ngoai.
 */

/** Mat khau dat khi tao/doi user: toi thieu 8 ky tu (bcrypt xu ly do dai o backend). */
const Password = z.string().min(8, 'Mat khau toi thieu 8 ky tu')

/** Thong tin user cho man quan ly (Admin). An toan de tra ve FE. */
export const AdminUser = z.object({
  id: z.string().uuid(),
  phoneNumber: PhoneNumber,
  email: z.string().email().nullable(),
  role: UserRole,
  // ISO-8601 timestamp (created_at) — chuoi de truyen JSON gon.
  createdAt: z.string(),
})
export type AdminUser = z.infer<typeof AdminUser>

/** Tao user moi (chi Admin). Role bat buoc — khong con role gia dinh nhu slice-0. */
export const CreateUserRequest = z.object({
  phoneNumber: PhoneNumber,
  password: Password,
  role: UserRole,
  email: Email.optional(),
})
export type CreateUserRequest = z.infer<typeof CreateUserRequest>

/** Cap nhat user: moi truong deu tuy chon, nhung phai co it nhat 1 truong. */
export const UpdateUserRequest = z
  .object({
    role: UserRole.optional(),
    email: Email.nullable().optional(),
    password: Password.optional(),
  })
  .refine((v) => v.role !== undefined || v.email !== undefined || v.password !== undefined, {
    message: 'Can it nhat mot truong de cap nhat',
  })
export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>

/** Response danh sach user (GET /users). */
export const AdminUserList = z.object({
  users: z.array(AdminUser),
})
export type AdminUserList = z.infer<typeof AdminUserList>

/** Response mot user (POST /users, GET/PATCH /users/:id). */
export const AdminUserResponse = z.object({
  user: AdminUser,
})
export type AdminUserResponse = z.infer<typeof AdminUserResponse>
