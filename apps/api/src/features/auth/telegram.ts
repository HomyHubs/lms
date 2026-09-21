import type { FastifyBaseLogger } from 'fastify'

export interface OtpTelegramSender {
  sendOtp(args: { chatId: string; otp: string; expiresAt: Date }): Promise<void>
}

/**
 * Slice-2: gửi OTP qua Telegram Bot API.
 * Yêu cầu: TELEGRAM_BOT_TOKEN
 * Tuỳ chọn: TELEGRAM_CHAT_ID (fallback khi chatId không truyền vào)
 */
export function makeTelegramSender(logger: FastifyBaseLogger): OtpTelegramSender {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const defaultChatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken) {
    logger.warn(
      'TELEGRAM_BOT_TOKEN chưa được cấu hình; Telegram sender sẽ ném lỗi khi chạy thực.',
    )
  }

  return {
    async sendOtp({ chatId, otp, expiresAt }) {
      if (!botToken) {
        throw new Error('Telegram chưa được cấu hình: thiếu TELEGRAM_BOT_TOKEN')
      }

      const targetChatId = chatId || defaultChatId
      if (!targetChatId) {
        throw new Error('Telegram: không xác định được chat_id để gửi OTP')
      }

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          parse_mode: 'HTML',
          text: [
            `Mã OTP đặt lại mật khẩu: <b>${otp}</b>`,
            `Hiệu lực đến: ${expiresAt.toISOString()}`,
            'Không chia sẻ mã này với bất kỳ ai.',
          ].join('\n'),
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '(unreadable body)')
        logger.error({ chatId: targetChatId, status: res.status, body }, 'Telegram Bot API error')
        throw new Error(`Telegram delivery failed (HTTP ${res.status})`)
      }

      logger.info({ chatId: targetChatId }, 'OTP sent via Telegram')
    },
  }
}
