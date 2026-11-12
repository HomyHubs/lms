import { z } from 'zod'

/**
 * Contract quan ly Center (trung tam) + Branch (co so) — slice-1 Task 2. Dung chung FE-BE.
 * Quan he: 1 Center co nhieu Branch (branch.centerId tro ve center.id).
 */

/** Ten hien thi chung: bat buoc, khong rong, gioi han do dai hop ly. */
const Name = z.string().trim().min(1, 'Ten khong duoc de trong').max(200)

/** Dia chi co so: tuy chon, gioi han do dai. */
const Address = z.string().trim().max(500)

export const Center = z.object({
  id: z.string().uuid(),
  name: z.string(),
  // ISO-8601 timestamp (created_at).
  createdAt: z.string(),
})
export type Center = z.infer<typeof Center>

export const CreateCenterRequest = z.object({ name: Name })
export type CreateCenterRequest = z.infer<typeof CreateCenterRequest>

export const UpdateCenterRequest = z.object({ name: Name })
export type UpdateCenterRequest = z.infer<typeof UpdateCenterRequest>

export const CenterList = z.object({ centers: z.array(Center) })
export type CenterList = z.infer<typeof CenterList>

export const CenterResponse = z.object({ center: Center })
export type CenterResponse = z.infer<typeof CenterResponse>

export const Branch = z.object({
  id: z.string().uuid(),
  centerId: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  createdAt: z.string(),
})
export type Branch = z.infer<typeof Branch>

/** Tao Branch moi: bat buoc thuoc mot Center; dia chi tuy chon. */
export const CreateBranchRequest = z.object({
  centerId: z.string().uuid(),
  name: Name,
  address: Address.optional(),
})
export type CreateBranchRequest = z.infer<typeof CreateBranchRequest>

/** Cap nhat Branch: moi truong tuy chon, phai co it nhat 1 truong. */
export const UpdateBranchRequest = z
  .object({
    name: Name.optional(),
    address: Address.nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.address !== undefined, {
    message: 'Can it nhat mot truong de cap nhat',
  })
export type UpdateBranchRequest = z.infer<typeof UpdateBranchRequest>

export const BranchList = z.object({ branches: z.array(Branch) })
export type BranchList = z.infer<typeof BranchList>

export const BranchResponse = z.object({ branch: Branch })
export type BranchResponse = z.infer<typeof BranchResponse>
