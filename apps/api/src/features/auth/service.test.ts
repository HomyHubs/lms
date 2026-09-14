import { describe, expect, it } from 'vitest'
import type { AuthStore, UserRecord } from './service.js'
import {
  hashPassword,
  hashSessionToken,
  login,
  logout,
  resolveSession,
  verifyPassword,
} from './service.js'

/** Store gia lap trong bo nho de test logic ma khong can Postgres. */
function makeFakeStore(users: UserRecord[]): AuthStore {
  const sessions = new Map<string, { userId: string; expiresAt: Date }>()
  return {
    async findUserByPhone(phone) {
      return users.find((u) => u.phone_number === phone)
    },
    async findUserById(id) {
      return users.find((u) => u.id === id)
    },
    async createSession({ tokenHash, userId, expiresAt }) {
      sessions.set(tokenHash, { userId, expiresAt })
    },
    async findSession(tokenHash) {
      return sessions.get(tokenHash)
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash)
    },
  }
}

async function seedUser(): Promise<UserRecord> {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    phone_number: '0901234567',
    password_hash: await hashPassword('secret12'),
    role: 'admin',
  }
}

describe('password hashing', () => {
  it('hashes and verifies a password (never stores plain text)', async () => {
    const hash = await hashPassword('secret12')
    expect(hash).not.toContain('secret12')
    expect(await verifyPassword('secret12', hash)).toBe(true)
    expect(await verifyPassword('wrong-pass', hash)).toBe(false)
  })
})

describe('login', () => {
  it('returns a session for correct credentials', async () => {
    const store = makeFakeStore([await seedUser()])
    const result = await login(store, {
      phoneNumber: '0901234567',
      password: 'secret12',
      ttlSeconds: 3600,
    })
    expect(result).not.toBeNull()
    expect(result?.user.phoneNumber).toBe('0901234567')
    expect(result?.user.role).toBe('admin')
    expect(result?.token).toBeTruthy()
    expect(result?.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('returns null for a wrong password', async () => {
    const store = makeFakeStore([await seedUser()])
    const result = await login(store, {
      phoneNumber: '0901234567',
      password: 'wrong-pass',
      ttlSeconds: 3600,
    })
    expect(result).toBeNull()
  })

  it('returns null for an unknown phone number', async () => {
    const store = makeFakeStore([await seedUser()])
    const result = await login(store, {
      phoneNumber: '0900000000',
      password: 'secret12',
      ttlSeconds: 3600,
    })
    expect(result).toBeNull()
  })
})

describe('session lifecycle', () => {
  it('resolves an active session to its user', async () => {
    const store = makeFakeStore([await seedUser()])
    const result = await login(store, {
      phoneNumber: '0901234567',
      password: 'secret12',
      ttlSeconds: 3600,
    })
    const user = await resolveSession(store, result!.token)
    expect(user?.id).toBe('11111111-1111-1111-1111-111111111111')
  })

  it('rejects an unknown token', async () => {
    const store = makeFakeStore([await seedUser()])
    expect(await resolveSession(store, 'not-a-real-token')).toBeNull()
  })

  it('rejects (and clears) an expired session', async () => {
    const store = makeFakeStore([await seedUser()])
    const result = await login(store, {
      phoneNumber: '0901234567',
      password: 'secret12',
      ttlSeconds: -1, // het han ngay lap tuc
    })
    expect(await resolveSession(store, result!.token)).toBeNull()
    // Sau khi resolve thay het han, phien bi xoa.
    expect(await store.findSession(hashSessionToken(result!.token))).toBeUndefined()
  })

  it('logout removes the session', async () => {
    const store = makeFakeStore([await seedUser()])
    const result = await login(store, {
      phoneNumber: '0901234567',
      password: 'secret12',
      ttlSeconds: 3600,
    })
    await logout(store, result!.token)
    expect(await resolveSession(store, result!.token)).toBeNull()
  })
})
