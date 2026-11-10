import type { FastifyBaseLogger } from 'fastify'
import type { OtpEmailSender } from './password-reset.js'

/**
 * OTP is email-only (slice-2 revised 2026-11: WhatsApp/Telegram channels dropped — the owner has
 * no WhatsApp Business account and reminders over Telegram now live in the notifications feature).
 * The dispatcher is kept as a thin seam so adding a channel later stays a local change.
 */
export type OtpChannel = 'email'

export interface OtpDispatchArgs {
  /** Kênh gửi OTP — hiện chỉ còn 'email'. */
  channel: OtpChannel
  /** Địa chỉ email nhận OTP. */
  recipient: string
  otp: string
  expiresAt: Date
}

export interface OtpDispatcher {
  dispatch(args: OtpDispatchArgs): Promise<void>
}

export function makeOtpDispatcher(
  emailSender: OtpEmailSender,
  logger: FastifyBaseLogger,
): OtpDispatcher {
  return {
    async dispatch({ channel, recipient, otp, expiresAt }) {
      logger.info({ channel }, 'Dispatching OTP')
      return emailSender.sendOtp({ email: recipient, otp, expiresAt })
    },
  }
}
