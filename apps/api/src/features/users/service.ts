import type { AdminUser, CreateUserRequest, Gender, UpdateUserRequest, UserRole } from '@lms/shared'
import { hashPassword } from '../auth/index.js'

/**
 * Logic quan ly nguoi dung (slice-1 Task 1) — thuan, khong phu thuoc Fastify de test de.
 * RBAC theo role that: chi Admin duoc CRUD user (thuc thi o tang route qua guard).
 * KHONG bao gio tra `password_hash` ra ngoai (map sang AdminUser an toan).
 */

/** Ban ghi user doc tu DB (KHONG kem password_hash — chi cac cot an toan). */
export interface UserRow {
  id: string
  phone_number: string
  email: string | null
  role: string
  // Ho so hoc vien (nullable). `gender` la string tho tu DB — ep ve union khi map.
  last_name: string | null
  first_name: string | null
  birth_year: number | null
  gender: string | null
  address: string | null
  parent_phone: string | null
  // slice-23: ma hoc vien (nullable). Chi hoc vien moi co ma; role khac luon null.
  student_code: string | null
  created_at: Date | string
}

/** Du lieu tao user o tang store (password da bam san). */
export interface CreateUserFields {
  phoneNumber: string
  passwordHash: string
  role: UserRole
  email: string | null
  lastName: string | null
  firstName: string | null
  birthYear: number | null
  gender: Gender | null
  address: string | null
  parentPhone: string | null
}

/** Du lieu cap nhat user o tang store (chi cac truong duoc doi). */
export interface UpdateUserFields {
  role?: UserRole
  email?: string | null
  passwordHash?: string
  lastName?: string | null
  firstName?: string | null
  birthYear?: number | null
  gender?: Gender | null
  address?: string | null
  parentPhone?: string | null
}

/** Cong ra DB ma service can — cho phep test bang cach tiem gia lap. */
export interface UsersStore {
  listUsers: () => Promise<UserRow[]>
  findUserById: (id: string) => Promise<UserRow | undefined>
  findUserByPhone: (phoneNumber: string) => Promise<UserRow | undefined>
  createUser: (input: CreateUserFields) => Promise<UserRow>
  updateUser: (id: string, input: UpdateUserFields) => Promise<UserRow | undefined>
  deleteUser: (id: string) => Promise<boolean>
  // slice-23: tim hoc vien theo ma (khop import diem).
  findUserByStudentCode: (code: string) => Promise<UserRow | undefined>
  // slice-23: sinh ma hoc vien ke tiep theo tien to co so (null -> fallback 'HV').
  nextStudentCode: (branchCode: string | null) => Promise<string>
  // slice-23: ghi ma hoc vien sau khi tao (chi goi cho role hoc vien).
  setStudentCode: (id: string, code: string) => Promise<UserRow | undefined>
  // slice-23: tien to co so (branches.code) cua co so gan som nhat cho user; null khi chua gan / chua co ma.
  branchCodeForUser: (userId: string) => Promise<string | null>
}

function toAdminUser(row: UserRow): AdminUser {
  const birthYear = row.birth_year
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    email: row.email,
    // Role duoc rang buoc boi CHECK constraint; ep ve union cua contract.
    role: row.role as UserRole,
    lastName: row.last_name,
    firstName: row.first_name,
    birthYear,
    // `gender` rang buoc boi CHECK constraint; ep ve union cua contract (hoac null).
    gender: row.gender as Gender | null,
    address: row.address,
    parentPhone: row.parent_phone,
    // slice-23: ma hoc vien (chi doc); null voi role khac hoc vien / hoc vien chua co ma.
    studentCode: row.student_code,
    // Tuoi tinh tu dong: nam hien tai - birthYear; null khi thieu birthYear.
    age: birthYear != null ? new Date().getFullYear() - birthYear : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
}

export async function listUsers(store: UsersStore): Promise<AdminUser[]> {
  const rows = await store.listUsers()
  return rows.map(toAdminUser)
}

export async function getUser(store: UsersStore, id: string): Promise<AdminUser | null> {
  const row = await store.findUserById(id)
  return row ? toAdminUser(row) : null
}

export type CreateUserOutcome = { ok: true; user: AdminUser } | { ok: false; reason: 'phone_taken' }

/** Tao user moi. Tra `phone_taken` khi SDT da ton tai (unique). */
export async function createUser(
  store: UsersStore,
  input: CreateUserRequest,
): Promise<CreateUserOutcome> {
  const existing = await store.findUserByPhone(input.phoneNumber)
  if (existing) return { ok: false, reason: 'phone_taken' }

  const passwordHash = await hashPassword(input.password)
  const row = await store.createUser({
    phoneNumber: input.phoneNumber,
    passwordHash,
    role: input.role,
    email: input.email ?? null,
    // Thieu truong ho so -> luu null (khong pha user cu / role khac).
    lastName: input.lastName ?? null,
    firstName: input.firstName ?? null,
    birthYear: input.birthYear ?? null,
    gender: input.gender ?? null,
    address: input.address ?? null,
    parentPhone: input.parentPhone ?? null,
  })
  // slice-23: chi hoc vien moi duoc sinh ma; role khac giu student_code = null.
  // Sinh sau insert de co id -> tra cuu tien to co so da gan; ghi lai qua setStudentCode.
  if (row.role === 'student' && row.student_code == null) {
    const branchCode = await store.branchCodeForUser(row.id)
    const code = await store.nextStudentCode(branchCode)
    const updated = await store.setStudentCode(row.id, code)
    if (updated) return { ok: true, user: toAdminUser(updated) }
  }
  return { ok: true, user: toAdminUser(row) }
}

export type UpdateUserOutcome = { ok: true; user: AdminUser } | { ok: false; reason: 'not_found' }

/** Cap nhat user (role/email/password + ho so). Tra `not_found` khi id khong ton tai. */
export async function updateUser(
  store: UsersStore,
  id: string,
  input: UpdateUserRequest,
): Promise<UpdateUserOutcome> {
  const fields: UpdateUserFields = {}
  if (input.role !== undefined) fields.role = input.role
  if (input.email !== undefined) fields.email = input.email
  if (input.password !== undefined) fields.passwordHash = await hashPassword(input.password)
  if (input.lastName !== undefined) fields.lastName = input.lastName
  if (input.firstName !== undefined) fields.firstName = input.firstName
  if (input.birthYear !== undefined) fields.birthYear = input.birthYear
  if (input.gender !== undefined) fields.gender = input.gender
  if (input.address !== undefined) fields.address = input.address
  if (input.parentPhone !== undefined) fields.parentPhone = input.parentPhone

  const row = await store.updateUser(id, fields)
  return row ? { ok: true, user: toAdminUser(row) } : { ok: false, reason: 'not_found' }
}

/** Xoa user theo id. Tra `false` khi khong tim thay. */
export async function deleteUser(store: UsersStore, id: string): Promise<boolean> {
  return store.deleteUser(id)
}
