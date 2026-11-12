import type { FastifyBaseLogger } from 'fastify'
import { describe, expect, it } from 'vitest'
import { makeOtpDispatcher } from './channels.js'
import type { OtpEmailSender } from './password-reset.js'

/** Logger toi thieu: dispatcher chi goi `.info`. */
const silentLogger = {
  info() {},
  warn() {},
  error() {},
} as unknown as FastifyBaseLogger

describe('makeOtpDispatcher (slice-2, email-only)', () => {
  const expiresAt = new Date('2030-01-01T00:00:00.000Z')
  const otp = '123456'

  function makeSpies() {
    const email: { args?: { email: string; otp: string; expiresAt: Date } } = {}
    const emailSender: OtpEmailSender = {
      async sendOtp(a) {
        email.args = a
      },
    }
    const dispatcher = makeOtpDispatcher(emailSender, silentLogger)
    return { dispatcher, email }
  }

  it('routes the email channel to the email sender (recipient as address)', async () => {
    const s = makeSpies()
    await s.dispatcher.dispatch({ channel: 'email', recipient: 'a@b.com', otp, expiresAt })
    expect(s.email.args).toEqual({ email: 'a@b.com', otp, expiresAt })
  })
})
