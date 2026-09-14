import { describe, expect, it } from 'vitest'
import {
  ForgotPasswordRequest,
  LoginRequest,
  PublicUser,
  ResetPasswordRequest,
} from './auth.js'

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

describe('ForgotPasswordRequest contract (Task 3)', () => {
  it('accepts and normalizes a valid email', () => {
    const parsed = ForgotPasswordRequest.parse({ email: '  Admin@Example.COM ' })
    expect(parsed.email).toBe('admin@example.com')
  })

  it('rejects an invalid email', () => {
    expect(() => ForgotPasswordRequest.parse({ email: 'not-an-email' })).toThrow()
  })
})

describe('ResetPasswordRequest contract (Task 3)', () => {
  it('accepts a valid email + 6-digit OTP + password', () => {
    const parsed = ResetPasswordRequest.parse({
      email: 'admin@example.com',
      otp: '123456',
      newPassword: 'brandnew8',
    })
    expect(parsed.otp).toBe('123456')
  })

  it('rejects an OTP that is not 6 digits', () => {
    expect(() =>
      ResetPasswordRequest.parse({
        email: 'admin@example.com',
        otp: '12ab',
        newPassword: 'brandnew8',
      }),
    ).toThrow()
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(() =>
      ResetPasswordRequest.parse({
        email: 'admin@example.com',
        otp: '123456',
        newPassword: 'short',
      }),
    ).toThrow()
  })
})
