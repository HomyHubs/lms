import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'

/**
 * Unique index `branches_code_unique` trên Postgres THẬT (slice-31, ADR 0023).
 *
 * Vì sao phải là integration test: index là biểu thức `upper(btrim(code))` kèm điều kiện
 * `where code is not null and btrim(code) <> ''`. Không unit test nào chứng minh được Postgres thật
 * sự từ chối ba trường hợp trùng (giống hệt / khác hoa-thường / thừa khoảng trắng) và thật sự CHO
 * phép nhiều dòng không có mã. Đây đúng là loại "gates xanh không chứng minh SQL đã chạy".
 *
 * Mã cơ sở dùng tiền tố `BQ`/`BR`/`BS`/`BT` để không đụng bộ đếm `student_code_seq` của test khác.
 */

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const CENTER_ID = '74000000-0000-4000-8000-000000000001'

describeWithPostgres('branches.code unique index on real Postgres', () => {
  let db: AppDb

  async function cleanup(): Promise<void> {
    // Xoá center kéo theo branch (on delete cascade).
    await db.deleteFrom('centers').where('id', '=', CENTER_ID).execute()
  }

  beforeAll(async () => {
    db = createDb(url!)
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await cleanup()
    await db.insertInto('centers').values({ id: CENTER_ID, name: 'Branches IT' }).execute()
  })

  afterAll(async () => {
    await cleanup()
    await db.destroy()
  })

  async function insertBranch(name: string, code: string | null): Promise<void> {
    await db.insertInto('branches').values({ center_id: CENTER_ID, name, code }).execute()
  }

  it('từ chối cơ sở thứ hai mang cùng mã', async () => {
    await insertBranch('Cơ sở A', 'BQ')
    await expect(insertBranch('Cơ sở B', 'BQ')).rejects.toThrow(/branches_code_unique/)
  })

  it('coi mã chỉ khác hoa-thường hoặc thừa khoảng trắng là trùng', async () => {
    await insertBranch('Cơ sở C', 'BR')
    // `normalizeStudentCodePrefix` trim rồi mới dùng làm khoá bộ đếm, nên ' BR ' và 'BR' chắc chắn
    // dùng chung bộ đếm — phải bị chặn ở đây, không phải phát hiện lúc cấp mã.
    await expect(insertBranch('Cơ sở D', 'br')).rejects.toThrow(/branches_code_unique/)
    await expect(insertBranch('Cơ sở E', ' BR ')).rejects.toThrow(/branches_code_unique/)
  })

  it('cho phép mã khác nhau và nhiều cơ sở không có mã', async () => {
    await insertBranch('Cơ sở F', 'BS')
    await insertBranch('Cơ sở G', 'BT')
    // Index là partial: dòng không có mã (null / rỗng / toàn khoảng trắng) không tham gia.
    await insertBranch('Cơ sở H', null)
    await insertBranch('Cơ sở I', null)
    await insertBranch('Cơ sở J', '')
    await insertBranch('Cơ sở K', '   ')

    const rows = await db
      .selectFrom('branches')
      .select('name')
      .where('center_id', '=', CENTER_ID)
      .where('name', 'like', 'Cơ sở %')
      .execute()
    // A,B (1 dòng), C (1), F..K (6) — B/D/E bị từ chối nên không có dòng.
    expect(rows).toHaveLength(8)
  })
})
