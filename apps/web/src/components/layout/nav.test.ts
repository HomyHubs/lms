import { describe, expect, it } from 'vitest'
import type { UserRole } from '@lms/shared'
import { examItemsFor, NAV_ITEMS, navItemsFor } from './nav'

/**
 * slice-32 (ADR 0024): menu tinh tu ma tran quyen, khong con mang role rieng.
 *
 * Test nay khoa lai TAP DUONG DAN nhin thay cua tung role — chinh la hanh vi truoc khi refactor.
 * Neu ai sua `ROLE_PERMISSIONS` lam menu doi, test do va buoc phai sua o day mot cach co y thuc.
 * `App.test.tsx` kiem them phan render that (link, tile, chuyen huong).
 */

const MAIN: Record<UserRole, string[]> = {
  superadmin: ['/', '/exam-management', '/attendance', '/work-hours', '/reports', '/users', '/centers', '/catalog', '/assignments', '/students'],
  admin: ['/', '/exam-management', '/attendance', '/work-hours', '/reports', '/users', '/centers', '/catalog', '/assignments', '/students'],
  teacher: ['/', '/exam-management', '/attendance', '/work-hours', '/students'],
  staff: ['/', '/work-hours', '/students'],
  student: ['/', '/exam-management', '/attendance'],
}

const EXAMS: Record<UserRole, string[]> = {
  // superadmin thay menu cua admin, khong thay muc rieng cua hoc vien.
  superadmin: ['/questions', '/exam-sets', '/ai-questions', '/grading', '/exam-reports'],
  admin: ['/questions', '/exam-sets', '/ai-questions', '/grading', '/exam-reports'],
  teacher: ['/questions', '/exam-sets', '/ai-questions', '/grading', '/exam-reports'],
  staff: [],
  student: ['/exams', '/exam-history'],
}

describe('navItemsFor / examItemsFor', () => {
  for (const role of Object.keys(MAIN) as UserRole[]) {
    it(`shows exactly the expected main links for ${role}`, () => {
      expect(navItemsFor(role).map((item) => item.path)).toEqual(MAIN[role])
    })

    it(`shows exactly the expected exam links for ${role}`, () => {
      expect(examItemsFor(role).map((item) => item.path)).toEqual(EXAMS[role])
    })
  }

  it('gives superadmin the same menu as admin (not the student-only items)', () => {
    expect(navItemsFor('superadmin')).toEqual(navItemsFor('admin'))
    expect(examItemsFor('superadmin')).toEqual(examItemsFor('admin'))
  })
})

describe('NAV_ITEMS', () => {
  it('has a unique path per item', () => {
    const paths = NAV_ITEMS.map((item) => item.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('leaves only the dashboard open to every logged-in role', () => {
    // Muc menu rong quyen = ai dang nhap cung thay. Chi "/" duoc phep nhu vay; moi trang khac phai
    // chi ro mot nang luc, neu khong se thanh trang "mo" ma khong ai quyet dinh mo no.
    const open = NAV_ITEMS.filter((item) => item.permissions.length === 0).map((item) => item.path)
    expect(open).toEqual(['/'])
  })
})
