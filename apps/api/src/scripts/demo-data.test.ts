import { describe, expect, it } from 'vitest'
import { studentFullName, studentSlug } from './demo-data.js'

describe('studentFullName', () => {
  it('produces the documented accented Vietnamese name for index 0', () => {
    expect(studentFullName(0)).toBe('Nguyễn Minh An')
  })

  it('is deterministic for the same index', () => {
    expect(studentFullName(5)).toBe(studentFullName(5))
  })

  it('always returns three accented, non-empty name parts', () => {
    for (let i = 0; i < 72; i += 1) {
      const parts = studentFullName(i).split(' ')
      expect(parts).toHaveLength(3)
      for (const part of parts) expect(part.length).toBeGreaterThan(0)
    }
  })

  it('derives from the same family/given indices as studentSlug', () => {
    const family = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý']
    const familySlug = ['nguyen', 'tran', 'le', 'pham', 'hoang', 'vu', 'dang', 'bui', 'do', 'ngo', 'duong', 'ly']
    for (let i = 0; i < 72; i += 1) {
      const nameFamily = studentFullName(i).split(' ')[0]
      const slugFamily = studentSlug(i).split('.')[0]
      expect(family.indexOf(nameFamily as string)).toBe(familySlug.indexOf(slugFamily as string))
    }
  })
})
