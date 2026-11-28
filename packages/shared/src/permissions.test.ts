import { describe, expect, it } from 'vitest'
import { UserRole } from './auth.js'
import { can, canAny, isAllowed, PERMISSIONS, ROLE_PERMISSIONS, type Permission } from './permissions.js'

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

  // slice-32 (ADR 0024): hai quyen chi de hien menu. Chung phai HEP hon quyen API tuong ung —
  // staff cham bai duoc nhung khong di qua man Cham bai.
  it('keeps grading.menu narrower than grading.grade, and enrollment admin-only', () => {
    expect(can('staff', 'grading.grade')).toBe(true)
    expect(can('staff', 'grading.menu')).toBe(false)
    expect(can('teacher', 'grading.menu')).toBe(true)
    expect(can('admin', 'enrollment.manage')).toBe(true)
    expect(can('teacher', 'enrollment.manage')).toBe(false)
    expect(can('staff', 'enrollment.manage')).toBe(false)
  })
})

describe('canAny', () => {
  it('treats an empty permission list as "login only"', () => {
    expect(canAny('student', [])).toBe(true)
    expect(canAny('staff', [])).toBe(true)
  })

  it('allows when the role has at least one of the permissions', () => {
    // Man Diem danh: hop cua "xem bang tong hop" (admin/teacher) va "xem cua minh" (student).
    expect(canAny('admin', ['attendance.read', 'attendance.self'])).toBe(true)
    expect(canAny('teacher', ['attendance.read', 'attendance.self'])).toBe(true)
    expect(canAny('student', ['attendance.read', 'attendance.self'])).toBe(true)
    expect(canAny('staff', ['attendance.read', 'attendance.self'])).toBe(false)
  })

  it('lets superadmin through any list, and denies a role with none of them', () => {
    expect(canAny('superadmin', ['exam.take'])).toBe(true)
    expect(canAny('teacher', ['user.manage', 'report.read'])).toBe(false)
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
