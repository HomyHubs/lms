import type { Branch } from '@lms/shared'

/**
 * Logic gan Branch cho User (slice-1 Task 4) — thuan, khong phu thuoc Fastify.
 * Dung de:
 *  - Admin gan/thay tap Branch cua mot User.
 *  - Cung cap `branchIdsForUser` lam nguon "pham vi Branch" (branch scope) cho cac feature khac.
 */

export interface BranchRow {
  id: string
  center_id: string
  name: string
  address: string | null
  created_at: Date | string
}

/**
 * Cong "pham vi Branch": tra ve danh sach id Branch ma mot User duoc phep thay.
 * Cac feature du lieu theo Branch (vi du: Class) dung interface nay de loc.
 */
export interface BranchScope {
  branchIdsForUser: (userId: string) => Promise<string[]>
}

export interface UserBranchesStore extends BranchScope {
  branchesForUser: (userId: string) => Promise<BranchRow[]>
  userExists: (userId: string) => Promise<boolean>
  // Trong so `ids`, tra ve nhung id thuc su ton tai trong bang branches.
  existingBranchIds: (ids: string[]) => Promise<string[]>
  // Thay the toan bo tap Branch cua User (xoa het roi chen lai) trong 1 giao dich.
  replaceUserBranches: (userId: string, branchIds: string[]) => Promise<void>
}

function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    centerId: row.center_id,
    name: row.name,
    address: row.address,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
}

/** Danh sach Branch dang gan cho User. */
export async function getUserBranches(store: UserBranchesStore, userId: string): Promise<Branch[]> {
  const rows = await store.branchesForUser(userId)
  return rows.map(toBranch)
}

export type SetUserBranchesOutcome =
  | { ok: true; branches: Branch[] }
  | { ok: false; reason: 'user_not_found' | 'branch_not_found' }

/**
 * Dat lai tap Branch cua User (thay the). Tra loi khi User khong ton tai
 * hoac co branchId khong hop le (chong gan Branch ma). Loai trung id dau vao.
 */
export async function setUserBranches(
  store: UserBranchesStore,
  userId: string,
  branchIds: string[],
): Promise<SetUserBranchesOutcome> {
  const userOk = await store.userExists(userId)
  if (!userOk) return { ok: false, reason: 'user_not_found' }

  const unique = [...new Set(branchIds)]
  if (unique.length > 0) {
    const existing = await store.existingBranchIds(unique)
    if (existing.length !== unique.length) return { ok: false, reason: 'branch_not_found' }
  }

  await store.replaceUserBranches(userId, unique)
  return { ok: true, branches: await getUserBranches(store, userId) }
}
