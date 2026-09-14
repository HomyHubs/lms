import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type { AuthStore } from './service.js'
import type { PasswordResetStore } from './password-reset.js'

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

/** Hien thuc PasswordResetStore (Task 3) bang Kysely tren Postgres THUC. */
export function makePasswordResetStore(db: AppDb): PasswordResetStore {
  return {
    async findUserByEmail(email) {
      return db
        .selectFrom('users')
        .select(['id'])
        .where('email', '=', email)
        .executeTakeFirst()
    },

    async createOtp({ userId, otpHash, expiresAt }) {
      await db
        .insertInto('password_reset_otps')
        .values({
          user_id: userId,
          otp_hash: otpHash,
          expires_at: expiresAt.toISOString(),
        })
        .execute()
    },

    async findActiveOtpByEmail(email) {
      // OTP moi nhat, chua dung, cua user co email nay.
      const row = await db
        .selectFrom('password_reset_otps as o')
        .innerJoin('users as u', 'u.id', 'o.user_id')
        .select([
          'o.id as id',
          'o.user_id as user_id',
          'o.otp_hash as otp_hash',
          'o.attempts as attempts',
          'o.consumed_at as consumed_at',
          'o.expires_at as expires_at',
        ])
        .where('u.email', '=', email)
        .where('o.consumed_at', 'is', null)
        .orderBy('o.created_at', 'desc')
        .limit(1)
        .executeTakeFirst()
      if (!row) return undefined
      return {
        id: row.id,
        userId: row.user_id,
        otpHash: row.otp_hash,
        attempts: row.attempts,
        consumedAt: row.consumed_at ? new Date(row.consumed_at) : null,
        expiresAt: new Date(row.expires_at),
      }
    },

    async incrementOtpAttempts(id) {
      await db
        .updateTable('password_reset_otps')
        .set({ attempts: sql`attempts + 1` })
        .where('id', '=', id)
        .execute()
    },

    async markOtpConsumed(id) {
      await db
        .updateTable('password_reset_otps')
        .set({ consumed_at: new Date().toISOString() })
        .where('id', '=', id)
        .execute()
    },

    async updateUserPassword(userId, passwordHash) {
      await db
        .updateTable('users')
        .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .where('id', '=', userId)
        .execute()
    },
  }
}
