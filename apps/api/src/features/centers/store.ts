import type { AppDb } from '../../platform/db.js'
import type { CentersStore } from './service.js'

const CENTER_COLUMNS = ['id', 'name', 'created_at'] as const
const BRANCH_COLUMNS = ['id', 'center_id', 'name', 'address', 'created_at'] as const

/** Hien thuc CentersStore bang Kysely tren Postgres THUC (khong mock). */
export function makeCentersStore(db: AppDb): CentersStore {
  return {
    async listCenters() {
      return db.selectFrom('centers').select(CENTER_COLUMNS).orderBy('created_at', 'asc').execute()
    },

    async findCenterById(id) {
      return db.selectFrom('centers').select(CENTER_COLUMNS).where('id', '=', id).executeTakeFirst()
    },

    async createCenter({ name }) {
      return db
        .insertInto('centers')
        .values({ name })
        .returning(CENTER_COLUMNS)
        .executeTakeFirstOrThrow()
    },

    async updateCenter(id, { name }) {
      return db
        .updateTable('centers')
        .set({ name, updated_at: new Date().toISOString() })
        .where('id', '=', id)
        .returning(CENTER_COLUMNS)
        .executeTakeFirst()
    },

    async deleteCenter(id) {
      const res = await db.deleteFrom('centers').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },

    async listBranches(branchIds) {
      // Mang rong = khong co Branch nao trong pham vi (tranh SQL `in ()` khong hop le).
      if (branchIds && branchIds.length === 0) return []
      let query = db.selectFrom('branches').select(BRANCH_COLUMNS).orderBy('created_at', 'asc')
      if (branchIds) query = query.where('id', 'in', branchIds)
      return query.execute()
    },

    async findBranchById(id) {
      return db.selectFrom('branches').select(BRANCH_COLUMNS).where('id', '=', id).executeTakeFirst()
    },

    async createBranch({ centerId, name, address }) {
      return db
        .insertInto('branches')
        .values({ center_id: centerId, name, address })
        .returning(BRANCH_COLUMNS)
        .executeTakeFirstOrThrow()
    },

    async updateBranch(id, input) {
      return db
        .updateTable('branches')
        .set({
          updated_at: new Date().toISOString(),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
        })
        .where('id', '=', id)
        .returning(BRANCH_COLUMNS)
        .executeTakeFirst()
    },

    async deleteBranch(id) {
      const res = await db.deleteFrom('branches').where('id', '=', id).executeTakeFirst()
      return (res.numDeletedRows ?? 0n) > 0n
    },
  }
}
