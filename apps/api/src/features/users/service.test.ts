import { describe, expect, it } from 'vitest'
import type { UserRow, UsersStore } from './service.js'
import { createUser, deleteUser, getUser, listUsers, updateUser } from './service.js'

/** Store gia lap trong bo nho de test logic ma khong can Postgres. */
function makeFakeStore(
  seed: UserRow[] = [],
  // slice-23: tien to co so cho tung user (de test sinh ma theo branch.code); mac dinh rong -> 'HV'.
  branchCodes: Record<string, string | null> = {},
): UsersStore {
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
    async createUser({
      phoneNumber,
      role,
      email,
      lastName,
      firstName,
      birthYear,
      gender,
      address,
      parentPhone,
    }) {
      const row: UserRow = {
        id: `u-${(seq += 1)}`,
        phone_number: phoneNumber,
        email,
        role,
        last_name: lastName,
        first_name: firstName,
        birth_year: birthYear,
        gender,
        address,
        parent_phone: parentPhone,
        // slice-23: ma chua sinh luc insert; service se goi setStudentCode cho role hoc vien.
        student_code: null,
        created_at: new Date('2026-09-16T00:00:00.000Z'),
      }
      users.push(row)
      return row
    },
    async findUserByStudentCode(code) {
      return users.find((u) => u.student_code === code)
    },
    async nextStudentCode(branchCode) {
      // slice-23: gia lap sinh ma theo prefix (fallback 'HV') + so thu tu lon nhat + 1.
      const prefix = branchCode && branchCode.trim() !== '' ? branchCode : 'HV'
      let max = 0
      for (const u of users) {
        if (u.role !== 'student' || !u.student_code?.startsWith(prefix)) continue
        const suffix = u.student_code.slice(prefix.length)
        if (!/^\d+$/.test(suffix)) continue
        const n = Number.parseInt(suffix, 10)
        if (n > max) max = n
      }
      return `${prefix}${String(max + 1).padStart(4, '0')}`
    },
    async setStudentCode(id, code) {
      const row = users.find((u) => u.id === id)
      if (!row) return undefined
      row.student_code = code
      return row
    },
    async branchCodeForUser(userId) {
      // slice-23: tien to co so gan cho user (test tiem qua `branchCodes`); null -> fallback 'HV'.
      return branchCodes[userId] ?? null
    },
    async updateUser(id, input) {
      const row = users.find((u) => u.id === id)
      if (!row) return undefined
      if (input.role !== undefined) row.role = input.role
      if (input.email !== undefined) row.email = input.email
      if (input.lastName !== undefined) row.last_name = input.lastName
      if (input.firstName !== undefined) row.first_name = input.firstName
      if (input.birthYear !== undefined) row.birth_year = input.birthYear
      if (input.gender !== undefined) row.gender = input.gender
      if (input.address !== undefined) row.address = input.address
      if (input.parentPhone !== undefined) row.parent_phone = input.parentPhone
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

  it('stores the student profile fields and derives age from birthYear', async () => {
    const store = makeFakeStore()
    const outcome = await createUser(store, {
      phoneNumber: '0909999999',
      password: 'secret12',
      role: 'student',
      lastName: 'Nguyễn Minh',
      firstName: 'An',
      birthYear: 2015,
      gender: 'male',
      address: '123 Đường ABC',
      parentPhone: '0912345678',
    })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.lastName).toBe('Nguyễn Minh')
    expect(outcome.user.firstName).toBe('An')
    expect(outcome.user.birthYear).toBe(2015)
    expect(outcome.user.gender).toBe('male')
    expect(outcome.user.parentPhone).toBe('0912345678')
    // slice-23: hoc vien moi duoc sinh ma tu dong (fallback 'HV' khi chua gan co so).
    expect(outcome.user.studentCode).toBe('HV0001')
    // Tuoi = nam hien tai - birthYear (tinh tu dong o backend).
    expect(outcome.user.age).toBe(new Date().getFullYear() - 2015)
  })

  it('leaves profile fields null and age null when not provided', async () => {
    const store = makeFakeStore()
    const outcome = await createUser(store, {
      phoneNumber: '0908888888',
      password: 'secret12',
      role: 'student',
    })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.lastName).toBeNull()
    expect(outcome.user.firstName).toBeNull()
    expect(outcome.user.birthYear).toBeNull()
    expect(outcome.user.age).toBeNull()
  })

  // slice-23: sinh ma hoc vien tu dong + map studentCode; role khac khong co ma.
  it('auto-generates a studentCode for a student using the branch prefix', async () => {
    const store = makeFakeStore([], { 'u-1': 'HN' })
    const outcome = await createUser(store, {
      phoneNumber: '0909999001',
      password: 'secret12',
      role: 'student',
    })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    // Tien to theo branch.code cua co so da gan ('HN'), so thu tu zero-pad 4 chu so.
    expect(outcome.user.studentCode).toBe('HN0001')
  })

  it('leaves studentCode null for a non-student role', async () => {
    const store = makeFakeStore()
    const outcome = await createUser(store, {
      phoneNumber: '0909999002',
      password: 'secret12',
      role: 'teacher',
    })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.studentCode).toBeNull()
  })

  it('finds a student by their generated studentCode', async () => {
    const store = makeFakeStore()
    const created = await createUser(store, {
      phoneNumber: '0909999003',
      password: 'secret12',
      role: 'student',
    })
    if (!created.ok) throw new Error('setup failed')
    const code = created.user.studentCode
    expect(code).not.toBeNull()
    const found = await store.findUserByStudentCode(code!)
    expect(found?.id).toBe(created.user.id)
    expect(await store.findUserByStudentCode('KHONG-CO')).toBeUndefined()
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
