import { describe, expect, it } from 'vitest'
import { ExamSetListQuery } from './exam-sets.js'

/**
 * slice-20: `ids` là danh sách id trên query string (`?ids=a,b,c`) — dùng để lấy nhiều bộ đề trong
 * MỘT request (bỏ N+1 khi xem trước đề). Query string luôn là chuỗi nên phải tách ở đây.
 */

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('ExamSetListQuery — ids', () => {
  it('splits a comma-separated id list', () => {
    const parsed = ExamSetListQuery.parse({ ids: `${A},${B}` })
    expect(parsed.ids).toEqual([A, B])
  })

  it('tolerates spaces around the commas', () => {
    expect(ExamSetListQuery.parse({ ids: ` ${A} , ${B} ` }).ids).toEqual([A, B])
  })

  it('drops empty segments', () => {
    expect(ExamSetListQuery.parse({ ids: `${A},,` }).ids).toEqual([A])
  })

  it('rejects a value that is not a uuid', () => {
    expect(() => ExamSetListQuery.parse({ ids: 'khong-phai-uuid' })).toThrow()
  })

  it('rejects an empty list', () => {
    expect(() => ExamSetListQuery.parse({ ids: '' })).toThrow()
  })

  it('stays optional, so the plain list call keeps working', () => {
    const parsed = ExamSetListQuery.parse({ level: 'starter' })
    expect(parsed.ids).toBeUndefined()
    expect(parsed.level).toBe('starter')
  })
})
