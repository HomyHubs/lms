import { describe, expect, it } from 'vitest'
import { UserRole } from './auth.js'
import { can, isAllowed, PERMISSIONS, ROLE_PERMISSIONS, type Permission } from './permissions.js'

/**
 * slice-1 (ADR 0021): ma tran role -> quyen la nguon su thuc duy nhat cho ca API va FE.
 * Cac test duoi day khoa nhung tinh chat ma suy luan thu cong de bo sot.
 */

describe('PERMISSIONS', () => {
  it('has no duplicates', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length)
  })

  it('every permission is granted to at least one role (no dead entries)', () => {
    const granted = new Set<Permission>()
    for (const role of UserRole.options) for (const p of ROLE_PERMISSIONS[role]) granted.add(p)
    expect([...PERMISSIONS].filter((p) => !granted.has(p))).toEqual([])
  })

  it('only grants known permissions (no typos)', () => {
    const known = new Set<string>(PERMISSIONS)
    for (const role of UserRole.options) {
      expect(ROLE_PERMISSIONS[role].filter((p) => !known.has(p))).toEqual([])
    }
  })

  it('gives superadmin every permission without listing them by hand', () => {
    expect(ROLE_PERMISSIONS.superadmin).toEqual(PERMISSIONS)
    for (const p of PERMISSIONS) expect(can('superadmin', p)).toBe(true)
  })

  it('does not grant export to a plain admin (chong ro ri danh sach hoc vien)', () => {
    expect(can('admin', 'report.export')).toBe(false)
    expect(can('superadmin', 'report.export')).toBe(true)
  })

  it('keeps grading.import away from teachers and grading.grade away from students', () => {
    expect(can('teacher', 'grading.import')).toBe(false)
    expect(can('staff', 'grading.import')).toBe(true)
    expect(can('student', 'grading.grade')).toBe(false)
  })

  it('lets a student take exams and read only their own history', () => {
    expect(can('student', 'exam.take')).toBe(true)
    expect(can('student', 'exam.history.self')).toBe(true)
    expect(can('student', 'exam.history.read')).toBe(false)
    expect(can('student', 'exam.manage')).toBe(false)
  })
})

describe('isAllowed', () => {
  it('treats an empty role list as "login only"', () => {
    expect(isAllowed('student', [])).toBe(true)
    expect(isAllowed('staff', [])).toBe(true)
  })

  it('lets superadmin through every role list', () => {
    expect(isAllowed('superadmin', ['student'])).toBe(true)
    expect(isAllowed('superadmin', ['admin', 'teacher'])).toBe(true)
  })

  it('denies a role that is not in the list', () => {
    expect(isAllowed('staff', ['admin'])).toBe(false)
    expect(isAllowed('student', ['admin', 'teacher', 'staff'])).toBe(false)
  })

  it('allows a role that is in the list', () => {
    expect(isAllowed('teacher', ['admin', 'teacher'])).toBe(true)
  })
})
