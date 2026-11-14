import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { usersRoutes } from './routes.js'
import type { UserRow, UsersStore } from './service.js'

/**
 * Auth store gia lap: bat ky token nao cung resolve ve `sessionUser` (neu co).
 * Du de kiem tra RBAC guard ma khong can co che bam token that.
 */
function makeFakeAuthStore(sessionUser: UserRecord | null): AuthStore {
  return {
    async findUserByPhone() {
      return undefined
    },
    async findUserById(id) {
      return sessionUser && sessionUser.id === id ? sessionUser : undefined
    },
    async createSession() {},
    async findSession() {
      if (!sessionUser) return undefined
      return { userId: sessionUser.id, expiresAt: new Date(Date.now() + 3_600_000) }
    },
    async deleteSession() {},
  }
}

/** UsersStore gia lap trong bo nho. */
function makeFakeUsersStore(seed: UserRow[] = []): UsersStore {
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
        // slice-23: ma chua sinh luc insert; service goi setStudentCode cho role hoc vien.
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
    async branchCodeForUser() {
      // slice-23: khong gan co so trong store gia lap -> fallback prefix 'HV'.
      return null
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

const ADMIN: UserRecord = {
  id: 'admin-1',
  phone_number: '0900000001',
  password_hash: 'x',
  role: 'admin',
}
const TEACHER: UserRecord = {
  id: 'teacher-1',
  phone_number: '0900000002',
  password_hash: 'x',
  role: 'teacher',
}

async function buildTestApp(
  authUser: UserRecord | null,
  usersStore: UsersStore = makeFakeUsersStore(),
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await usersRoutes(app, { authStore: makeFakeAuthStore(authUser), usersStore })
  await app.ready()
  return app
}

const ADMIN_COOKIE = `${SESSION_COOKIE}=any-token`

describe('users routes — RBAC guard', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET /users returns 401 without a session', async () => {
    app = await buildTestApp(null)
    const res = await app.inject({ method: 'GET', url: '/users' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /users returns 403 for a non-admin (teacher)', async () => {
    app = await buildTestApp(TEACHER)
    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { cookie: `${SESSION_COOKIE}=any-token` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('GET /users returns the list for an admin', async () => {
    const store = makeFakeUsersStore([
      {
        id: 'u-1',
        phone_number: '0911111111',
        email: null,
        role: 'student',
        last_name: 'Nguyễn Minh',
        first_name: 'An',
        birth_year: 2015,
        gender: 'male',
        address: null,
        parent_phone: '0912345678',
        student_code: 'HV0001',
        created_at: new Date('2026-09-16T00:00:00.000Z'),
      },
    ])
    app = await buildTestApp(ADMIN, store)
    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { cookie: ADMIN_COOKIE },
    })
    expect(res.statusCode).toBe(200)
    const users = res.json().users
    expect(users).toHaveLength(1)
    // Ho so hoc vien tra ve dung, age tinh tu dong.
    expect(users[0].lastName).toBe('Nguyễn Minh')
    expect(users[0].firstName).toBe('An')
    expect(users[0].age).toBe(new Date().getFullYear() - 2015)
    // slice-23: ma hoc vien rong duoc tra ra (SAFE_COLUMNS gom student_code).
    expect(users[0].studentCode).toBe('HV0001')
  })

  it('POST /users creates a student with profile fields and derives age', async () => {
    app = await buildTestApp(ADMIN)
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie: ADMIN_COOKIE },
      payload: {
        phoneNumber: '0912345670',
        password: 'secret12',
        role: 'student',
        lastName: 'Trần Thị',
        firstName: 'Bình',
        birthYear: 2016,
        gender: 'female',
        parentPhone: '0987654321',
      },
    })
    expect(res.statusCode).toBe(201)
    const user = res.json().user
    expect(user.lastName).toBe('Trần Thị')
    expect(user.firstName).toBe('Bình')
    expect(user.gender).toBe('female')
    expect(user.age).toBe(new Date().getFullYear() - 2016)
  })
})

describe('users routes — CRUD (admin only)', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('POST /users creates a user (201) for an admin', async () => {
    app = await buildTestApp(ADMIN)
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie: ADMIN_COOKIE },
      payload: { phoneNumber: '0912345678', password: 'secret12', role: 'teacher' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().user.role).toBe('teacher')
  })

  it('POST /users returns 403 for a non-admin', async () => {
    app = await buildTestApp(TEACHER)
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie: `${SESSION_COOKIE}=any-token` },
      payload: { phoneNumber: '0912345678', password: 'secret12', role: 'student' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('POST /users returns 400 for a malformed body', async () => {
    app = await buildTestApp(ADMIN)
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { cookie: ADMIN_COOKIE },
      payload: { phoneNumber: 'nope', password: 'x', role: 'wizard' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PATCH /users/:id updates the role', async () => {
    const store = makeFakeUsersStore([
      {
        id: 'u-1',
        phone_number: '0911111111',
        email: null,
        role: 'student',
        last_name: null,
        first_name: null,
        birth_year: null,
        gender: null,
        address: null,
        parent_phone: null,
        student_code: null,
        created_at: new Date('2026-09-16T00:00:00.000Z'),
      },
    ])
    app = await buildTestApp(ADMIN, store)
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/u-1',
      headers: { cookie: ADMIN_COOKIE },
      payload: { role: 'teacher' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.role).toBe('teacher')
  })

  it('DELETE /users/:id returns 204, then 404 for a missing user', async () => {
    const store = makeFakeUsersStore([
      {
        id: 'u-1',
        phone_number: '0911111111',
        email: null,
        role: 'student',
        last_name: null,
        first_name: null,
        birth_year: null,
        gender: null,
        address: null,
        parent_phone: null,
        student_code: null,
        created_at: new Date('2026-09-16T00:00:00.000Z'),
      },
    ])
    app = await buildTestApp(ADMIN, store)
    const del = await app.inject({
      method: 'DELETE',
      url: '/users/u-1',
      headers: { cookie: ADMIN_COOKIE },
    })
    expect(del.statusCode).toBe(204)

    const again = await app.inject({
      method: 'DELETE',
      url: '/users/u-1',
      headers: { cookie: ADMIN_COOKIE },
    })
    expect(again.statusCode).toBe(404)
  })
})
