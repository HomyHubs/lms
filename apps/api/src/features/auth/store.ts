import type { AppDb } from '../../platform/db.js'
import type { AuthStore } from './service.js'

/** Hien thuc AuthStore bang Kysely tren Postgres THUC (khong mock). */
export function makeAuthStore(db: AppDb): AuthStore {
  return {
    async findUserByPhone(phoneNumber) {
      return db
        .selectFrom('users')
        .select(['id', 'phone_number', 'password_hash', 'role'])
        .where('phone_number', '=', phoneNumber)
        .executeTakeFirst()
    },

    async findUserById(id) {
      return db
        .selectFrom('users')
        .select(['id', 'phone_number', 'password_hash', 'role'])
        .where('id', '=', id)
        .executeTakeFirst()
    },

    async createSession({ tokenHash, userId, expiresAt }) {
      await db
        .insertInto('sessions')
        .values({
          token_hash: tokenHash,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
        })
        .execute()
    },

    async findSession(tokenHash) {
      const row = await db
        .selectFrom('sessions')
        .select(['user_id', 'expires_at'])
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst()
      if (!row) return undefined
      return { userId: row.user_id, expiresAt: new Date(row.expires_at) }
    },

    async deleteSession(tokenHash) {
      await db.deleteFrom('sessions').where('token_hash', '=', tokenHash).execute()
    },
  }
}
