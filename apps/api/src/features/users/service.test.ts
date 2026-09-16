import { describe, expect, it } from 'vitest'
import type { UserRow, UsersStore } from './service.js'
import { createUser, deleteUser, getUser, listUsers, updateUser } from './service.js'

/** Store gia lap trong bo nho de test logic ma khong can Postgres. */
function makeFakeStore(seed: UserRow[] = []): UsersStore {
  const users: UserRow[] = [...seed]
  let seq = seed.length
  return {
    async listUsers() {
      return [...users]
    },
    async findUserById(id) {
      return users.find((u) => u.id === id)
    },
    async findUserByPhone(phoneNumber) {
      return users.find((u) => u.phone_number === phoneNumber)
    },
    async createUser({ phoneNumber, role, email }) {
      const row: UserRow = {
        id: `u-${(seq += 1)}`,
        phone_number: phoneNumber,
        email,
        role,
        created_at: new Date('2026-09-16T00:00:00.000Z'),
      }
      users.push(row)
      return row
    },
    async updateUser(id, input) {
      const row = users.find((u) => u.id === id)
      if (!row) return undefined
      if (input.role !== undefined) row.role = input.role
      if (input.email !== undefined) row.email = input.email
      return row
    },
    async deleteUser(id) {
      const idx = users.findIndex((u) => u.id === id)
      if (idx < 0) return false
      users.splice(idx, 1)
      return true
    },
  }
}

describe('createUser', () => {
  it('creates a user with the given role and never returns a password field', async () => {
    const store = makeFakeStore()
    const outcome = await createUser(store, {
      phoneNumber: '0901234567',
      password: 'secret12',
      role: 'teacher',
      email: 'teacher@example.com',
    })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.phoneNumber).toBe('0901234567')
    expect(outcome.user.role).toBe('teacher')
    expect('password' in outcome.user).toBe(false)
    expect('password_hash' in outcome.user).toBe(false)
  })

  it('rejects a duplicate phone number', async () => {
    const store = makeFakeStore()
    await createUser(store, { phoneNumber: '0901234567', password: 'secret12', role: 'admin' })
    const outcome = await createUser(store, {
      phoneNumber: '0901234567',
      password: 'another8x',
      role: 'student',
    })
    expect(outcome).toEqual({ ok: false, reason: 'phone_taken' })
  })
})

describe('listUsers / getUser', () => {
  it('lists all users and finds one by id', async () => {
    const store = makeFakeStore()
    const created = await createUser(store, {
      phoneNumber: '0900000001',
      password: 'secret12',
      role: 'staff',
    })
    if (!created.ok) throw new Error('setup failed')

    const all = await listUsers(store)
    expect(all).toHaveLength(1)

    const found = await getUser(store, created.user.id)
    expect(found?.role).toBe('staff')
    expect(await getUser(store, 'missing')).toBeNull()
  })
})

describe('updateUser', () => {
  it('changes the role of an existing user', async () => {
    const store = makeFakeStore()
    const created = await createUser(store, {
      phoneNumber: '0900000002',
      password: 'secret12',
      role: 'student',
    })
    if (!created.ok) throw new Error('setup failed')

    const outcome = await updateUser(store, created.user.id, { role: 'teacher' })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.role).toBe('teacher')
  })

  it('returns not_found for an unknown id', async () => {
    const store = makeFakeStore()
    const outcome = await updateUser(store, 'missing', { role: 'admin' })
    expect(outcome).toEqual({ ok: false, reason: 'not_found' })
  })
})

describe('deleteUser', () => {
  it('deletes an existing user and reports missing ones', async () => {
    const store = makeFakeStore()
    const created = await createUser(store, {
      phoneNumber: '0900000003',
      password: 'secret12',
      role: 'admin',
    })
    if (!created.ok) throw new Error('setup failed')

    expect(await deleteUser(store, created.user.id)).toBe(true)
    expect(await deleteUser(store, created.user.id)).toBe(false)
  })
})
