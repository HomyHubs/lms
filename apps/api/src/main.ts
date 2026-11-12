import { buildApp } from './app.js'
import { loadConfig } from './platform/config.js'
import { createDb } from './platform/db.js'

async function main(): Promise<void> {
  const config = loadConfig()
  const db = createDb(config.DATABASE_URL)
  const app = await buildApp({ config, db })

  try {
    await app.listen({ port: config.PORT, host: config.HOST })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  const shutdown = async (): Promise<void> => {
    await app.close()
    await db.destroy()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

void main()
