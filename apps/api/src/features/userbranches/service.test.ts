import { describe, expect, it } from 'vitest'
import type { BranchRow, UserBranchesStore } from './service.js'
import { getUserBranches, setUserBranches } from './service.js'

function makeFakeStore(opts: { branches?: BranchRow[]; userIds?: string[] } = {}): UserBranchesStore {
  const branches = opts.branches ?? []
  const users = new Set(opts.userIds ?? [])
  const assignments = new Map<string, string[]>()
  return {
    async branchIdsForUser(userId) {
      return assignments.get(userId) ?? []
    },
    async branchesForUser(userId) {
      const ids = assignments.get(userId) ?? []
      return branches.filter((b) => ids.includes(b.id))
    },
    async userExists(userId) {
      return users.has(userId)
    },
    async existingBranchIds(ids) {
      return branches.filter((b) => ids.includes(b.id)).map((b) => b.id)
    },
    async replaceUserBranches(userId, branchIds) {
      assignments.set(userId, [...branchIds])
    },
  }
}

const now = new Date('2026-09-16T00:00:00.000Z')
const B1: BranchRow = { id: 'b1', center_id: 'c1', name: 'CS1', address: null, created_at: now }
const B2: BranchRow = { id: 'b2', center_id: 'c1', name: 'CS2', address: null, created_at: now }

describe('setUserBranches', () => {
  it('rejects an unknown user', async () => {
    const store = makeFakeStore({ branches: [B1], userIds: [] })
    expect(await setUserBranches(store, 'ghost', ['b1'])).toEqual({
      ok: false,
      reason: 'user_not_found',
    })
  })

  it('rejects an unknown branch id', async () => {
    const store = makeFakeStore({ branches: [B1], userIds: ['u1'] })
    expect(await setUserBranches(store, 'u1', ['b1', 'nope'])).toEqual({
      ok: false,
      reason: 'branch_not_found',
    })
  })

  it('assigns branches, then replaces the set (dedup + replace, not append)', async () => {
    const store = makeFakeStore({ branches: [B1, B2], userIds: ['u1'] })

    const first = await setUserBranches(store, 'u1', ['b1', 'b2', 'b1'])
    expect(first.ok).toBe(true)
    if (first.ok) expect(first.branches).toHaveLength(2)

    // Thay the bang tap con -> chi con 1 (khong cong don).
    const second = await setUserBranches(store, 'u1', ['b1'])
    expect(second.ok).toBe(true)
    if (second.ok) expect(second.branches.map((b) => b.id)).toEqual(['b1'])

    expect(await store.branchIdsForUser('u1')).toEqual(['b1'])
  })

  it('allows clearing all assignments with an empty list', async () => {
    const store = makeFakeStore({ branches: [B1], userIds: ['u1'] })
    await setUserBranches(store, 'u1', ['b1'])
    const cleared = await setUserBranches(store, 'u1', [])
    expect(cleared.ok).toBe(true)
    expect(await getUserBranches(store, 'u1')).toEqual([])
  })
})
