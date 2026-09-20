import type { FastifyBaseLogger } from 'fastify'

export interface OtpWhatsAppSender {
  sendOtp(args: { phone: string; otp: string; expiresAt: Date }): Promise<void>
}

/**
 * Slice-2: gửi OTP qua WhatsApp Cloud API.
 * Yêu cầu biến môi trường: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */
export function makeWhatsAppSender(logger: FastifyBaseLogger): OtpWhatsAppSender {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    logger.warn(
      'WHATSAPP_TOKEN hoặc WHATSAPP_PHONE_NUMBER_ID chưa được cấu hình; ' +
        'WhatsApp sender sẽ ném lỗi khi chạy thực.',
    )
  }

  return {
    async sendOtp({ phone, otp, expiresAt }) {
      if (!token || !phoneNumberId) {
        throw new Error(
          'WhatsApp chưa được cấu hình: thiếu WHATSAPP_TOKEN hoặc WHATSAPP_PHONE_NUMBER_ID',
        )
      }

      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: {
            body: [
              `Mã OTP đặt lại mật khẩu: *${otp}*`,
              `Hiệu lực đến: ${expiresAt.toISOString()}`,
              'Không chia sẻ mã này với bất kỳ ai.',
            ].join('\n'),
          },
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '(unreadable body)')
        logger.error({ phone, status: res.status, body }, 'WhatsApp Cloud API error')
        throw new Error(`WhatsApp delivery failed (HTTP ${res.status})`)
      }

      logger.info({ phone }, 'OTP sent via WhatsApp')
    },
  }
}
