import { z } from 'zod'

/**
 * Contract Auth dung chung FE-BE (webapp-template muc 8: chot contract truoc).
 * Task 2 (slice-0): dang nhap bang so dien thoai (SDT) + mat khau.
 */

/**
 * SDT toi thieu: cho phep dau `+` va 8-15 chu so (E.164 don gian hoa).
 * Chua rang buoc theo quoc gia — se sieu chuan hoa o slice sau neu can.
 */
export const PhoneNumber = z
  .string()
  .trim()
  .regex(/^\+?\d{8,15}$/, 'So dien thoai khong hop le')

export const LoginRequest = z.object({
  phoneNumber: PhoneNumber,
  // Toi thieu 8 ky tu; khong gioi han tren cung o day (bcrypt xu ly o backend).
  password: z.string().min(8, 'Mat khau toi thieu 8 ky tu'),
})
export type LoginRequest = z.infer<typeof LoginRequest>

/** Role toi thieu cho slice-0. TODO(slice-1): mo rong theo Branch/role day du. */
export const UserRole = z.enum(['admin'])
export type UserRole = z.infer<typeof UserRole>

/** Thong tin user an toan de tra ve FE (khong bao gio kem password_hash). */
export const PublicUser = z.object({
  id: z.string().uuid(),
  phoneNumber: PhoneNumber,
  role: UserRole,
})
export type PublicUser = z.infer<typeof PublicUser>

export const LoginResponse = z.object({
  user: PublicUser,
})
export type LoginResponse = z.infer<typeof LoginResponse>

/** Response cua GET /auth/me (phien hien tai). */
export const MeResponse = z.object({
  user: PublicUser,
})
export type MeResponse = z.infer<typeof MeResponse>
