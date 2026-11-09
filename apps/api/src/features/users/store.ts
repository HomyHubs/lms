import type { AppDb } from '../../platform/db.js'
import type { UsersStore } from './service.js'

/** Cac cot an toan de tra ra ngoai (KHONG gom password_hash). */
const SAFE_COLUMNS = [
  'id',
  'phone_number',
  'email',
  'role',
  'last_name',
  'first_name',
  'birth_year',
  'gender',
  'address',
  'parent_phone',
  'created_at',
] as const

/** Hien thuc UsersStore bang Kysely tren Postgres THUC (khong mock). */
export function makeUsersStore(db: AppDb): UsersStore {
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

    async createUser({
      phoneNumber,
      passwordHash,
      role,
      email,
      lastName,
      firstName,
      birthYear,
      gender,
      address,
      parentPhone,
    }) {
      return db
        .insertInto('users')
        .values({
          phone_number: phoneNumber,
          password_hash: passwordHash,
          role,
          email,
          last_name: lastName,
          first_name: firstName,
          birth_year: birthYear,
          gender,
          address,
          parent_phone: parentPhone,
        })
        .returning(SAFE_COLUMNS)
        .executeTakeFirstOrThrow()
    },

    async updateUser(id, input) {
      return db
        .updateTable('users')
        .set({
          updated_at: new Date().toISOString(),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.passwordHash !== undefined ? { password_hash: input.passwordHash } : {}),
          ...(input.lastName !== undefined ? { last_name: input.lastName } : {}),
          ...(input.firstName !== undefined ? { first_name: input.firstName } : {}),
          ...(input.birthYear !== undefined ? { birth_year: input.birthYear } : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.parentPhone !== undefined ? { parent_phone: input.parentPhone } : {}),
        })
        .where('id', '=', id)
        .returning(SAFE_COLUMNS)
        .executeTakeFirst()
    },

    async deleteUser(id) {
      const res = await db.deleteFrom('users').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },
  }
}
