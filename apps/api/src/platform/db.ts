import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

/**
 * Lat cat DB toi thieu cho slice-0. Cac bang nghiep vu (User, ...) se them o slice sau
 * qua migration dbmate. Health-check chi can ket noi thuc, chua can bang nao.
 */
export interface Database {
  // TODO(slice-0-auth): them bang `users` khi lam Task 2 (dang nhap SDT).
  [key: string]: never
}

export function createDb(connectionString: string): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString, max: 10 }),
  })
  return new Kysely<Database>({ dialect })
}

export type AppDb = Kysely<Database>
