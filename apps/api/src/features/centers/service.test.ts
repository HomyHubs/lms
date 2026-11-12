import { describe, expect, it } from 'vitest'
import type { BranchRow, CentersStore, CenterRow } from './service.js'
import {
  createBranch,
  createCenter,
  deleteBranch,
  deleteCenter,
  listBranches,
  listCenters,
  updateBranch,
  updateCenter,
} from './service.js'

/** Store gia lap trong bo nho de test logic ma khong can Postgres. */
function makeFakeStore(): CentersStore {
  const centers: CenterRow[] = []
  const branches: BranchRow[] = []
  let seq = 0
  const now = new Date('2026-09-16T00:00:00.000Z')
  return {
    async listCenters() {
      return [...centers]
    },
    async findCenterById(id) {
      return centers.find((c) => c.id === id)
    },
    async createCenter({ name }) {
      const row: CenterRow = { id: `c-${(seq += 1)}`, name, created_at: now }
      centers.push(row)
      return row
    },
    async updateCenter(id, { name }) {
      const row = centers.find((c) => c.id === id)
      if (!row) return undefined
      row.name = name
      return row
    },
    async deleteCenter(id) {
      const idx = centers.findIndex((c) => c.id === id)
      if (idx < 0) return false
      centers.splice(idx, 1)
      return true
    },
    async listBranches(branchIds) {
      if (branchIds && branchIds.length === 0) return []
      const all = [...branches]
      return branchIds ? all.filter((b) => branchIds.includes(b.id)) : all
    },
    async findBranchById(id) {
      return branches.find((b) => b.id === id)
    },
    async createBranch({ centerId, name, address }) {
      const row: BranchRow = { id: `b-${(seq += 1)}`, center_id: centerId, name, address, created_at: now }
      branches.push(row)
      return row
    },
    async updateBranch(id, input) {
      const row = branches.find((b) => b.id === id)
      if (!row) return undefined
      if (input.name !== undefined) row.name = input.name
      if (input.address !== undefined) row.address = input.address
      return row
    },
    async deleteBranch(id) {
      const idx = branches.findIndex((b) => b.id === id)
      if (idx < 0) return false
      branches.splice(idx, 1)
      return true
    },
  }
}

describe('centers', () => {
  it('creates, lists, updates and deletes a center', async () => {
    const store = makeFakeStore()
    const center = await createCenter(store, { name: 'Trung tam 1' })
    expect(center.name).toBe('Trung tam 1')

    expect(await listCenters(store)).toHaveLength(1)

    const updated = await updateCenter(store, center.id, { name: 'Trung tam A' })
    expect(updated.ok).toBe(true)
    if (updated.ok) expect(updated.center.name).toBe('Trung tam A')

    expect(await updateCenter(store, 'missing', { name: 'x' })).toEqual({
      ok: false,
      reason: 'not_found',
    })

    expect(await deleteCenter(store, center.id)).toBe(true)
    expect(await deleteCenter(store, center.id)).toBe(false)
  })
})

describe('branches', () => {
  it('rejects creating a branch under a missing center', async () => {
    const store = makeFakeStore()
    const outcome = await createBranch(store, { centerId: 'nope', name: 'CS1' })
    expect(outcome).toEqual({ ok: false, reason: 'center_not_found' })
  })

  it('creates a branch bound to a center and lists it', async () => {
    const store = makeFakeStore()
    const center = await createCenter(store, { name: 'TT' })
    const outcome = await createBranch(store, { centerId: center.id, name: 'CS1', address: 'Q1' })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.branch.centerId).toBe(center.id)
    expect(outcome.branch.address).toBe('Q1')
    expect(await listBranches(store)).toHaveLength(1)
  })

  it('scopes the branch list to the given ids (branch-scoped)', async () => {
    const store = makeFakeStore()
    const center = await createCenter(store, { name: 'TT' })
    const b1 = await createBranch(store, { centerId: center.id, name: 'CS1' })
    await createBranch(store, { centerId: center.id, name: 'CS2' })
    if (!b1.ok) throw new Error('setup failed')

    expect(await listBranches(store, [b1.branch.id])).toHaveLength(1)
    expect(await listBranches(store, [])).toHaveLength(0)
    expect(await listBranches(store)).toHaveLength(2)
  })

  it('updates and deletes a branch', async () => {
    const store = makeFakeStore()
    const center = await createCenter(store, { name: 'TT' })
    const created = await createBranch(store, { centerId: center.id, name: 'CS1' })
    if (!created.ok) throw new Error('setup failed')

    const updated = await updateBranch(store, created.branch.id, { name: 'CS1-moi' })
    expect(updated.ok).toBe(true)
    if (updated.ok) expect(updated.branch.name).toBe('CS1-moi')

    expect(await deleteBranch(store, created.branch.id)).toBe(true)
    expect(await deleteBranch(store, created.branch.id)).toBe(false)
  })
})
