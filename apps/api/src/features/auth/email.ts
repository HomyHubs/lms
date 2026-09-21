import type { FastifyBaseLogger } from 'fastify'
import type { OtpEmailSender } from './password-reset.js'

// ─── Resend adapter ──────────────────────────────────────────────────────────

function makeResendEmailSender(apiKey: string, logger: FastifyBaseLogger): OtpEmailSender {
  return {
    async sendOtp({ email, otp, expiresAt }) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? 'noreply@example.com',
          to: email,
          subject: 'Mã OTP đặt lại mật khẩu',
          text: [
            `Mã OTP của bạn là: ${otp}`,
            `Hiệu lực đến: ${expiresAt.toISOString()}`,
            'Không chia sẻ mã này với bất kỳ ai.',
          ].join('\n'),
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '(unreadable body)')
        logger.error({ email, status: res.status, body }, 'Resend API error')
        throw new Error(`Resend email delivery failed (HTTP ${res.status})`)
      }

      logger.info({ email }, 'OTP email sent via Resend')
    },
  }
}

// ─── Console fallback (dev / CI) ─────────────────────────────────────────────

export function makeConsoleEmailSender(logger: FastifyBaseLogger): OtpEmailSender {
  return {
    async sendOtp({ email, otp, expiresAt }) {
      logger.info(
        { email, otp, expiresAt: expiresAt.toISOString() },
        '[dev] OTP email (console fallback – đặt RESEND_API_KEY để gửi thật)',
      )
    },
  }
}

// ─── Factory (chọn adapter theo env) ─────────────────────────────────────────

/**
 * Slice-2: trả về Resend adapter khi có RESEND_API_KEY,
 * ngược lại dùng console fallback (dev/CI).
 */
export function makeEmailSender(logger: FastifyBaseLogger): OtpEmailSender {
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    return makeResendEmailSender(apiKey, logger)
  }
  logger.warn('RESEND_API_KEY chưa đặt – dùng console email sender (chế độ dev)')
  return makeConsoleEmailSender(logger)
}
