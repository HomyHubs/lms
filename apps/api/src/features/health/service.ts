import { sql } from 'kysely'
import type { HealthResponse } from '@lms/shared'
import type { AppDb } from '../../platform/db.js'

/** Ham ping DB: tra ve true neu ket noi Postgres THUC tra loi duoc. */
export type DbPing = () => Promise<boolean>

/** Ping mac dinh: chay `SELECT 1` that tren Postgres qua Kysely (khong mock). */
export function makeDbPing(db: AppDb): DbPing {
  return async () => {
    await sql`select 1`.execute(db)
    return true
  }
}

/**
 * Kiem tra suc khoe: ping DB that, do latency, tra ve trang thai tong hop.
 * Nhan `ping` de test duoc ma khong phai dung Postgres that.
 */
export async function checkHealth(ping: DbPing): Promise<HealthResponse> {
  const startedAt = performance.now()
  let dbUp = false
  try {
    dbUp = await ping()
  } catch {
    dbUp = false
  }
  const latencyMs = dbUp ? Math.round((performance.now() - startedAt) * 100) / 100 : null

  return {
    status: dbUp ? 'ok' : 'degraded',
    db: {
      status: dbUp ? 'up' : 'down',
      latencyMs,
    },
    timestamp: new Date().toISOString(),
  }
}
