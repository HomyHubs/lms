import type { FastifyBaseLogger } from 'fastify'
import { describe, expect, it } from 'vitest'
import { makeOtpDispatcher } from './channels.js'
import type { OtpEmailSender } from './password-reset.js'
import type { OtpWhatsAppSender } from './whatsapp.js'
import type { OtpTelegramSender } from './telegram.js'

/** Logger toi thieu: dispatcher chi goi `.info`. */
const silentLogger = {
  info() {},
  warn() {},
  error() {},
} as unknown as FastifyBaseLogger

describe('makeOtpDispatcher (slice-2)', () => {
  const expiresAt = new Date('2030-01-01T00:00:00.000Z')
  const otp = '123456'

  function makeSpies() {
    const email: { args?: { email: string; otp: string; expiresAt: Date } } = {}
    const whatsapp: { args?: { phone: string; otp: string; expiresAt: Date } } = {}
    const telegram: { args?: { chatId: string; otp: string; expiresAt: Date } } = {}
    const emailSender: OtpEmailSender = {
      async sendOtp(a) {
        email.args = a
      },
    }
    const whatsappSender: OtpWhatsAppSender = {
      async sendOtp(a) {
        whatsapp.args = a
      },
    }
    const telegramSender: OtpTelegramSender = {
      async sendOtp(a) {
        telegram.args = a
      },
    }
    const dispatcher = makeOtpDispatcher(emailSender, whatsappSender, telegramSender, silentLogger)
    return { dispatcher, email, whatsapp, telegram }
  }

  it('routes the email channel to the email sender (recipient as address)', async () => {
    const s = makeSpies()
    await s.dispatcher.dispatch({ channel: 'email', recipient: 'a@b.com', otp, expiresAt })
    expect(s.email.args).toEqual({ email: 'a@b.com', otp, expiresAt })
    expect(s.whatsapp.args).toBeUndefined()
    expect(s.telegram.args).toBeUndefined()
  })

  it('routes the whatsapp channel to the whatsapp sender (recipient as phone)', async () => {
    const s = makeSpies()
    await s.dispatcher.dispatch({ channel: 'whatsapp', recipient: '84901234567', otp, expiresAt })
    expect(s.whatsapp.args).toEqual({ phone: '84901234567', otp, expiresAt })
    expect(s.email.args).toBeUndefined()
    expect(s.telegram.args).toBeUndefined()
  })

  it('routes the telegram channel to the telegram sender (recipient as chatId)', async () => {
    const s = makeSpies()
    await s.dispatcher.dispatch({ channel: 'telegram', recipient: '123456789', otp, expiresAt })
    expect(s.telegram.args).toEqual({ chatId: '123456789', otp, expiresAt })
    expect(s.email.args).toBeUndefined()
    expect(s.whatsapp.args).toBeUndefined()
  })
})
