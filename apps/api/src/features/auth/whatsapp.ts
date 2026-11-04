import type { FastifyBaseLogger } from 'fastify'

export interface OtpWhatsAppSender {
  sendOtp(args: { phone: string; otp: string; expiresAt: Date }): Promise<void>
}

export interface WhatsAppConfig {
  token: string
  phoneNumberId: string
}

export function whatsAppConfigFromEnv(env: NodeJS.ProcessEnv = process.env): WhatsAppConfig | null {
  const token = env.WHATSAPP_TOKEN
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID
  return token && phoneNumberId ? { token, phoneNumberId } : null
}

/** Sends one plain text message via WhatsApp Cloud API (shared by OTP and slice-9b reminders). */
export async function sendWhatsAppText(config: WhatsAppConfig, phone: string, body: string): Promise<void> {
  const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }),
  })
  if (!res.ok) throw new Error(`WhatsApp delivery failed (HTTP ${res.status})`)
}

/**
 * Slice-2: gửi OTP qua WhatsApp Cloud API.
 * Yêu cầu biến môi trường: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */
export function makeWhatsAppSender(logger: FastifyBaseLogger): OtpWhatsAppSender {
  const config = whatsAppConfigFromEnv()

  if (!config) {
    logger.warn(
      'WHATSAPP_TOKEN hoặc WHATSAPP_PHONE_NUMBER_ID chưa được cấu hình; ' +
        'WhatsApp sender sẽ ném lỗi khi chạy thực.',
    )
  }

  return {
    async sendOtp({ phone, otp, expiresAt }) {
      if (!config) {
        throw new Error(
          'WhatsApp chưa được cấu hình: thiếu WHATSAPP_TOKEN hoặc WHATSAPP_PHONE_NUMBER_ID',
        )
      }

      try {
        await sendWhatsAppText(
          config,
          phone,
          [
            `Mã OTP đặt lại mật khẩu: *${otp}*`,
            `Hiệu lực đến: ${expiresAt.toISOString()}`,
            'Không chia sẻ mã này với bất kỳ ai.',
          ].join('\n'),
        )
      } catch (err) {
        logger.error({ err }, 'WhatsApp Cloud API error')
        throw err
      }

      logger.info('OTP sent via WhatsApp')
    },
  }
}
