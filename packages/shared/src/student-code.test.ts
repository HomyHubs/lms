import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STUDENT_CODE_PREFIX,
  formatStudentCode,
  isStudentCode,
  normalizeStudentCodePrefix,
  parseStudentCode,
} from './student-code.js'

/**
 * slice-23-c (ADR 0022): dinh dang ma hoc vien co dau phan cach.
 *
 * Trong tam khong phai "noi chuoi dung" (qua de) ma la hai thu da tung lam hong he thong:
 *  - hai tien to long nhau phai phan biet duoc (`HV-10001` khac `HV1-0001`);
 *  - ma cu khong co dau phan cach phai bi tu choi, de khong ai tuong `HV0001` la ma hop le.
 */

describe('normalizeStudentCodePrefix', () => {
  it('trims and keeps a real prefix', () => {
    expect(normalizeStudentCodePrefix('  HN ')).toBe('HN')
  })

  it('falls back to the default prefix when missing or blank', () => {
    expect(normalizeStudentCodePrefix(null)).toBe(DEFAULT_STUDENT_CODE_PREFIX)
    expect(normalizeStudentCodePrefix(undefined)).toBe(DEFAULT_STUDENT_CODE_PREFIX)
    expect(normalizeStudentCodePrefix('')).toBe(DEFAULT_STUDENT_CODE_PREFIX)
    expect(normalizeStudentCodePrefix('   ')).toBe(DEFAULT_STUDENT_CODE_PREFIX)
  })
})

describe('formatStudentCode', () => {
  it('puts a separator between prefix and zero-padded sequence', () => {
    expect(formatStudentCode('HV', 1)).toBe('HV-0001')
    expect(formatStudentCode('HN', 42)).toBe('HN-0042')
  })

  it('grows past the minimum width instead of truncating', () => {
    expect(formatStudentCode('HV', 9999)).toBe('HV-9999')
    expect(formatStudentCode('HV', 10000)).toBe('HV-10000')
  })

  it('uses the default prefix when the branch has no code', () => {
    expect(formatStudentCode(null, 1)).toBe('HV-0001')
    expect(formatStudentCode('', 7)).toBe('HV-0007')
  })
})

describe('parseStudentCode', () => {
  it('splits prefix and sequence', () => {
    expect(parseStudentCode('HV-0001')).toEqual({ prefix: 'HV', sequence: 1 })
    expect(parseStudentCode('Q9-0042')).toEqual({ prefix: 'Q9', sequence: 42 })
  })

  it('distinguishes nested prefixes that used to collide', () => {
    // Truoc ADR 0022 ca hai deu sinh ra 'HV10001' — khong phan biet duoc co so nao, so nao.
    expect(parseStudentCode('HV-10001')).toEqual({ prefix: 'HV', sequence: 10001 })
    expect(parseStudentCode('HV1-0001')).toEqual({ prefix: 'HV1', sequence: 1 })
    expect(parseStudentCode('HV-10001')).not.toEqual(parseStudentCode('HV1-0001'))
  })

  it('cuts at the last separator, so a prefix may contain one', () => {
    expect(parseStudentCode('AB-CD-0001')).toEqual({ prefix: 'AB-CD', sequence: 1 })
  })

  it('rejects the old separator-less format', () => {
    expect(parseStudentCode('HV0001')).toBeNull()
  })

  it('rejects strings that are not a student code', () => {
    expect(parseStudentCode('HV-001')).toBeNull() // thieu chu so
    expect(parseStudentCode('HV-')).toBeNull()
    expect(parseStudentCode('-0001')).toBeNull() // thieu tien to
    expect(parseStudentCode('')).toBeNull()
    expect(parseStudentCode('HV-00A1')).toBeNull()
  })

  it('round-trips with formatStudentCode', () => {
    for (const code of ['HV-0001', 'Z7-0001', 'Z71-0001', 'AB-CD-0001', 'HV-10001']) {
      const parsed = parseStudentCode(code)
      expect(parsed).not.toBeNull()
      expect(formatStudentCode(parsed!.prefix, parsed!.sequence)).toBe(code)
    }
  })
})

describe('isStudentCode', () => {
  it('accepts the current format and rejects the legacy one', () => {
    expect(isStudentCode('HV-0001')).toBe(true)
    expect(isStudentCode('HV0001')).toBe(false)
  })
})
