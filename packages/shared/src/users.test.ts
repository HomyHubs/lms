import { describe, expect, it } from 'vitest'
import { AdminUser, CreateUserRequest, UpdateUserRequest } from './users.js'

/**
 * slice-26 (ADR 0018): `birthDate` và `birthYear` mô tả cùng một dữ liệu ở hai mức chính xác.
 * Test khoá lại các ràng buộc để hai đầu FE/BE không lệch nhau.
 */

const BASE_CREATE = { phoneNumber: '0901234567', password: 'secret12', role: 'student' as const }

/** Ngày mai dạng 'YYYY-MM-DD' — dùng để chắc chắn schema chặn ngày tương lai. */
function tomorrowIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

describe('CreateUserRequest — birthDate', () => {
  it('accepts a full birth date without a birth year', () => {
    const parsed = CreateUserRequest.parse({ ...BASE_CREATE, birthDate: '2015-12-30' })
    expect(parsed.birthDate).toBe('2015-12-30')
    expect(parsed.birthYear).toBeUndefined()
  })

  it('still accepts a birth year alone (legacy / quick entry)', () => {
    const parsed = CreateUserRequest.parse({ ...BASE_CREATE, birthYear: 2015 })
    expect(parsed.birthYear).toBe(2015)
    expect(parsed.birthDate).toBeUndefined()
  })

  it('accepts both when the year matches', () => {
    const parsed = CreateUserRequest.parse({
      ...BASE_CREATE,
      birthDate: '2015-12-30',
      birthYear: 2015,
    })
    expect(parsed.birthDate).toBe('2015-12-30')
  })

  it('rejects both when the year does not match', () => {
    const result = CreateUserRequest.safeParse({
      ...BASE_CREATE,
      birthDate: '2015-12-30',
      birthYear: 1999,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((i) => i.message.includes('Nam sinh khong khop'))).toBe(true)
  })

  it('rejects a wrong shape', () => {
    expect(() => CreateUserRequest.parse({ ...BASE_CREATE, birthDate: '30/12/2015' })).toThrow()
    expect(() => CreateUserRequest.parse({ ...BASE_CREATE, birthDate: '2015-12-30T00:00:00Z' })).toThrow()
  })

  it('rejects a day that does not exist on the calendar', () => {
    // Regex một mình sẽ cho qua — đây là lý do có thêm bước đối chiếu Date.UTC.
    expect(() => CreateUserRequest.parse({ ...BASE_CREATE, birthDate: '2026-02-30' })).toThrow()
    expect(() => CreateUserRequest.parse({ ...BASE_CREATE, birthDate: '2025-02-29' })).toThrow()
  })

  it('rejects a future birth date', () => {
    expect(() => CreateUserRequest.parse({ ...BASE_CREATE, birthDate: tomorrowIso() })).toThrow()
  })

  it('accepts a leap day in a leap year', () => {
    const parsed = CreateUserRequest.parse({ ...BASE_CREATE, birthDate: '2024-02-29' })
    expect(parsed.birthDate).toBe('2024-02-29')
  })
})

describe('UpdateUserRequest — birthDate', () => {
  it('accepts clearing the birth date', () => {
    const parsed = UpdateUserRequest.parse({ birthDate: null })
    expect(parsed.birthDate).toBeNull()
  })

  it('counts birthDate as a field, so a lone birthDate is a valid update', () => {
    const parsed = UpdateUserRequest.parse({ birthDate: '2015-12-30' })
    expect(parsed.birthDate).toBe('2015-12-30')
  })

  it('rejects an empty payload', () => {
    expect(() => UpdateUserRequest.parse({})).toThrow()
  })

  it('rejects a mismatched pair', () => {
    expect(() => UpdateUserRequest.parse({ birthDate: '2015-12-30', birthYear: 1999 })).toThrow()
  })
})

describe('AdminUser — birthDate', () => {
  const base = {
    id: '11111111-1111-4111-8111-111111111111',
    phoneNumber: '0901234567',
    email: null,
    role: 'student' as const,
    lastName: null,
    firstName: null,
    birthYear: 2015,
    gender: null,
    address: null,
    parentPhone: null,
    studentCode: null,
    age: 10,
    createdAt: '2026-09-16T00:00:00.000Z',
  }

  it('defaults birthDate to null for payloads from before ADR 0018', () => {
    const parsed = AdminUser.parse(base)
    expect(parsed.birthDate).toBeNull()
  })

  it('keeps birthDate when present', () => {
    const parsed = AdminUser.parse({ ...base, birthDate: '2015-12-30' })
    expect(parsed.birthDate).toBe('2015-12-30')
  })
})
