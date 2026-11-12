import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import { userBranchesRoutes } from './routes.js'
import type { BranchRow, UserBranchesStore } from './service.js'

const BRANCH_1 = '20000000-0000-0000-0000-000000000001'
const BRANCH_2 = '20000000-0000-0000-0000-000000000002'
const TARGET_USER = '30000000-0000-0000-0000-000000000001'

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

function makeFakeStore(): UserBranchesStore {
  const now = new Date('2026-09-16T00:00:00.000Z')
  const branches: BranchRow[] = [
    { id: BRANCH_1, center_id: 'c1', name: 'CS1', address: null, created_at: now },
    { id: BRANCH_2, center_id: 'c1', name: 'CS2', address: null, created_at: now },
  ]
  const users = new Set([TARGET_USER])
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

const ADMIN: UserRecord = { id: 'admin-1', phone_number: '0900000001', password_hash: 'x', role: 'admin' }
const TEACHER: UserRecord = {
  id: 'teacher-1',
  phone_number: '0900000002',
  password_hash: 'x',
  role: 'teacher',
}
const COOKIE = `${SESSION_COOKIE}=any-token`

async function buildTestApp(
  authUser: UserRecord | null,
  store: UserBranchesStore = makeFakeStore(),
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await userBranchesRoutes(app, { rbac: makeRbac(makeFakeAuthStore(authUser)), userBranchesStore: store })
  await app.ready()
  return app
}

describe('user-branches routes', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET returns 401 without a session and 403 for a non-admin', async () => {
    app = await buildTestApp(null)
    expect(
      (await app.inject({ method: 'GET', url: `/users/${TARGET_USER}/branches` })).statusCode,
    ).toBe(401)
    await app.close()

    app = await buildTestApp(TEACHER)
    const res = await app.inject({
      method: 'GET',
      url: `/users/${TARGET_USER}/branches`,
      headers: { cookie: COOKIE },
    })
    expect(res.statusCode).toBe(403)
  })

  it('PUT assigns branches and GET reflects them', async () => {
    const store = makeFakeStore()
    app = await buildTestApp(ADMIN, store)

    const put = await app.inject({
      method: 'PUT',
      url: `/users/${TARGET_USER}/branches`,
      headers: { cookie: COOKIE },
      payload: { branchIds: [BRANCH_1] },
    })
    expect(put.statusCode).toBe(200)
    expect(put.json().branches).toHaveLength(1)

    const get = await app.inject({
      method: 'GET',
      url: `/users/${TARGET_USER}/branches`,
      headers: { cookie: COOKIE },
    })
    expect(get.json().branches.map((b: { id: string }) => b.id)).toEqual([BRANCH_1])
  })

  it('PUT returns 404 for an unknown user and 400 for an unknown branch', async () => {
    app = await buildTestApp(ADMIN)
    const missingUser = await app.inject({
      method: 'PUT',
      url: '/users/99999999-9999-9999-9999-999999999999/branches',
      headers: { cookie: COOKIE },
      payload: { branchIds: [BRANCH_1] },
    })
    expect(missingUser.statusCode).toBe(404)

    const badBranch = await app.inject({
      method: 'PUT',
      url: `/users/${TARGET_USER}/branches`,
      headers: { cookie: COOKIE },
      payload: { branchIds: ['99999999-9999-9999-9999-999999999999'] },
    })
    expect(badBranch.statusCode).toBe(400)
  })
})
