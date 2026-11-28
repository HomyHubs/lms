import { z } from 'zod'
import { Email, PhoneNumber, UserRole } from './auth.js'

/**
 * Contract quan ly nguoi dung (slice-1 Task 1) dung chung FE-BE.
 * CRUD User (Admin/Teacher/Student/Staff) + RBAC theo role — thay role gia dinh o slice-0.
 * KHONG bao gio tra `password_hash` ra ngoai.
 */

/** Mat khau dat khi tao/doi user: toi thieu 8 ky tu (bcrypt xu ly do dai o backend). */
const Password = z.string().min(8, 'Mat khau toi thieu 8 ky tu')

/** Gioi tinh hoc vien (nullable o AdminUser; optional o create/update). */
export const Gender = z.enum(['male', 'female', 'other'])
export type Gender = z.infer<typeof Gender>

/** Ho va chu lot / Ten: chuoi da trim, khong rong khi co nhap. */
const NamePart = z.string().trim().min(1, 'Khong duoc de trong').max(200)

/** Nam sinh hop le: so nguyen trong khoang 1900..nam hien tai. */
const BirthYear = z.number().int().min(1900).max(new Date().getFullYear())

/** Hom nay dang 'YYYY-MM-DD' theo gio may — du cho việc chan ngay sinh o tuong lai. */
function todayIso(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Ngay 'YYYY-MM-DD' co that tren lich (loai 2026-02-30, 2026-13-01).
 * Doi chieu lai qua `Date.UTC` — regex mot minh khong bat duoc ngay "tron".
 */
function isRealIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

/**
 * Ngay sinh day du (slice-26, ADR 0018) — dung de tinh tuoi CHINH XAC.
 * `birthYear` mot minh chi cho tuoi uoc luong (lech +-1), nen ngay sinh la duong nhap uu tien.
 */
const BirthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngay sinh phai dang YYYY-MM-DD')
  .refine(isRealIsoDate, 'Ngay sinh khong ton tai')
  .refine((v) => v >= '1900-01-01', 'Ngay sinh phai tu nam 1900 tro lai')
  .refine((v) => v <= todayIso(), 'Ngay sinh khong duoc o tuong lai')

/**
 * `birthDate` va `birthYear` mo ta CUNG mot du lieu o hai muc chinh xac khac nhau.
 * Gui ca hai ma lech nam la loi nhap lieu — bao loi thay vi im lang chon mot.
 */
function birthFieldsAgree(v: { birthDate?: string | null; birthYear?: number | null }): boolean {
  if (!v.birthDate || v.birthYear === undefined || v.birthYear === null) return true
  return Number(v.birthDate.slice(0, 4)) === v.birthYear
}

/** Dia chi hoc vien: tuy chon, gioi han do dai. */
const Address = z.string().trim().max(500)

/** Thong tin user cho man quan ly (Admin). An toan de tra ve FE. */
export const AdminUser = z.object({
  id: z.string().uuid(),
  phoneNumber: PhoneNumber,
  email: z.string().email().nullable(),
  role: UserRole,
  // Ho so hoc vien (slice ho so): nullable de khong pha user cu / role khac.
  lastName: z.string().nullable(),
  firstName: z.string().nullable(),
  birthYear: z.number().int().nullable(),
  // slice-26 (ADR 0018): ngay sinh day du 'YYYY-MM-DD'. Nguon su thuat khi co; null voi user cu
  // chi biet nam sinh. `birthYear` ben tren khi do duoc dan xuat tu `birthDate`.
  // .default(null): payload cu (truoc ADR 0018) khong kem birthDate van parse duoc.
  birthDate: z.string().nullable().default(null),
  gender: Gender.nullable(),
  address: z.string().nullable(),
  parentPhone: z.string().nullable(),
  // Ma hoc vien (slice-23): CHI DOC o slice nay, sinh tu dong theo co so khi tao hoc vien.
  // null voi role khac hoc vien / hoc vien chua co ma. Chinh sua tay la slice sau.
  // .default(null): payload cu/khong kem studentCode van parse duoc (additive, khong pha FE cu).
  studentCode: z.string().nullable().default(null),
  // Tuoi tinh tu dong o backend; KHONG luu DB.
  // slice-26 (ADR 0018): tinh tu `birthDate` khi co (CHINH XAC, da tru chua-toi-sinh-nhat), fallback
  // `birthYear` (UOC LUONG, lech +-1). CHI co y nghia / duoc tinh cho role hoc vien; role khac null.
  age: z.number().int().nullable(),
  // ISO-8601 timestamp (created_at) — chuoi de truyen JSON gon.
  createdAt: z.string(),
})
export type AdminUser = z.infer<typeof AdminUser>

/** Tao user moi (chi Admin). Role bat buoc — khong con role gia dinh nhu slice-0. */
export const CreateUserRequest = z
  .object({
    phoneNumber: PhoneNumber,
    password: Password,
    role: UserRole,
    email: Email.optional(),
    // Ho so hoc vien (tuy chon de khong pha role khac).
    lastName: NamePart.optional(),
    firstName: NamePart.optional(),
    // slice-26 (ADR 0018): uu tien ngay sinh day du. `birthYear` giu lai cho nhap nhanh / seed
    // / client cu; khi co `birthDate` thi `birthYear` duoc dan xuat tu do.
    birthDate: BirthDate.optional(),
    birthYear: BirthYear.optional(),
    gender: Gender.optional(),
    address: Address.optional(),
    parentPhone: PhoneNumber.optional(),
  })
  .refine(birthFieldsAgree, {
    message: 'Nam sinh khong khop voi ngay sinh',
    path: ['birthYear'],
  })
export type CreateUserRequest = z.infer<typeof CreateUserRequest>

/** Cap nhat user: moi truong deu tuy chon, nhung phai co it nhat 1 truong. */
export const UpdateUserRequest = z
  .object({
    role: UserRole.optional(),
    email: Email.nullable().optional(),
    password: Password.optional(),
    // Ho so hoc vien: cho phep set gia tri hoac dat ve null (xoa).
    lastName: NamePart.nullable().optional(),
    firstName: NamePart.nullable().optional(),
    // slice-26 (ADR 0018): dat `birthDate: null` = xoa ngay sinh chinh xac, quay ve uoc luong
    // theo `birthYear` (khong tu dong xoa `birthYear`). Gui `birthDate` thi `birthYear` dan xuat theo.
    birthDate: BirthDate.nullable().optional(),
    birthYear: BirthYear.nullable().optional(),
    gender: Gender.nullable().optional(),
    address: Address.nullable().optional(),
    parentPhone: PhoneNumber.nullable().optional(),
  })
  .refine(
    (v) =>
      v.role !== undefined ||
      v.email !== undefined ||
      v.password !== undefined ||
      v.lastName !== undefined ||
      v.firstName !== undefined ||
      v.birthDate !== undefined ||
      v.birthYear !== undefined ||
      v.gender !== undefined ||
      v.address !== undefined ||
      v.parentPhone !== undefined,
    {
      message: 'Can it nhat mot truong de cap nhat',
    },
  )
  .refine(birthFieldsAgree, {
    message: 'Nam sinh khong khop voi ngay sinh',
    path: ['birthYear'],
  })
export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>

/** Response danh sach user (GET /users). */
export const AdminUserList = z.object({
  users: z.array(AdminUser),
})
export type AdminUserList = z.infer<typeof AdminUserList>

/** Response mot user (POST /users, GET/PATCH /users/:id). */
export const AdminUserResponse = z.object({
  user: AdminUser,
})
export type AdminUserResponse = z.infer<typeof AdminUserResponse>
