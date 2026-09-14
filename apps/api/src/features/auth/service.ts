import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { PublicUser } from '@lms/shared'

/**
 * Logic Auth thuan (khong phu thuoc Fastify) de test duoc de dang.
 * Co che: mat khau hash bcrypt; phien la "opaque session" — token ngau nhien,
 * DB chi luu SHA-256 hash cua token (khong luu token tho).
 */

const BCRYPT_ROUNDS = 12

/** Ban ghi user doc tu DB (bao gom password_hash — KHONG tra ra ngoai). */
export interface UserRecord {
  id: string
  phone_number: string
  password_hash: string
  role: string
}

/** Cong ra DB ma service can — cho phep test bang cach tiem gia lap. */
export interface AuthStore {
  findUserByPhone: (phoneNumber: string) => Promise<UserRecord | undefined>
  createSession: (input: {
    tokenHash: string
    userId: string
    expiresAt: Date
  }) => Promise<void>
  findSession: (
    tokenHash: string,
  ) => Promise<{ userId: string; expiresAt: Date } | undefined>
  deleteSession: (tokenHash: string) => Promise<void>
  findUserById: (id: string) => Promise<UserRecord | undefined>
}

/** Bam mat khau bang bcrypt (dung khi seed/tao user). */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/** So sanh mat khau tho voi hash bcrypt. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Sinh token phien tho (opaque, 256-bit) — chi tra cho client mot lan. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Bam token phien de luu DB (khong luu token tho). */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    phoneNumber: user.phone_number,
    // Role duoc rang buoc boi migration; ep kieu ve union cua contract.
    role: user.role as PublicUser['role'],
  }
}

export interface LoginResult {
  token: string
  expiresAt: Date
  user: PublicUser
}

/**
 * Dang nhap: xac thuc SDT + mat khau, tao phien moi.
 * Tra `null` khi sai thong tin (khong phan biet "khong co user" vs "sai mat khau"
 * de tranh lo thong tin liet ke tai khoan).
 */
export async function login(
  store: AuthStore,
  input: { phoneNumber: string; password: string; ttlSeconds: number },
): Promise<LoginResult | null> {
  const user = await store.findUserByPhone(input.phoneNumber)
  if (!user) {
    // Van chay bcrypt tren mot hash gia de chong timing attack liet ke tai khoan.
    await verifyPassword(input.password, DUMMY_HASH)
    return null
  }

  const ok = await verifyPassword(input.password, user.password_hash)
  if (!ok) return null

  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000)
  await store.createSession({
    tokenHash: hashSessionToken(token),
    userId: user.id,
    expiresAt,
  })

  return { token, expiresAt, user: toPublicUser(user) }
}

/** Tra ve user cua phien neu token con hieu luc; nguoc lai `null`. */
export async function resolveSession(
  store: AuthStore,
  token: string,
): Promise<PublicUser | null> {
  const session = await store.findSession(hashSessionToken(token))
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) {
    await store.deleteSession(hashSessionToken(token))
    return null
  }
  const user = await store.findUserById(session.userId)
  return user ? toPublicUser(user) : null
}

/** Dang xuat: xoa phien theo token. */
export async function logout(store: AuthStore, token: string): Promise<void> {
  await store.deleteSession(hashSessionToken(token))
}

/**
 * Hash bcrypt "gia" (cua chuoi rong) de so sanh khi khong tim thay user,
 * giu thoi gian phan hoi tuong duong truong hop co user. Tinh mot lan luc load.
 */
const DUMMY_HASH = bcrypt.hashSync('unused-dummy-password', BCRYPT_ROUNDS)
