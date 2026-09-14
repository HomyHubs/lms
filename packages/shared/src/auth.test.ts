import { describe, expect, it } from 'vitest'
import { LoginRequest, PublicUser } from './auth.js'

describe('LoginRequest contract', () => {
  it('accepts a valid phone + password payload', () => {
    const parsed = LoginRequest.parse({ phoneNumber: '+84901234567', password: 'secret12' })
    expect(parsed.phoneNumber).toBe('+84901234567')
  })

  it('trims the phone number', () => {
    const parsed = LoginRequest.parse({ phoneNumber: '  0901234567 ', password: 'secret12' })
    expect(parsed.phoneNumber).toBe('0901234567')
  })

  it('rejects an invalid phone number', () => {
    expect(() => LoginRequest.parse({ phoneNumber: 'abc', password: 'secret12' })).toThrow()
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(() => LoginRequest.parse({ phoneNumber: '0901234567', password: 'short' })).toThrow()
  })
})

describe('PublicUser contract', () => {
  it('accepts a valid public user', () => {
    const parsed = PublicUser.parse({
      id: '11111111-1111-1111-1111-111111111111',
      phoneNumber: '0901234567',
      role: 'admin',
    })
    expect(parsed.role).toBe('admin')
  })

  it('rejects an unknown role', () => {
    expect(() =>
      PublicUser.parse({
        id: '11111111-1111-1111-1111-111111111111',
        phoneNumber: '0901234567',
        role: 'superuser',
      }),
    ).toThrow()
  })
})
