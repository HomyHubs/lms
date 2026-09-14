import type { ColumnType, Generated } from 'kysely'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

/** Cot do Postgres sinh gia tri (default) va app khong ghi tay khi insert. */
type Timestamp = ColumnType<Date, string | undefined, string | undefined>

/** Bang `users` — Task 2 (slice-0): dang nhap SDT + mat khau. */
export interface UsersTable {
  id: Generated<string>
  phone_number: string
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

export interface Database {
  users: UsersTable
  sessions: SessionsTable
}

export function createDb(connectionString: string): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString, max: 10 }),
  })
  return new Kysely<Database>({ dialect })
}

export type AppDb = Kysely<Database>
