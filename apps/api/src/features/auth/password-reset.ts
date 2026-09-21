import { createHash, randomInt } from 'node:crypto'
import { hashPassword } from './service.js'
import type { OtpChannel, OtpDispatcher } from './channels.js'

/**
 * Task 3 (slice-0): quen mat khau qua OTP.
 * Co che: OTP 6 chu so, DB chi luu SHA-256 hash cua OTP (khong luu ma tho).
 * OTP het han sau `ttlSeconds` (ngan) va chi dung mot lan; gioi han so lan nhap sai.
 * Slice-2: gui OTP qua kenh nguoi dung chon (email | whatsapp | telegram) qua OtpDispatcher.
 */

/** So lan nhap OTP sai toi da truoc khi ma bi vo hieu (chong do vet). */
export const MAX_OTP_ATTEMPTS = 5

/** Ban ghi OTP doc tu DB. */
export interface OtpRecord {
  id: string
  userId: string
  otpHash: string
  attempts: number
  consumedAt: Date | null
  expiresAt: Date
}

/** Nguoi gui email OTP — cho phep thay the (dev log, provider that o production). */
export interface OtpEmailSender {
  sendOtp: (input: { email: string; otp: string; expiresAt: Date }) => Promise<void>
}

/** Cong DB ma luong reset can — tach de test bang gia lap. */
export interface PasswordResetStore {
  findUserByEmail: (email: string) => Promise<{ id: string } | undefined>
  createOtp: (input: {
    userId: string
    otpHash: string
    expiresAt: Date
    /** Slice-2: kenh da gui OTP, luu de doi chieu/thong ke. */
    channel: OtpChannel
  }) => Promise<void>
  /** OTP con hieu luc gan nhat (chua dung, chua het han) cua user theo email. */
  findActiveOtpByEmail: (email: string) => Promise<OtpRecord | undefined>
  incrementOtpAttempts: (id: string) => Promise<void>
  markOtpConsumed: (id: string) => Promise<void>
  updateUserPassword: (userId: string, passwordHash: string) => Promise<void>
}

/** Sinh ma OTP 6 chu so (dung randomInt cua crypto, khong dung Math.random). */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/** Bam OTP de luu DB (khong luu ma tho). */
export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

/**
 * Buoc 1: yeu cau OTP. Neu email ton tai, sinh + luu OTP (hash) va gui qua kenh da chon.
 * - `channel`: email (mac dinh) | whatsapp | telegram.
 * - `recipient`: dia chi nhan theo kenh; voi email co the bo trong (mac dinh dung `email`).
 * Luon tra ve `void` (khong bao email co ton tai hay khong) de chong liet ke tai khoan.
 */
export async function requestPasswordReset(
  store: PasswordResetStore,
  dispatcher: OtpDispatcher,
  input: { email: string; channel: OtpChannel; recipient?: string; ttlSeconds: number },
): Promise<void> {
  const user = await store.findUserByEmail(input.email)
  if (!user) return // im lang: khong lo email co ton tai hay khong

  // Voi kenh email, dia chi nhan mac dinh la chinh email tai khoan.
  const recipient =
    input.channel === 'email' ? (input.recipient ?? input.email) : input.recipient
  if (!recipient) {
    // Schema (ForgotPasswordRequest.refine) da chan truong hop nay; phong thu them o service.
    throw new Error('recipient bat buoc khi channel khong phai email')
  }

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000)
  await store.createOtp({ userId: user.id, otpHash: hashOtp(otp), expiresAt, channel: input.channel })
  await dispatcher.dispatch({ channel: input.channel, recipient, otp, expiresAt })
}

/** Ket qua dat lai mat khau: phan biet ly do that bai de UI bao dung. */
export type ResetPasswordOutcome =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' }

/**
 * Buoc 2: dat lai mat khau bang email + OTP + mat khau moi.
 * Kiem tra OTP con hieu luc, chua het han, chua vuot so lan thu; neu OTP sai thi tang dem.
 */
export async function resetPassword(
  store: PasswordResetStore,
  input: { email: string; otp: string; newPassword: string },
): Promise<ResetPasswordOutcome> {
  const record = await store.findActiveOtpByEmail(input.email)
  if (!record) return { ok: false, reason: 'invalid' }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' }
  }

  if (hashOtp(input.otp) !== record.otpHash) {
    await store.incrementOtpAttempts(record.id)
    return { ok: false, reason: 'invalid' }
  }

  // OTP dung: doi mat khau (bcrypt) va danh dau OTP da dung (mot lan duy nhat).
  const passwordHash = await hashPassword(input.newPassword)
  await store.updateUserPassword(record.userId, passwordHash)
  await store.markOtpConsumed(record.id)
  return { ok: true }
}
