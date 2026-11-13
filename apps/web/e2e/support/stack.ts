/**
 * Real-stack lifecycle helpers for the Playwright acceptance harness.
 *
 * globalSetup boots a disposable PostgreSQL 18 (Docker, loopback-only random
 * host port, tmpfs, --rm) — mirroring apps/api/scripts/questions.integration.mjs —
 * applies db/migrations, and seeds a known admin (reusing the API's built bcrypt
 * hasher). It exports DATABASE_URL via process.env so the Fastify API — started
 * as a Playwright `webServer` (which inherits the config process env) — connects
 * to this throwaway DB. globalTeardown stops the container.
 *
 * Guardrails (same spirit as the integration gate):
 *  - never reads the developer's DATABASE_URL or any local secret/.env;
 *  - the DB is throwaway and auto-removed; no user DB is touched.
 */
import { execFile } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import path from 'node:path'
import pg from 'pg'

const execFileAsync = promisify(execFile)

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(HERE, '..', '..')
const API_ROOT = path.resolve(WEB_ROOT, '..', 'api')
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'db', 'migrations')
const STATE_FILE = path.join(HERE, '.stack-state.json')

// Set by playwright.config.ts before anything runs; falls back for standalone use.
export const API_PORT = Number(process.env.E2E_API_PORT) || 3399
export const ADMIN_PHONE = '0901234567'
export const ADMIN_PASSWORD = 'e2e-admin-pass8'

interface StackState {
  containerId: string
}

async function docker(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('docker', args, { timeout: 120_000 })
  return stdout.trim()
}

function readMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')
      const [up] = sql.split('-- migrate:down')
      return up.replace('-- migrate:up', '')
    })
}

/** Boot DB, migrate, seed admin, and export DATABASE_URL for the API webServer. */
export async function startStack(): Promise<void> {
  // 1) Disposable PostgreSQL 18 (loopback random port, tmpfs, --rm).
  const containerId = await docker([
    'run',
    '--rm',
    '-d',
    '--publish',
    '127.0.0.1::5432',
    '--tmpfs',
    '/var/lib/postgresql',
    '-e',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    'postgres:18',
  ])
  writeFileSync(STATE_FILE, JSON.stringify({ containerId } satisfies StackState), 'utf8')

  const hostPort = Number((await docker(['port', containerId, '5432/tcp'])).split(':').at(-1))
  const databaseUrl = `postgres://postgres@127.0.0.1:${hostPort}/postgres?sslmode=disable`

  // 2) Wait for DB, assert PG 18, apply migrations.
  const pool = new pg.Pool({
    host: '127.0.0.1',
    port: hostPort,
    user: 'postgres',
    database: 'postgres',
    connectionTimeoutMillis: 2_000,
    statement_timeout: 30_000,
  })
  try {
    for (let i = 0; ; i++) {
      try {
        await pool.query('select 1')
        break
      } catch (err) {
        if (i === 60) throw err
        await new Promise((r) => setTimeout(r, 500))
      }
    }
    const v = await pool.query('show server_version_num')
    const major = Math.floor(Number(v.rows[0].server_version_num) / 10_000)
    if (major !== 18) throw new Error(`Expected PostgreSQL 18, got major ${major}`)
    for (const up of readMigrations()) await pool.query(up)

    // 3) Seed a known admin, reusing the API's built bcrypt hasher so the stored
    //    hash matches login verification. Done in-process (cross-platform).
    const { hashPassword } = (await import(
      pathToFileURL(path.join(API_ROOT, 'dist', 'features', 'auth', 'service.js')).href
    )) as { hashPassword: (p: string) => Promise<string> }
    const passwordHash = await hashPassword(ADMIN_PASSWORD)
    await pool.query(
      `insert into users (phone_number, email, password_hash, role)
       values ($1, $2, $3, 'admin')
       on conflict (phone_number) do update set password_hash = excluded.password_hash, role = 'admin'`,
      [ADMIN_PHONE, 'e2e-admin@example.com', passwordHash],
    )
  } finally {
    await pool.end()
  }

  // 4) Export connection + port so the Playwright-managed API webServer (and its
  //    Vite proxy) connect to THIS disposable DB. Playwright starts webServers
  //    from this same process after globalSetup, so these are inherited.
  process.env.DATABASE_URL = databaseUrl
  process.env.E2E_API_PORT = String(API_PORT)
  process.env.E2E_API_TARGET = `http://127.0.0.1:${API_PORT}`
  console.log(`[e2e] disposable PostgreSQL 18 up on ${hostPort}; API will use port ${API_PORT}`)
}

export async function stopStack(): Promise<void> {
  let state: StackState | null = null
  try {
    state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as StackState
  } catch {
    return
  }
  try {
    await docker(['stop', state.containerId])
  } catch {
    /* --rm container may already be gone */
  }
}
