import type {
  Branch,
  Center,
  CreateBranchRequest,
  CreateCenterRequest,
  UpdateBranchRequest,
  UpdateCenterRequest,
} from '@lms/shared'

/**
 * Logic quan ly Center (trung tam) + Branch (co so) — slice-1 Task 2.
 * Thuan, khong phu thuoc Fastify de test de. 1 Center co nhieu Branch.
 */

/** Ban ghi Center doc tu DB. */
export interface CenterRow {
  id: string
  name: string
  created_at: Date | string
}

/** Ban ghi Branch doc tu DB. */
export interface BranchRow {
  id: string
  center_id: string
  name: string
  address: string | null
  created_at: Date | string
}

export interface CreateCenterFields {
  name: string
}

export interface CreateBranchFields {
  centerId: string
  name: string
  address: string | null
}

export interface UpdateBranchFields {
  name?: string
  address?: string | null
}

/** Cong ra DB ma service can — cho phep test bang cach tiem gia lap. */
export interface CentersStore {
  listCenters: () => Promise<CenterRow[]>
  findCenterById: (id: string) => Promise<CenterRow | undefined>
  createCenter: (input: CreateCenterFields) => Promise<CenterRow>
  updateCenter: (id: string, input: { name: string }) => Promise<CenterRow | undefined>
  deleteCenter: (id: string) => Promise<boolean>

  // `branchIds` undefined = tat ca; mang rong = khong co (dung cho branch-scoped o Task 4).
  listBranches: (branchIds?: string[]) => Promise<BranchRow[]>
  findBranchById: (id: string) => Promise<BranchRow | undefined>
  createBranch: (input: CreateBranchFields) => Promise<BranchRow>
  updateBranch: (id: string, input: UpdateBranchFields) => Promise<BranchRow | undefined>
  deleteBranch: (id: string) => Promise<boolean>
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

function toCenter(row: CenterRow): Center {
  return { id: row.id, name: row.name, createdAt: toIso(row.created_at) }
}

function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    centerId: row.center_id,
    name: row.name,
    address: row.address,
    createdAt: toIso(row.created_at),
  }
}

// ----- Centers -----

export async function listCenters(store: CentersStore): Promise<Center[]> {
  const rows = await store.listCenters()
  return rows.map(toCenter)
}

export async function createCenter(
  store: CentersStore,
  input: CreateCenterRequest,
): Promise<Center> {
  return toCenter(await store.createCenter({ name: input.name }))
}

export type UpdateCenterOutcome = { ok: true; center: Center } | { ok: false; reason: 'not_found' }

export async function updateCenter(
  store: CentersStore,
  id: string,
  input: UpdateCenterRequest,
): Promise<UpdateCenterOutcome> {
  const row = await store.updateCenter(id, { name: input.name })
  return row ? { ok: true, center: toCenter(row) } : { ok: false, reason: 'not_found' }
}

export async function deleteCenter(store: CentersStore, id: string): Promise<boolean> {
  return store.deleteCenter(id)
}

// ----- Branches -----

/** Liet ke Branch. Truyen `branchIds` de gioi han pham vi (branch-scoped, Task 4). */
export async function listBranches(store: CentersStore, branchIds?: string[]): Promise<Branch[]> {
  const rows = await store.listBranches(branchIds)
  return rows.map(toBranch)
}

export async function getBranch(store: CentersStore, id: string): Promise<Branch | null> {
  const row = await store.findBranchById(id)
  return row ? toBranch(row) : null
}

export type CreateBranchOutcome =
  | { ok: true; branch: Branch }
  | { ok: false; reason: 'center_not_found' }

/** Tao Branch moi. Tra `center_not_found` khi Center chua ton tai. */
export async function createBranch(
  store: CentersStore,
  input: CreateBranchRequest,
): Promise<CreateBranchOutcome> {
  const center = await store.findCenterById(input.centerId)
  if (!center) return { ok: false, reason: 'center_not_found' }

  const row = await store.createBranch({
    centerId: input.centerId,
    name: input.name,
    address: input.address ?? null,
  })
  return { ok: true, branch: toBranch(row) }
}

export type UpdateBranchOutcome = { ok: true; branch: Branch } | { ok: false; reason: 'not_found' }

export async function updateBranch(
  store: CentersStore,
  id: string,
  input: UpdateBranchRequest,
): Promise<UpdateBranchOutcome> {
  const fields: UpdateBranchFields = {}
  if (input.name !== undefined) fields.name = input.name
  if (input.address !== undefined) fields.address = input.address

  const row = await store.updateBranch(id, fields)
  return row ? { ok: true, branch: toBranch(row) } : { ok: false, reason: 'not_found' }
}

export async function deleteBranch(store: CentersStore, id: string): Promise<boolean> {
  return store.deleteBranch(id)
}
