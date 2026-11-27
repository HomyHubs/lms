import { describe, expect, it } from 'vitest'
import type { UserRow, UsersStore } from './service.js'
import { createUser, deleteUser, getUser, listUsers, updateUser } from './service.js'

/**
 * slice-26 (ADR 0018): tuoi gio phu thuoc `today`, nen moi test lien quan den tuoi phai truyen
 * ngay co dinh — khong doc dong ho he thong (test se doi ket qua vao dung ngay sinh nhat).
 */
const TODAY = '2026-11-22'

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
      birthDate,
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
        // slice-26 (ADR 0018): ngay sinh day du; null khi chi biet nam sinh.
        birth_date: birthDate,
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
    async assignStudentCode(id, branchCode) {
      // slice-23: store that sinh + ghi trong mot buoc va retry khi trung so thu tu.
      const prefix = branchCode && branchCode.trim() !== '' ? branchCode : 'HV'
      let max = 0
      for (const u of users) {
        if (u.role !== 'student' || !u.student_code?.startsWith(prefix)) continue
        const suffix = u.student_code.slice(prefix.length)
        if (!/^\d+$/.test(suffix)) continue
        const n = Number.parseInt(suffix, 10)
        if (n > max) max = n
      }
      const row = users.find((u) => u.id === id)
      if (!row) return undefined
      row.student_code = `${prefix}${String(max + 1).padStart(4, '0')}`
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
      if (input.birthDate !== undefined) row.birth_date = input.birthDate
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
    const outcome = await createUser(
      store,
      {
        phoneNumber: '0909999999',
        password: 'secret12',
        role: 'student',
        lastName: 'Nguyễn Minh',
        firstName: 'An',
        birthYear: 2015,
        gender: 'male',
        address: '123 Đường ABC',
        parentPhone: '0912345678',
      },
      TODAY,
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.lastName).toBe('Nguyễn Minh')
    expect(outcome.user.firstName).toBe('An')
    expect(outcome.user.birthYear).toBe(2015)
    expect(outcome.user.gender).toBe('male')
    expect(outcome.user.parentPhone).toBe('0912345678')
    // slice-23: hoc vien moi duoc sinh ma tu dong (fallback 'HV' khi chua gan co so).
    expect(outcome.user.studentCode).toBe('HV0001')
    // ADR 0018: chi co nam sinh -> tuoi UOC LUONG = nam hien tai - birthYear.
    expect(outcome.user.age).toBe(2026 - 2015)
    expect(outcome.user.birthDate).toBeNull()
  })

  // ADR 0018: co ngay sinh day du -> tuoi CHINH XAC, da tru truong hop chua toi sinh nhat.
  it('derives an exact age from birthDate (before and after the birthday)', async () => {
    const store = makeFakeStore()
    // Sinh 30/12/2015: hôm nay 22/11/2026 -> chua toi sinh nhat, van 10 tuoi.
    const before = await createUser(
      store,
      { phoneNumber: '0901111001', password: 'secret12', role: 'student', birthDate: '2015-12-30' },
      TODAY,
    )
    // Sinh 30/12/2015 nhung hom nay 31/12/2026 -> da qua sinh nhat, 11 tuoi.
    const after = await createUser(
      store,
      { phoneNumber: '0901111002', password: 'secret12', role: 'student', birthDate: '2015-12-30' },
      '2026-12-31',
    )
    expect(before.ok && after.ok).toBe(true)
    if (!before.ok || !after.ok) return
    expect(before.user.age).toBe(10)
    expect(after.user.age).toBe(11)
    // Nam sinh duoc dan xuat tu ngay sinh, khong phai gia tri gui kem.
    expect(before.user.birthYear).toBe(2015)
    expect(before.user.birthDate).toBe('2015-12-30')
  })

  // slice-26: tuoi CHI tinh cho hoc vien; role khac co birthYear van tra age null.
  it('derives age only for students; other roles get null age even with birthYear', async () => {
    const store = makeFakeStore()
    const student = await createUser(
      store,
      { phoneNumber: '0907777777', password: 'secret12', role: 'student', birthYear: 2010 },
      TODAY,
    )
    const teacher = await createUser(
      store,
      { phoneNumber: '0906666666', password: 'secret12', role: 'teacher', birthYear: 1990 },
      TODAY,
    )
    expect(student.ok && teacher.ok).toBe(true)
    if (!student.ok || !teacher.ok) return
    expect(student.user.age).toBe(2026 - 2010)
    // Giao vien van luu birthYear nhung khong co tuoi (null).
    expect(teacher.user.birthYear).toBe(1990)
    expect(teacher.user.age).toBeNull()
  })

  // ADR 0018: ngay sinh la nguon su thuat -> nam sinh gui kem (neu lech) bi ghi de.
  it('derives birthYear from birthDate instead of trusting a conflicting birthYear', async () => {
    const store = makeFakeStore()
    // Schema chan truong hop nay, nhung tang service van phai dung khi bi goi truc tiep.
    const outcome = await createUser(
      store,
      {
        phoneNumber: '0901111003',
        password: 'secret12',
        role: 'student',
        birthDate: '2015-03-04',
        birthYear: 1999,
      },
      TODAY,
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.birthYear).toBe(2015)
    expect(outcome.user.birthDate).toBe('2015-03-04')
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

  // ADR 0018: dat ngay sinh -> nam sinh dan xuat theo va tuoi thanh chinh xac.
  it('derives birthYear from birthDate when updating', async () => {
    const store = makeFakeStore()
    const created = await createUser(
      store,
      { phoneNumber: '0900000004', password: 'secret12', role: 'student', birthYear: 2015 },
      TODAY,
    )
    if (!created.ok) throw new Error('setup failed')
    expect(created.user.age).toBe(2026 - 2015)

    const outcome = await updateUser(
      store,
      created.user.id,
      { birthDate: '2015-12-30' },
      TODAY,
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.birthDate).toBe('2015-12-30')
    expect(outcome.user.birthYear).toBe(2015)
    // 30/12 chua toi -> 10 tuoi, khong con la uoc luong 11.
    expect(outcome.user.age).toBe(10)
  })

  // ADR 0018: xoa ngay sinh chi quay ve uoc luong, KHONG xoa nam sinh.
  it('keeps birthYear when birthDate is cleared', async () => {
    const store = makeFakeStore()
    const created = await createUser(
      store,
      { phoneNumber: '0900000005', password: 'secret12', role: 'student', birthDate: '2015-12-30' },
      TODAY,
    )
    if (!created.ok) throw new Error('setup failed')
    expect(created.user.age).toBe(10)

    const outcome = await updateUser(store, created.user.id, { birthDate: null }, TODAY)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.user.birthDate).toBeNull()
    expect(outcome.user.birthYear).toBe(2015)
    expect(outcome.user.age).toBe(2026 - 2015)
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
