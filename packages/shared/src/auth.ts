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

/**
 * Vai tro nguoi dung cho RBAC.
 * slice-1 Task 1: mo rong tu 'admin' (slice-0) sang du 4 vai tro nghiep vu.
 * slice-1 (revised 2026-11): them 'superadmin' — tai khoan cao nhat, vuot moi branch-scope,
 * la role duy nhat quan ly duoc tai khoan admin/superadmin va duy nhat duoc export danh sach hoc vien.
 */
export const UserRole = z.enum(['superadmin', 'admin', 'teacher', 'student', 'staff'])
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

/**
 * Task 3 (slice-0): quen mat khau qua OTP.
 * Slice-2 (revised 2026-11): OTP chi con kenh Email. Cac kenh WhatsApp/Telegram da bi bo
 * (chu so huu khong co tai khoan WhatsApp Business; nhac lich qua Telegram thuoc notifications).
 */

/** Email nhan OTP dat lai mat khau. */
export const Email = z.string().trim().toLowerCase().email('Email khong hop le')

/** Ma OTP: 6 chu so (khop do dai sinh o backend). */
export const OtpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Ma OTP gom 6 chu so')

/**
 * Slice-2 (revised): kenh gui OTP chi con 'email'. Giu lai duoi dang enum mot phan tu de
 * de mo rong ve sau neu can, va de contract van co truong `channel` tuong minh.
 */
export const OtpChannel = z.enum(['email'])
export type OtpChannel = z.infer<typeof OtpChannel>

/**
 * Buoc 1: yeu cau gui OTP.
 * - `email`     → tai khoan tra cuu theo email nay.
 * - `channel`   → kenh nhan OTP (mac dinh 'email').
 * Email-only: destination resolved from server verification evidence.
 * Client recipient and optional provider channels are forbidden (ADR0002).
 */
export const ForgotPasswordRequest = z
  .object({
    email: Email,
    channel: z.literal('email').default('email'),
  })
  .strict()
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequest>

/** Buoc 2: dat lai mat khau bang email + OTP + mat khau moi. */
export const ResetPasswordRequest = z.object({
  email: Email,
  otp: OtpCode,
  // Cung rang buoc do dai nhu luc dang nhap (bcrypt xu ly o backend).
  newPassword: z.string().min(8, 'Mat khau toi thieu 8 ky tu'),
})
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>

/**
 * Response chung cho ca 2 buoc: luon tra `ok: true` du email co ton tai hay khong
 * (chong liet ke tai khoan). Loi that su (OTP sai/het han) tra 400 rieng.
 */
export const OkResponse = z.object({
  ok: z.literal(true),
})
export type OkResponse = z.infer<typeof OkResponse>
