import type { FastifyBaseLogger } from 'fastify'
import type { OtpEmailSender } from './password-reset.js'

/**
 * Task 3 (slice-0): kenh gui OTP qua Email.
 * Ban dev/skeleton: ghi OTP ra log co cau truc (khong dung provider that de tranh
 * phu thuoc ngoai o slice-0). Endpoint van chay that end-to-end (DB that).
 * TODO(slice-0/slice-2): thay bang provider email that (vd Resend/SES) qua bien moi truong;
 * khi do KHONG duoc log ma OTP tho.
 */
export function makeConsoleEmailSender(logger: FastifyBaseLogger): OtpEmailSender {
  return {
    async sendOtp({ email, otp, expiresAt }) {
      logger.info(
        { email, otp, expiresAt: expiresAt.toISOString() },
        '[dev] Gui OTP dat lai mat khau qua Email (chi log o moi truong dev)',
      )
    },
  }
}
