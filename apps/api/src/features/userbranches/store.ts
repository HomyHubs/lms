import type { AppDb } from '../../platform/db.js'
import type { UserBranchesStore } from './service.js'

const BRANCH_COLUMNS = [
  'branches.id as id',
  'branches.center_id as center_id',
  'branches.name as name',
  'branches.address as address',
  'branches.created_at as created_at',
] as const

/** Hien thuc UserBranchesStore bang Kysely tren Postgres THUC (khong mock). */
export function makeUserBranchesStore(db: AppDb): UserBranchesStore {
  return {
    async branchIdsForUser(userId) {
      const rows = await db
        .selectFrom('user_branches')
        .select('branch_id')
        .where('user_id', '=', userId)
        .execute()
      return rows.map((r) => r.branch_id)
    },

    async branchesForUser(userId) {
      return db
        .selectFrom('user_branches')
        .innerJoin('branches', 'branches.id', 'user_branches.branch_id')
        .select(BRANCH_COLUMNS)
        .where('user_branches.user_id', '=', userId)
        .orderBy('branches.created_at', 'asc')
        .execute()
    },

    async userExists(userId) {
      const row = await db
        .selectFrom('users')
        .select('id')
        .where('id', '=', userId)
        .executeTakeFirst()
      return row !== undefined
    },

    async existingBranchIds(ids) {
      if (ids.length === 0) return []
      const rows = await db.selectFrom('branches').select('id').where('id', 'in', ids).execute()
      return rows.map((r) => r.id)
    },

    async replaceUserBranches(userId, branchIds) {
      await db.transaction().execute(async (trx) => {
        await trx.deleteFrom('user_branches').where('user_id', '=', userId).execute()
        if (branchIds.length > 0) {
          await trx
            .insertInto('user_branches')
            .values(branchIds.map((branchId) => ({ user_id: userId, branch_id: branchId })))
            .execute()
        }
      })
    },
  }
}
