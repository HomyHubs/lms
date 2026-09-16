import { z } from 'zod'
import { Branch } from './centers.js'

/**
 * Contract gan Branch cho User (slice-1 Task 4) dung chung FE-BE.
 * Mot User co the duoc gan 0..n Branch; du lieu theo Branch chi hien trong pham vi duoc gan.
 */

/** Dat lai toan bo tap Branch cua mot User (thay the, khong cong don). */
export const SetUserBranchesRequest = z.object({
  branchIds: z.array(z.string().uuid()),
})
export type SetUserBranchesRequest = z.infer<typeof SetUserBranchesRequest>

/** Danh sach Branch dang duoc gan cho mot User. */
export const UserBranchesResponse = z.object({
  branches: z.array(Branch),
})
export type UserBranchesResponse = z.infer<typeof UserBranchesResponse>
