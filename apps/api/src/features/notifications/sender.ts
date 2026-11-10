import type { FastifyBaseLogger } from 'fastify'
import { sendTelegramText, sendWhatsAppText, whatsAppConfigFromEnv } from './transports.js'
import { toE164, type NotificationSender } from './service.js'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * NOTIFY_CHANNEL = whatsapp | telegram | console (default). Without the slice-2 credentials the
 * console sender is used: reminders still reach the in-app bell and are only logged here.
 */
export function makeNotificationSender(
  logger: FastifyBaseLogger,
  env: NodeJS.ProcessEnv = process.env,
): NotificationSender {
  const wanted = env.NOTIFY_CHANNEL ?? 'console'
  if (wanted === 'whatsapp') {
    const config = whatsAppConfigFromEnv(env)
    if (config) {
      return {
        channel: 'whatsapp',
        send: ({ phoneNumber, text }) => sendWhatsAppText(config, toE164(phoneNumber), text),
      }
    }
    logger.warn('NOTIFY_CHANNEL=whatsapp but WhatsApp credentials are missing; using the console sender')
  }
  if (wanted === 'telegram') {
    const botToken = env.TELEGRAM_BOT_TOKEN
    // Users have no Telegram chat id: reminders go to one operations chat, tagged with the recipient.
    const chatId = env.TELEGRAM_CHAT_ID
    if (botToken && chatId) {
      return {
        channel: 'telegram',
        send: ({ phoneNumber, text }) => sendTelegramText(botToken, chatId, escapeHtml(`[${phoneNumber}] ${text}`)),
      }
    }
    logger.warn('NOTIFY_CHANNEL=telegram but TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID are missing; using the console sender')
  }
  return {
    channel: 'console',
    async send({ text }) {
      logger.info({ reminder: text }, 'Reminder delivered by the console sender (dev)')
    },
  }
}
