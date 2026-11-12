import { randomUUID } from 'node:crypto'
import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from '../auth/index.js'
import { SESSION_COOKIE } from '../auth/index.js'
import { makeRbac } from '../access/index.js'
import { centersRoutes } from './routes.js'
import type { BranchRow, CentersStore, CenterRow } from './service.js'

/** Auth store gia lap: bat ky token nao cung resolve ve `sessionUser` (neu co). */
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

/** CentersStore gia lap trong bo nho. */
function makeFakeCentersStore(seedCenters: CenterRow[] = []): CentersStore {
  const centers: CenterRow[] = [...seedCenters]
  const branches: BranchRow[] = []
  const now = new Date('2026-09-16T00:00:00.000Z')
  return {
    async listCenters() {
      return [...centers]
    },
    async findCenterById(id) {
      return centers.find((c) => c.id === id)
    },
    async createCenter({ name }) {
      const row: CenterRow = { id: randomUUID(), name, created_at: now }
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
      const row: BranchRow = {
        id: randomUUID(),
        center_id: centerId,
        name,
        address,
        created_at: now,
      }
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
  centersStore: CentersStore = makeFakeCentersStore(),
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(cookie)
  await centersRoutes(app, { rbac: makeRbac(makeFakeAuthStore(authUser)), centersStore })
  await app.ready()
  return app
}

describe('centers routes — RBAC guard', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('GET /centers returns 401 without a session', async () => {
    app = await buildTestApp(null)
    const res = await app.inject({ method: 'GET', url: '/centers' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /centers returns 403 for a non-admin', async () => {
    app = await buildTestApp(TEACHER)
    const res = await app.inject({ method: 'GET', url: '/centers', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(403)
  })

  it('GET /centers returns the list for an admin', async () => {
    app = await buildTestApp(ADMIN)
    const res = await app.inject({ method: 'GET', url: '/centers', headers: { cookie: COOKIE } })
    expect(res.statusCode).toBe(200)
    expect(res.json().centers).toEqual([])
  })
})

describe('centers routes — Center + Branch CRUD (admin only)', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    if (app) await app.close()
    app = undefined
  })

  it('POST /centers creates a center (201)', async () => {
    app = await buildTestApp(ADMIN)
    const res = await app.inject({
      method: 'POST',
      url: '/centers',
      headers: { cookie: COOKIE },
      payload: { name: 'Trung tam 1' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().center.name).toBe('Trung tam 1')
  })

  it('POST /branches returns 400 when the center does not exist', async () => {
    app = await buildTestApp(ADMIN)
    const res = await app.inject({
      method: 'POST',
      url: '/branches',
      headers: { cookie: COOKIE },
      payload: { centerId: '11111111-1111-1111-1111-111111111111', name: 'CS1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('creates a branch under an existing center and lists it', async () => {
    const store = makeFakeCentersStore()
    app = await buildTestApp(ADMIN, store)

    const center = await app.inject({
      method: 'POST',
      url: '/centers',
      headers: { cookie: COOKIE },
      payload: { name: 'TT' },
    })
    const centerId = center.json().center.id as string

    const branch = await app.inject({
      method: 'POST',
      url: '/branches',
      headers: { cookie: COOKIE },
      payload: { centerId, name: 'CS1' },
    })
    expect(branch.statusCode).toBe(201)
    expect(branch.json().branch.centerId).toBe(centerId)

    const list = await app.inject({ method: 'GET', url: '/branches', headers: { cookie: COOKIE } })
    expect(list.json().branches).toHaveLength(1)
  })

  it('POST /branches returns 403 for a non-admin', async () => {
    app = await buildTestApp(TEACHER)
    const res = await app.inject({
      method: 'POST',
      url: '/branches',
      headers: { cookie: COOKIE },
      payload: { centerId: '11111111-1111-1111-1111-111111111111', name: 'CS1' },
    })
    expect(res.statusCode).toBe(403)
  })
})
