import Fastify from 'fastify'
import { Writable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeEmailSender } from './email.js'

const payload = { email: 'private@example.com', otp: '654321', expiresAt: new Date() }
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('email delivery security', () => {
  it.each(['production', 'development', 'test'])(
    'fails closed without a provider in %s',
    async (env) => {
      vi.stubEnv('NODE_ENV', env)
      vi.stubEnv('RESEND_API_KEY', '')
      const app = Fastify({ logger: false })
      await expect(makeEmailSender(app.log).sendOtp(payload)).rejects.toThrow(
        'Email delivery unavailable',
      )
      await app.close()
    },
  )

  it('never logs destinations, codes, or provider response bodies', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-placeholder')
    let logs = ''
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs += String(chunk)
        callback()
      },
    })
    const app = Fastify({ logger: { stream } })
    const text = vi.fn(async () => 'upstream private@example.com 654321')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, text })),
    )
    await expect(makeEmailSender(app.log).sendOtp(payload)).rejects.toThrow('HTTP 503')
    expect(text).not.toHaveBeenCalled()
    expect(logs).not.toContain(payload.email)
    expect(logs).not.toContain(payload.otp)
    expect(logs).not.toContain('test-placeholder')
    await app.close()
  })
})
