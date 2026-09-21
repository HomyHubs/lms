import { describe, expect, it } from 'vitest'
import {
  MAX_OTP_ATTEMPTS,
  generateOtp,
  hashOtp,
  requestPasswordReset,
  resetPassword,
  type OtpRecord,
  type PasswordResetStore,
} from './password-reset.js'
import type { OtpDispatchArgs, OtpDispatcher } from './channels.js'
import { verifyPassword } from './service.js'

/** Store + dispatcher gia lap trong bo nho de test logic ma khong can Postgres. */
function makeHarness(opts: { email?: string } = {}) {
  const email = opts.email ?? 'admin@example.com'
  const userId = '11111111-1111-1111-1111-111111111111'
  const otps: OtpRecord[] = []
  const passwords = new Map<string, string>()
  const createdChannels: string[] = []
  const sent: OtpDispatchArgs[] = []

  const store: PasswordResetStore = {
    async findUserByEmail(e) {
      return e === email ? { id: userId } : undefined
    },
    async createOtp({ userId: uid, otpHash, expiresAt, channel }) {
      otps.push({
        id: `otp-${otps.length + 1}`,
        userId: uid,
        otpHash,
        attempts: 0,
        consumedAt: null,
        expiresAt,
      })
      createdChannels.push(channel)
    },
    async findActiveOtpByEmail(e) {
      if (e !== email) return undefined
      // Moi nhat, chua dung.
      for (let i = otps.length - 1; i >= 0; i--) {
        const rec = otps[i]
        if (rec && rec.consumedAt === null) return rec
      }
      return undefined
    },
    async incrementOtpAttempts(id) {
      const rec = otps.find((o) => o.id === id)
      if (rec) rec.attempts += 1
    },
    async markOtpConsumed(id) {
      const rec = otps.find((o) => o.id === id)
      if (rec) rec.consumedAt = new Date()
    },
    async updateUserPassword(uid, passwordHash) {
      passwords.set(uid, passwordHash)
    },
  }

  const dispatcher: OtpDispatcher = {
    async dispatch(args) {
      sent.push(args)
    },
  }

  return { store, dispatcher, otps, passwords, sent, createdChannels, userId, email }
}

describe('generateOtp / hashOtp', () => {
  it('generates a 6-digit code and never stores it in plain text', () => {
    const otp = generateOtp()
    expect(otp).toMatch(/^\d{6}$/)
    const hash = hashOtp(otp)
    expect(hash).not.toContain(otp)
    expect(hashOtp(otp)).toBe(hash) // deterministic
  })
})

describe('requestPasswordReset', () => {
  it('sends an OTP when the email exists', async () => {
    const h = makeHarness()
    await requestPasswordReset(h.store, h.dispatcher, {
      email: h.email,
      channel: 'email',
      ttlSeconds: 600,
    })
    expect(h.sent).toHaveLength(1)
    expect(h.otps).toHaveLength(1)
    // DB luu hash, khong luu ma tho.
    expect(h.otps[0]?.otpHash).toBe(hashOtp(h.sent[0]!.otp))
  })

  it('is silent (no OTP, no dispatch) for an unknown email — no account enumeration', async () => {
    const h = makeHarness()
    await requestPasswordReset(h.store, h.dispatcher, {
      email: 'nobody@example.com',
      channel: 'email',
      ttlSeconds: 600,
    })
    expect(h.sent).toHaveLength(0)
    expect(h.otps).toHaveLength(0)
  })

  it('defaults the email-channel recipient to the account email', async () => {
    const h = makeHarness()
    await requestPasswordReset(h.store, h.dispatcher, {
      email: h.email,
      channel: 'email',
      ttlSeconds: 600,
    })
    expect(h.sent[0]).toMatchObject({ channel: 'email', recipient: h.email })
    expect(h.createdChannels[0]).toBe('email')
  })

  it('dispatches via WhatsApp with the provided recipient and records the channel', async () => {
    const h = makeHarness()
    await requestPasswordReset(h.store, h.dispatcher, {
      email: h.email,
      channel: 'whatsapp',
      recipient: '84901234567',
      ttlSeconds: 600,
    })
    expect(h.sent[0]).toMatchObject({ channel: 'whatsapp', recipient: '84901234567' })
    expect(h.createdChannels[0]).toBe('whatsapp')
  })

  it('dispatches via Telegram with the provided chat id', async () => {
    const h = makeHarness()
    await requestPasswordReset(h.store, h.dispatcher, {
      email: h.email,
      channel: 'telegram',
      recipient: '123456789',
      ttlSeconds: 600,
    })
    expect(h.sent[0]).toMatchObject({ channel: 'telegram', recipient: '123456789' })
    expect(h.createdChannels[0]).toBe('telegram')
  })
})

describe('resetPassword', () => {
  async function issueOtp(h: ReturnType<typeof makeHarness>): Promise<string> {
    await requestPasswordReset(h.store, h.dispatcher, {
      email: h.email,
      channel: 'email',
      ttlSeconds: 600,
    })
    return h.sent.at(-1)!.otp
  }

  it('resets the password with a correct OTP and consumes it', async () => {
    const h = makeHarness()
    const otp = await issueOtp(h)
    const outcome = await resetPassword(h.store, {
      email: h.email,
      otp,
      newPassword: 'brandnew8',
    })
    expect(outcome).toEqual({ ok: true })
    // Mat khau moi duoc hash (bcrypt), khong luu tho.
    const stored = h.passwords.get(h.userId)!
    expect(stored).not.toContain('brandnew8')
    expect(await verifyPassword('brandnew8', stored)).toBe(true)
    // OTP da bi danh dau dung.
    expect(h.otps[0]?.consumedAt).not.toBeNull()
  })

  it('rejects an unknown email as invalid', async () => {
    const h = makeHarness()
    await issueOtp(h)
    const outcome = await resetPassword(h.store, {
      email: 'nobody@example.com',
      otp: '000000',
      newPassword: 'brandnew8',
    })
    expect(outcome).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejects a wrong OTP and increments attempts', async () => {
    const h = makeHarness()
    const otp = await issueOtp(h)
    const wrong = otp === '000000' ? '111111' : '000000'
    const outcome = await resetPassword(h.store, {
      email: h.email,
      otp: wrong,
      newPassword: 'brandnew8',
    })
    expect(outcome).toEqual({ ok: false, reason: 'invalid' })
    expect(h.otps[0]?.attempts).toBe(1)
  })

  it('rejects an expired OTP', async () => {
    const h = makeHarness()
    await requestPasswordReset(h.store, h.dispatcher, {
      email: h.email,
      channel: 'email',
      ttlSeconds: -1,
    })
    const otp = h.sent.at(-1)!.otp
    const outcome = await resetPassword(h.store, {
      email: h.email,
      otp,
      newPassword: 'brandnew8',
    })
    expect(outcome).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects once too many attempts have been made', async () => {
    const h = makeHarness()
    await issueOtp(h)
    if (h.otps[0]) h.otps[0].attempts = MAX_OTP_ATTEMPTS
    const outcome = await resetPassword(h.store, {
      email: h.email,
      otp: '000000',
      newPassword: 'brandnew8',
    })
    expect(outcome).toEqual({ ok: false, reason: 'too_many_attempts' })
  })
})
