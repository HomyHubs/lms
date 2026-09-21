import type { FastifyBaseLogger } from 'fastify'
import type { OtpEmailSender } from './password-reset.js'
import type { OtpWhatsAppSender } from './whatsapp.js'
import type { OtpTelegramSender } from './telegram.js'

export type OtpChannel = 'email' | 'whatsapp' | 'telegram'

export interface OtpDispatchArgs {
  /** Kênh gửi được người dùng chọn */
  channel: OtpChannel
  /**
   * Địa chỉ nhận tuỳ theo kênh:
   * - email     → địa chỉ email
   * - whatsapp  → số điện thoại định dạng E.164 (vd: "84901234567")
   * - telegram  → chat_id Telegram
   */
  recipient: string
  otp: string
  expiresAt: Date
}

export interface OtpDispatcher {
  dispatch(args: OtpDispatchArgs): Promise<void>
}

export function makeOtpDispatcher(
  emailSender: OtpEmailSender,
  whatsappSender: OtpWhatsAppSender,
  telegramSender: OtpTelegramSender,
  logger: FastifyBaseLogger,
): OtpDispatcher {
  return {
    async dispatch({ channel, recipient, otp, expiresAt }) {
      logger.info({ channel }, 'Dispatching OTP')

      switch (channel) {
        case 'email':
          return emailSender.sendOtp({ email: recipient, otp, expiresAt })
        case 'whatsapp':
          return whatsappSender.sendOtp({ phone: recipient, otp, expiresAt })
        case 'telegram':
          return telegramSender.sendOtp({ chatId: recipient, otp, expiresAt })
        default: {
          const _exhaustive: never = channel
          throw new Error(`Kênh OTP không xác định: ${_exhaustive}`)
        }
      }
    },
  }
}
