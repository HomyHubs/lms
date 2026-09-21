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
 * TODO(slice-1 Task 4): rang buoc them theo Branch (branch-scoped access).
 */
export const UserRole = z.enum(['admin', 'teacher', 'student', 'staff'])
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
 * Slice-2: mo rong sang WhatsApp + Telegram.
 */

/** Email nhan OTP dat lai mat khau. */
export const Email = z.string().trim().toLowerCase().email('Email khong hop le')

/** Ma OTP: 6 chu so (khop do dai sinh o backend). */
export const OtpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Ma OTP gom 6 chu so')

/**
 * Slice-2: kenh gui OTP — email (tu slice-0), whatsapp, telegram.
 */
export const OtpChannel = z.enum(['email', 'whatsapp', 'telegram'])
export type OtpChannel = z.infer<typeof OtpChannel>

/**
 * Buoc 1: yeu cau gui OTP.
 * - `email`     → tai khoan tra cuu theo email nay.
 * - `channel`   → kenh nhan OTP (mac dinh 'email').
 * - `recipient` → dia chi nhan theo kenh:
 *     email: co the bo qua (tu dong dung truong `email`);
 *     whatsapp: so dien thoai E.164 (bat buoc);
 *     telegram: chat_id Telegram (bat buoc).
 */
export const ForgotPasswordRequest = z
  .object({
    email: Email,
    channel: OtpChannel.default('email'),
    recipient: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.channel === 'email' || data.recipient !== undefined,
    { message: 'recipient bat buoc khi channel la whatsapp hoac telegram', path: ['recipient'] },
  )
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
