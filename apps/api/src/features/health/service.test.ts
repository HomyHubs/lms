import { describe, expect, it } from 'vitest'
import { HealthResponse } from '@lms/shared'
import { checkHealth } from './service.js'

describe('checkHealth', () => {
  it('reports db up when the ping succeeds', async () => {
    const result = await checkHealth(async () => true)
    expect(HealthResponse.parse(result)).toEqual(result)
    expect(result.status).toBe('ok')
    expect(result.db.status).toBe('up')
    expect(result.db.latencyMs).not.toBeNull()
  })

  it('reports db down (degraded) when the ping returns false', async () => {
    const result = await checkHealth(async () => false)
    expect(result.status).toBe('degraded')
    expect(result.db.status).toBe('down')
    expect(result.db.latencyMs).toBeNull()
  })

  it('reports db down (degraded) when the ping throws', async () => {
    const result = await checkHealth(async () => {
      throw new Error('connection refused')
    })
    expect(result.status).toBe('degraded')
    expect(result.db.status).toBe('down')
  })
})
