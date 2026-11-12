import { z } from 'zod'

/**
 * Contract cua endpoint health-check, dung chung FE-BE (webapp-template muc 8).
 * `db` phai phan anh ket noi Postgres THUC, khong duoc mock (slice-0, "Khong duoc stub").
 */
export const HealthStatus = z.enum(['ok', 'degraded'])
export type HealthStatus = z.infer<typeof HealthStatus>

export const DbStatus = z.enum(['up', 'down'])
export type DbStatus = z.infer<typeof DbStatus>

export const HealthResponse = z.object({
  status: HealthStatus,
  db: z.object({
    status: DbStatus,
    /** Round-trip latency toi Postgres tinh bang mili-giay, khi do duoc. */
    latencyMs: z.number().nonnegative().nullable(),
  }),
  timestamp: z.string(),
})
export type HealthResponse = z.infer<typeof HealthResponse>
