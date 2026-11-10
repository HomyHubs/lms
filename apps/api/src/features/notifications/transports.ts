/**
 * Message transports for slice-9b notifications (WhatsApp / Telegram plain-text senders).
 *
 * These used to live in the auth feature when OTP supported multiple channels. OTP is now
 * email-only (slice-2 revised 2026-11), so the raw transports moved here — the only remaining
 * consumer. See ADR 0010.
 */

export interface WhatsAppConfig {
  token: string
  phoneNumberId: string
}

export function whatsAppConfigFromEnv(env: NodeJS.ProcessEnv = process.env): WhatsAppConfig | null {
  const token = env.WHATSAPP_TOKEN
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID
  return token && phoneNumberId ? { token, phoneNumberId } : null
}

/** Sends one plain text message via WhatsApp Cloud API. */
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

/** Sends one HTML text message via Telegram Bot API. */
export async function sendTelegramText(botToken: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', text }),
  })
  if (!res.ok) throw new Error(`Telegram delivery failed (HTTP ${res.status})`)
}
