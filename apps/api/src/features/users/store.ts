import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type { UsersStore } from './service.js'

/**
 * slice-26 (ADR 0018): `users.birth_date` la cot Postgres kieu `date`. De `pg` parse thi no tra ve
 * `Date` luc nua dem theo timezone may chu, roi khi format lai se lech ngay. Ep sang chuoi
 * 'YYYY-MM-DD' ngay trong cau SQL — cung cach `attendance/store.ts` dang lam voi `session_date`.
 */
const BIRTH_DATE = sql<string | null>`to_char(users.birth_date, 'YYYY-MM-DD')`.as('birth_date')

/**
 * Cac cot an toan de DOC ra ngoai (KHONG gom password_hash).
 *
 * Luu y: bieu thuc `BIRTH_DATE` chi dung cho menh de SELECT. Voi `returning()` cua INSERT/UPDATE,
 * store ghi xong doc lai bang `readRow` thay vi nhet bieu thuc vao RETURNING — RETURNING nhan duoc
 * ten cot tho va bieu thuc, nhung doc lai la duong an toan nhat va chi ton them mot luot truy van
 * tren duong ghi (thao tac quan tri, tan suat thap).
 */
const SAFE_COLUMNS = [
  'id',
  'phone_number',
  'email',
  'role',
  'last_name',
  'first_name',
  'birth_year',
  BIRTH_DATE,
  'gender',
  'address',
  'parent_phone',
  'student_code',
  'created_at',
] as const

/** Tien to ma mac dinh khi hoc vien chua gan co so / co so chua co `branches.code`. */
const DEFAULT_CODE_PREFIX = 'HV'
/** So chu so phan so thu tu trong ma hoc vien (vd HN0001). */
const CODE_SEQ_WIDTH = 4
/** So lan thu lai khi trung ma do tao dong thoi cung prefix (xac suat rat thap). */
const CODE_ASSIGN_ATTEMPTS = 5

/** Postgres unique_violation — dung de biet co nen thu lai hay khong. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

/**
 * Sinh ma roi ghi; neu ghi bi unique violation (2 request tao dong thoi tinh ra cung so thu tu)
 * thi sinh lai ma moi va thu tiep. Cac loi khac nem ra ngay.
 *
 * Tach rieng de test duoc bang ham gia lap — phan nay khong can Postgres.
 */
export async function assignCodeWithRetry<T>(
  nextCode: () => Promise<string>,
  writeCode: (code: string) => Promise<T>,
  attempts: number = CODE_ASSIGN_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const code = await nextCode()
    try {
      return await writeCode(code)
    } catch (err) {
      if (!isUniqueViolation(err) || attempt === attempts) throw err
    }
  }
  // Khong toi day duoc: vong lap chi thoat khi return hoac throw.
  throw new Error('assignCodeWithRetry: exhausted attempts')
}

/** Hien thuc UsersStore bang Kysely tren Postgres THUC (khong mock). */
export function makeUsersStore(db: AppDb): UsersStore {
  /** Doc lai mot dong theo id voi bo cot an toan (da ep `birth_date` sang chuoi). */
  const readRow = async (id: string) => {
    return db.selectFrom('users').select(SAFE_COLUMNS).where('id', '=', id).executeTakeFirst()
  }

  /** Ma ke tiep theo tien to co so: max(so thu tu trong cung prefix) + 1, zero-pad. */
  const nextCode = async (branchCode: string | null): Promise<string> => {
    const prefix = branchCode && branchCode.trim() !== '' ? branchCode : DEFAULT_CODE_PREFIX
    const rows = await db
      .selectFrom('users')
      .select('student_code')
      .where('role', '=', 'student')
      .where('student_code', 'like', `${prefix}%`)
      .execute()
    let max = 0
    for (const r of rows) {
      const suffix = (r.student_code ?? '').slice(prefix.length)
      // Chi nhan phan so thuan sau prefix (bo cac ma prefix khac tinh co trung dau).
      if (!/^\d+$/.test(suffix)) continue
      const n = Number.parseInt(suffix, 10)
      if (n > max) max = n
    }
    return `${prefix}${String(max + 1).padStart(CODE_SEQ_WIDTH, '0')}`
  }

  /** Ghi ma hoc vien; nem loi unique violation neu ma da bi nguoi khac lay. */
  const writeCode = async (id: string, code: string) => {
    const written = await db
      .updateTable('users')
      .set({ updated_at: new Date().toISOString(), student_code: code })
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst()
    // Khong co dong nao bi sua -> user khong ton tai (service tra not_found).
    return written ? readRow(id) : undefined
  }

  return {
    async listUsers() {
      return db.selectFrom('users').select(SAFE_COLUMNS).orderBy('created_at', 'asc').execute()
    },

    async findUserById(id) {
      return db
        .selectFrom('users')
        .select(SAFE_COLUMNS)
        .where('id', '=', id)
        .executeTakeFirst()
    },

    async findUserByPhone(phoneNumber) {
      return db
        .selectFrom('users')
        .select(SAFE_COLUMNS)
        .where('phone_number', '=', phoneNumber)
        .executeTakeFirst()
    },

    async findUserByStudentCode(code) {
      // slice-23: tra hoc vien theo ma (khop import diem). Mien dieu kien role de chi can 1 index-hit;
      // ma chi duoc sinh cho hoc vien nen ket qua thuc te van la hoc vien.
      return db
        .selectFrom('users')
        .select(SAFE_COLUMNS)
        .where('student_code', '=', code)
        .executeTakeFirst()
    },

    async assignStudentCode(id, branchCode) {
      // slice-23: sinh + ghi ma, retry khi trung so thu tu do tao dong thoi cung prefix.
      // Unique index `users_student_code_unique` la chot chan cuoi cung: neu 2 request cung
      // tinh ra mot so, mot cai se vi pham va duoc thu lai voi so ke tiep.
      return assignCodeWithRetry(
        () => nextCode(branchCode),
        (code) => writeCode(id, code),
      )
    },

    async branchCodeForUser(userId) {
      // slice-23: tien to co so cua hoc vien = branches.code cua co so gan som nhat (giong backfill
      // trong migration). null khi chua gan co so hoac co so chua co ma -> service dung fallback 'HV'.
      const row = await db
        .selectFrom('user_branches')
        .innerJoin('branches', 'branches.id', 'user_branches.branch_id')
        .where('user_branches.user_id', '=', userId)
        .select('branches.code as code')
        .orderBy('user_branches.created_at', 'asc')
        .orderBy('user_branches.branch_id', 'asc')
        .executeTakeFirst()
      return row?.code ?? null
    },

    async createUser({
      phoneNumber,
      passwordHash,
      role,
      email,
      lastName,
      firstName,
      birthYear,
      birthDate,
      gender,
      address,
      parentPhone,
    }) {
      const inserted = await db
        .insertInto('users')
        .values({
          phone_number: phoneNumber,
          password_hash: passwordHash,
          role,
          email,
          last_name: lastName,
          first_name: firstName,
          birth_year: birthYear,
          // slice-26 (ADR 0018): ngay sinh day du; service da dan xuat birthYear tu do truoc khi goi.
          birth_date: birthDate,
          gender,
          address,
          parent_phone: parentPhone,
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      // Doc lai de `birth_date` ra dang chuoi 'YYYY-MM-DD' nhu cac duong doc khac.
      return (await readRow(inserted.id))!
    },

    async updateUser(id, input) {
      const updated = await db
        .updateTable('users')
        .set({
          updated_at: new Date().toISOString(),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.passwordHash !== undefined ? { password_hash: input.passwordHash } : {}),
          ...(input.lastName !== undefined ? { last_name: input.lastName } : {}),
          ...(input.firstName !== undefined ? { first_name: input.firstName } : {}),
          ...(input.birthYear !== undefined ? { birth_year: input.birthYear } : {}),
          // slice-26 (ADR 0018): null = xoa ngay sinh (quay ve uoc luong theo birth_year).
          ...(input.birthDate !== undefined ? { birth_date: input.birthDate } : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.parentPhone !== undefined ? { parent_phone: input.parentPhone } : {}),
        })
        .where('id', '=', id)
        .returning('id')
        .executeTakeFirst()
      return updated ? readRow(id) : undefined
    },

    async deleteUser(id) {
      const res = await db.deleteFrom('users').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },
  }
}
