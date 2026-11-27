import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from '../../platform/db.js'
import { createUser, getUser, updateUser } from './service.js'
import { makeUsersStore } from './store.js'

/**
 * Store người dùng trên Postgres THẬT.
 *
 * Trọng tâm: những thứ unit test không chứng minh được —
 *  - `birth_date` (cột Postgres `date`) phải đọc ra ĐÚNG chuỗi 'YYYY-MM-DD'. Nếu để `pg` parse,
 *    nó trả `Date` lúc nửa đêm theo timezone máy chủ và ngày sẽ lệch (ADR 0018);
 *  - `assignStudentCode` sinh mã tuần tự theo `branches.code` và unique index chặn trùng
 *    (slice-23 — trước đây chỉ có hàm thuần `assignCodeWithRetry` được test, chưa test SQL thật).
 */

const url = process.env.TEST_DATABASE_URL
const describeWithPostgres = url ? describe : describe.skip

const CENTER_ID = '73000000-0000-4000-8000-000000000001'
const BRANCH_ID = '73000000-0000-4000-8000-000000000002'

describeWithPostgres('users store on real Postgres', () => {
  let db: AppDb
  let store: ReturnType<typeof makeUsersStore>
  /** Năm sinh dùng cho test — cố tình khác năm của `birth_date` để bắt lỗi "quên ghi đè". */
  const BIRTH_DATE = '2015-12-30'
  const TODAY = '2026-11-22'

  async function cleanup(): Promise<void> {
    // Xoá center kéo theo branch -> user_branches.
    await db.deleteFrom('centers').where('id', '=', CENTER_ID).execute()
    await db.deleteFrom('users').where('phone_number', 'like', '090000073%').execute()
  }

  beforeAll(async () => {
    db = createDb(url!)
    if (!url || !['/lms_slice4_test', '/lms_test'].includes(new URL(url).pathname)) {
      throw new Error('Use only a disposable test database (lms_slice4_test or CI lms_test)')
    }
    await cleanup()
    store = makeUsersStore(db)

    await db.insertInto('centers').values({ id: CENTER_ID, name: 'Users IT' }).execute()
    await db
      .insertInto('branches')
      .values({ id: BRANCH_ID, center_id: CENTER_ID, name: 'Branch IT', code: 'IT' })
      .execute()
  })

  afterAll(async () => {
    await cleanup()
    await db.destroy()
  })

  it('round-trips birth_date as a plain YYYY-MM-DD string (no timezone drift)', async () => {
    const outcome = await createUser(
      store,
      {
        phoneNumber: '0900000731',
        password: 'secret12',
        role: 'student',
        birthDate: BIRTH_DATE,
      },
      TODAY,
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return

    // Đọc lại từ DB: nếu `pg` parse `date` thành Date thì giá trị dưới đây sẽ lệch ngày.
    const row = await store.findUserById(outcome.user.id)
    expect(row?.birth_date).toBe(BIRTH_DATE)
    // birth_year được dẫn xuất từ birth_date, không phải giá trị gửi kèm.
    expect(row?.birth_year).toBe(2015)
    // 30/12 chưa tới so với 22/11 -> 10 tuổi (công thức cũ cho 11).
    expect(outcome.user.age).toBe(10)
  })

  it('clears birth_date on update while keeping birth_year', async () => {
    const created = await createUser(
      store,
      { phoneNumber: '0900000732', password: 'secret12', role: 'student', birthDate: BIRTH_DATE },
      TODAY,
    )
    if (!created.ok) throw new Error('setup failed')

    const updated = await updateUser(store, created.user.id, { birthDate: null }, TODAY)
    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    expect(updated.user.birthDate).toBeNull()
    expect(updated.user.birthYear).toBe(2015)
    // Không còn ngày sinh -> quay về ước lượng theo năm sinh.
    expect(updated.user.age).toBe(2026 - 2015)
  })

  it('lists users with birth_date and keeps the age rule to students only', async () => {
    const teacher = await createUser(
      store,
      { phoneNumber: '0900000733', password: 'secret12', role: 'teacher', birthDate: '1990-05-20' },
      TODAY,
    )
    if (!teacher.ok) throw new Error('setup failed')
    expect(teacher.user.age).toBeNull()
    expect(teacher.user.birthDate).toBe('1990-05-20')

    const found = await getUser(store, teacher.user.id, TODAY)
    expect(found?.birthDate).toBe('1990-05-20')
    expect(found?.age).toBeNull()
  })

  it('assigns sequential student codes from the branch prefix', async () => {
    const first = await createUser(
      store,
      { phoneNumber: '0900000734', password: 'secret12', role: 'student' },
      TODAY,
    )
    const second = await createUser(
      store,
      { phoneNumber: '0900000735', password: 'secret12', role: 'student' },
      TODAY,
    )
    if (!first.ok || !second.ok) throw new Error('setup failed')

    // Chưa gán cơ sở -> prefix mặc định 'HV'.
    expect(first.user.studentCode).toMatch(/^HV\d{4}$/)
    expect(second.user.studentCode).toMatch(/^HV\d{4}$/)
    expect(first.user.studentCode).not.toBe(second.user.studentCode)

    // Gán cơ sở có code 'IT' rồi sinh mã cho user khác -> prefix đổi theo cơ sở.
    const third = await createUser(
      store,
      { phoneNumber: '0900000736', password: 'secret12', role: 'student' },
      TODAY,
    )
    if (!third.ok) throw new Error('setup failed')
    await db
      .insertInto('user_branches')
      .values({ user_id: third.user.id, branch_id: BRANCH_ID })
      .execute()
    const branchCode = await store.branchCodeForUser(third.user.id)
    expect(branchCode).toBe('IT')

    const reassigned = await store.assignStudentCode(third.user.id, branchCode)
    expect(reassigned?.student_code).toBe('IT0001')
  })
})
