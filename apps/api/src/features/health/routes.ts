import type { FastifyInstance } from 'fastify'
import type { AppDb } from '../../platform/db.js'
import { checkHealth, makeDbPing } from './service.js'

export async function healthRoutes(app: FastifyInstance, db: AppDb): Promise<void> {
  const ping = makeDbPing(db)
  app.get('/health', async (_request, reply) => {
    const result = await checkHealth(ping)
    // 200 khi ket noi DB thuc OK; 503 khi DB down de load balancer/monitor bat duoc.
    reply.code(result.status === 'ok' ? 200 : 503)
    return result
  })
}
