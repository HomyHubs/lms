import { describe, expect, it, vi } from 'vitest'
import { assignCodeWithRetry } from './store.js'

/**
 * slice-23: hai request tạo học viên đồng thời cùng prefix có thể tính ra cùng số thứ tự.
 * `assignCodeWithRetry` là lớp chống trùng: gặp unique violation thì sinh mã mới và thử lại.
 * Hàm thuần (nhận 2 callback) nên test được không cần Postgres.
 */

const uniqueViolation = (): Error => Object.assign(new Error('duplicate key'), { code: '23505' })

describe('assignCodeWithRetry', () => {
  it('trả kết quả ngay khi lần ghi đầu thành công', async () => {
    const nextCode = vi.fn().mockResolvedValue('HV0001')
    const writeCode = vi.fn().mockResolvedValue({ id: 'u1', student_code: 'HV0001' })

    const row = await assignCodeWithRetry(nextCode, writeCode)

    expect(row).toEqual({ id: 'u1', student_code: 'HV0001' })
    expect(nextCode).toHaveBeenCalledTimes(1)
    expect(writeCode).toHaveBeenCalledWith('HV0001')
  })

  it('sinh mã mới và thử lại khi mã vừa tính đã bị người khác lấy', async () => {
    const nextCode = vi
      .fn()
      .mockResolvedValueOnce('HV0001')
      .mockResolvedValueOnce('HV0002')
    const writeCode = vi
      .fn()
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({ id: 'u1', student_code: 'HV0002' })

    const row = await assignCodeWithRetry(nextCode, writeCode)

    expect(row).toEqual({ id: 'u1', student_code: 'HV0002' })
    expect(nextCode).toHaveBeenCalledTimes(2)
    expect(writeCode).toHaveBeenLastCalledWith('HV0002')
  })

  it('không nuốt lỗi khác unique violation', async () => {
    const nextCode = vi.fn().mockResolvedValue('HV0001')
    const writeCode = vi.fn().mockRejectedValue(new Error('connection lost'))

    await expect(assignCodeWithRetry(nextCode, writeCode)).rejects.toThrow('connection lost')
    // Loi that -> khong thu lai, tranh ghi ma lien tuc vo ich.
    expect(nextCode).toHaveBeenCalledTimes(1)
  })

  it('bỏ cuộc sau khi hết số lần thử và ném lỗi gốc', async () => {
    const nextCode = vi.fn().mockResolvedValue('HV0001')
    const writeCode = vi.fn().mockRejectedValue(uniqueViolation())

    await expect(assignCodeWithRetry(nextCode, writeCode, 3)).rejects.toThrow('duplicate key')
    expect(nextCode).toHaveBeenCalledTimes(3)
  })
})
