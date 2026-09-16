import type { ColumnType, Generated } from 'kysely'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

/** Cot do Postgres sinh gia tri (default) va app khong ghi tay khi insert. */
type Timestamp = ColumnType<Date, string | undefined, string | undefined>

/** Bang `users` — Task 2 (slice-0): dang nhap SDT + mat khau. */
export interface UsersTable {
  id: Generated<string>
  phone_number: string
  // Task 3 (slice-0): email de nhan OTP dat lai mat khau (nullable, unique khi co).
  email: ColumnType<string | null, string | null | undefined, string | null>
  password_hash: string
  // TODO(slice-1): thay `role` text bang lien ket Branch/role day du.
  role: ColumnType<string, string | undefined, string>
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `sessions` — co che Session opaque (luu SHA-256 hash cua token phien). */
export interface SessionsTable {
  token_hash: string
  user_id: string
  created_at: Timestamp
  expires_at: ColumnType<Date, string, string>
}

/** Bang `password_reset_otps` — Task 3 (slice-0): quen mat khau qua OTP Email. */
export interface PasswordResetOtpsTable {
  id: Generated<string>
  user_id: string
  // Luu SHA-256 hash cua ma OTP (khong luu ma tho).
  otp_hash: string
  attempts: ColumnType<number, number | undefined, number>
  consumed_at: ColumnType<Date | null, string | null | undefined, string | null>
  created_at: Timestamp
  expires_at: ColumnType<Date, string, string>
}

/** Bang `centers` — slice-1 Task 2: trung tam (1 Center co nhieu Branch). */
export interface CentersTable {
  id: Generated<string>
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `branches` — slice-1 Task 2: co so truc thuoc mot Center. */
export interface BranchesTable {
  id: Generated<string>
  center_id: string
  address: ColumnType<string | null, string | null | undefined, string | null>
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `levels` — slice-1 Task 3: cap do co dinh (Starter/Mover/Flyer), seed san. */
export interface LevelsTable {
  id: Generated<string>
  code: string
  name: string
}

/** Bang `courses` — slice-1 Task 3: khoa hoc thuoc mot Level. */
export interface CoursesTable {
  id: Generated<string>
  level_id: string
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `classes` — slice-1 Task 3: lop hoc thuoc mot Course va gan dung 1 Branch. */
export interface ClassesTable {
  id: Generated<string>
  course_id: string
  branch_id: string
  name: string
  created_at: Timestamp
  updated_at: Timestamp
}

/** Bang `enrollments` — slice-1 Task 3: ghi danh hoc vien vao lop (unique class+student). */
export interface EnrollmentsTable {
  id: Generated<string>
  class_id: string
  student_id: string
  created_at: Timestamp
}

export interface Database {
  users: UsersTable
  sessions: SessionsTable
  password_reset_otps: PasswordResetOtpsTable
  centers: CentersTable
  branches: BranchesTable
  levels: LevelsTable
  courses: CoursesTable
  classes: ClassesTable
  enrollments: EnrollmentsTable
}

export function createDb(connectionString: string): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString, max: 10 }),
  })
  return new Kysely<Database>({ dialect })
}

export type AppDb = Kysely<Database>
