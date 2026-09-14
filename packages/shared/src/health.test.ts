import { describe, expect, it } from 'vitest'
import { HealthResponse } from './health.js'

describe('HealthResponse contract', () => {
  it('accepts a valid healthy payload', () => {
    const parsed = HealthResponse.parse({
      status: 'ok',
      db: { status: 'up', latencyMs: 3 },
      timestamp: new Date().toISOString(),
    })
    expect(parsed.status).toBe('ok')
    expect(parsed.db.status).toBe('up')
  })

  it('accepts a degraded payload with db down', () => {
    const parsed = HealthResponse.parse({
      status: 'degraded',
      db: { status: 'down', latencyMs: null },
      timestamp: new Date().toISOString(),
    })
    expect(parsed.db.status).toBe('down')
    expect(parsed.db.latencyMs).toBeNull()
  })

  it('rejects an unknown status', () => {
    expect(() =>
      HealthResponse.parse({
        status: 'boom',
        db: { status: 'up', latencyMs: 1 },
        timestamp: new Date().toISOString(),
      }),
    ).toThrow()
  })
})
