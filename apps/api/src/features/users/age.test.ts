import { describe, expect, it } from 'vitest'
import {
  ageFromBirthDate,
  ageFromBirthYear,
  displayAge,
  parseIsoDate,
  todayInVN,
} from './age.js'

/**
 * slice-26 (ADR 0018): truoc day tuoi = `nam hien tai - birth_year`, sai +-1 voi bat ky ai chua qua
 * sinh nhat. Cac test duoi day khoa lai dung bien do — dac biet la 3 ngay quanh sinh nhat.
 */

describe('todayInVN', () => {
  it('formats the VN calendar day, not the server day', () => {
    // 2026-11-22T18:00Z = 2026-11-23 01:00 gio VN -> phai la ngay 23, khong phai 22.
    expect(todayInVN(new Date('2026-11-22T18:00:00.000Z'))).toBe('2026-11-23')
    // 2026-11-22T16:59Z = 2026-11-22 23:59 gio VN -> van la ngay 22.
    expect(todayInVN(new Date('2026-11-22T16:59:00.000Z'))).toBe('2026-11-22')
  })
})

describe('parseIsoDate', () => {
  it('accepts a real calendar date', () => {
    expect(parseIsoDate('2015-03-04')).toEqual({ year: 2015, month: 3, day: 4 })
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 })
  })

  it('rejects wrong shapes and impossible days', () => {
    expect(parseIsoDate('2015-3-4')).toBeNull()
    expect(parseIsoDate('04/03/2015')).toBeNull()
    expect(parseIsoDate('')).toBeNull()
    // Ngay "tron" ma regex khong bat duoc.
    expect(parseIsoDate('2026-02-30')).toBeNull()
    expect(parseIsoDate('2026-13-01')).toBeNull()
    // 2025 khong phai nam nhuan.
    expect(parseIsoDate('2025-02-29')).toBeNull()
  })
})

describe('ageFromBirthDate', () => {
  const birth = '2015-06-15'

  it('counts the birthday itself as already turned', () => {
    expect(ageFromBirthDate(birth, '2026-06-15')).toBe(11)
  })

  it('is one year younger the day before the birthday', () => {
    expect(ageFromBirthDate(birth, '2026-06-14')).toBe(10)
  })

  it('is one year older the day after the birthday', () => {
    expect(ageFromBirthDate(birth, '2026-06-16')).toBe(11)
  })

  // Day la ca cai bug cu: 2026 - 2015 = 11, nhung ngay 22/11 thi hoc vien moi 10 tuoi.
  it('does not over-count before the birthday in the current year', () => {
    expect(ageFromBirthDate('2015-12-30', '2026-11-22')).toBe(10)
  })

  it('handles a 29/02 birthday in a non-leap year', () => {
    // Chua toi 29/02 (nam khong nhuan) -> van o tuoi cu.
    expect(ageFromBirthDate('2000-02-29', '2026-02-28')).toBe(25)
    expect(ageFromBirthDate('2000-02-29', '2026-03-01')).toBe(26)
  })

  it('returns null for invalid or future birth dates', () => {
    expect(ageFromBirthDate('2026-02-30', '2026-11-22')).toBeNull()
    expect(ageFromBirthDate('2030-01-01', '2026-11-22')).toBeNull()
    expect(ageFromBirthDate(birth, 'khong-phai-ngay')).toBeNull()
  })
})

describe('ageFromBirthYear', () => {
  it('returns the year difference (an estimate, may be off by one)', () => {
    expect(ageFromBirthYear(2015, '2026-11-22')).toBe(11)
  })

  it('returns null when the year is in the future or today is invalid', () => {
    expect(ageFromBirthYear(2030, '2026-11-22')).toBeNull()
    expect(ageFromBirthYear(2015, '2026-13-01')).toBeNull()
  })
})

describe('displayAge', () => {
  it('prefers the exact birth date over the birth year', () => {
    // 30/12 chua toi -> 10, du 2026-2015 = 11.
    expect(displayAge('2015-12-30', 2015, '2026-11-22')).toBe(10)
  })

  it('falls back to the birth year when there is no birth date', () => {
    expect(displayAge(null, 2015, '2026-11-22')).toBe(11)
  })

  it('falls back to the birth year when the birth date is unusable', () => {
    expect(displayAge('2026-02-30', 2015, '2026-11-22')).toBe(11)
  })

  it('returns null when neither field is usable', () => {
    expect(displayAge(null, null, '2026-11-22')).toBeNull()
  })
})
