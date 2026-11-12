/**
 * Single-process API launcher for the Playwright E2E harness (used as the API
 * `webServer` command). Booting the DB and the API in ONE process guarantees the
 * API sees the correct DATABASE_URL — no cross-process env handoff to get wrong.
 *
 * Steps: boot a disposable PostgreSQL 18 (Docker, loopback random port, tmpfs,
 * --rm) -> apply db/migrations -> seed a known admin (reusing the API's built
 * bcrypt hasher) -> set DATABASE_URL/PORT/HOST -> import the built API entry,
 * which calls app.listen(). Playwright waits on GET /health. The container id is
 * written to .stack-state.json so globalTeardown can stop it.
 *
 * Guardrails: never reads the developer's DATABASE_URL or any secret/.env; the DB
 * is throwaway and auto-removed; binds 127.0.0.1 only.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(HERE, '..', '..')
const API_ROOT = path.resolve(WEB_ROOT, '..', 'api')
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'db', 'migrations')
const STATE_FILE = path.join(HERE, '.stack-state.json')

const API_PORT = Number(process.env.E2E_API_PORT) || 3399
const ADMIN_PHONE = process.env.E2E_ADMIN_PHONE || '0901234567'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'e2e-admin-pass8'

const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', timeout: 120_000 }).trim()

function readMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')
      const [up] = sql.split('-- migrate:down')
      return up.replace('-- migrate:up', '')
    })
}

const containerId = docker(
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
)
writeFileSync(STATE_FILE, JSON.stringify({ containerId }), 'utf8')
const hostPort = Number(docker('port', containerId, '5432/tcp').split(':').at(-1))
const databaseUrl = `postgres://postgres@127.0.0.1:${hostPort}/postgres?sslmode=disable`

const pool = new pg.Pool({
  host: '127.0.0.1',
  port: hostPort,
  user: 'postgres',
  database: 'postgres',
  connectionTimeoutMillis: 2_000,
  statement_timeout: 30_000,
})
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

const { hashPassword } = await import(
  pathToFileURL(path.join(API_ROOT, 'dist', 'features', 'auth', 'service.js')).href
)
const passwordHash = await hashPassword(ADMIN_PASSWORD)
await pool.query(
  `insert into users (phone_number, email, password_hash, role)
   values ($1, $2, $3, 'admin')
   on conflict (phone_number) do update set password_hash = excluded.password_hash, role = 'admin'`,
  [ADMIN_PHONE, 'e2e-admin@example.com', passwordHash],
)
await pool.end()

console.log(`[e2e] disposable PostgreSQL 18 up on ${hostPort}; starting API on ${API_PORT}`)

// Hand the DB + port to the built API, then import it so it calls app.listen().
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = databaseUrl
process.env.PORT = String(API_PORT)
process.env.HOST = '127.0.0.1'
await import(pathToFileURL(path.join(API_ROOT, 'dist', 'main.js')).href)
