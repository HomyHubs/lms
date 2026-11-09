import { z } from 'zod'
import { Email, PhoneNumber, UserRole } from './auth.js'

/**
 * Contract quan ly nguoi dung (slice-1 Task 1) dung chung FE-BE.
 * CRUD User (Admin/Teacher/Student/Staff) + RBAC theo role — thay role gia dinh o slice-0.
 * KHONG bao gio tra `password_hash` ra ngoai.
 */

/** Mat khau dat khi tao/doi user: toi thieu 8 ky tu (bcrypt xu ly do dai o backend). */
const Password = z.string().min(8, 'Mat khau toi thieu 8 ky tu')

/** Gioi tinh hoc vien (nullable o AdminUser; optional o create/update). */
export const Gender = z.enum(['male', 'female', 'other'])
export type Gender = z.infer<typeof Gender>

/** Ho va chu lot / Ten: chuoi da trim, khong rong khi co nhap. */
const NamePart = z.string().trim().min(1, 'Khong duoc de trong').max(200)

/** Nam sinh hop le: so nguyen trong khoang 1900..nam hien tai. */
const BirthYear = z.number().int().min(1900).max(new Date().getFullYear())

/** Dia chi hoc vien: tuy chon, gioi han do dai. */
const Address = z.string().trim().max(500)

/** Thong tin user cho man quan ly (Admin). An toan de tra ve FE. */
export const AdminUser = z.object({
  id: z.string().uuid(),
  phoneNumber: PhoneNumber,
  email: z.string().email().nullable(),
  role: UserRole,
  // Ho so hoc vien (slice ho so): nullable de khong pha user cu / role khac.
  lastName: z.string().nullable(),
  firstName: z.string().nullable(),
  birthYear: z.number().int().nullable(),
  gender: Gender.nullable(),
  address: z.string().nullable(),
  parentPhone: z.string().nullable(),
  // Tuoi tinh tu dong o backend (nam hien tai - birthYear); KHONG luu DB.
  age: z.number().int().nullable(),
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
  // Ho so hoc vien (tuy chon de khong pha role khac).
  lastName: NamePart.optional(),
  firstName: NamePart.optional(),
  birthYear: BirthYear.optional(),
  gender: Gender.optional(),
  address: Address.optional(),
  parentPhone: PhoneNumber.optional(),
})
export type CreateUserRequest = z.infer<typeof CreateUserRequest>

/** Cap nhat user: moi truong deu tuy chon, nhung phai co it nhat 1 truong. */
export const UpdateUserRequest = z
  .object({
    role: UserRole.optional(),
    email: Email.nullable().optional(),
    password: Password.optional(),
    // Ho so hoc vien: cho phep set gia tri hoac dat ve null (xoa).
    lastName: NamePart.nullable().optional(),
    firstName: NamePart.nullable().optional(),
    birthYear: BirthYear.nullable().optional(),
    gender: Gender.nullable().optional(),
    address: Address.nullable().optional(),
    parentPhone: PhoneNumber.nullable().optional(),
  })
  .refine(
    (v) =>
      v.role !== undefined ||
      v.email !== undefined ||
      v.password !== undefined ||
      v.lastName !== undefined ||
      v.firstName !== undefined ||
      v.birthYear !== undefined ||
      v.gender !== undefined ||
      v.address !== undefined ||
      v.parentPhone !== undefined,
    {
      message: 'Can it nhat mot truong de cap nhat',
    },
  )
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
