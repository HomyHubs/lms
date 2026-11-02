// Explicit isolated DB gate: node scripts/reset.integration.mjs (after build).
// Never reads DATABASE_URL or user configuration; owns one ephemeral Docker container.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import pg from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { makePasswordResetStore } from '../dist/features/auth/store.js'
import { requestPasswordReset, resetPassword } from '../dist/features/auth/password-reset.js'

const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
const id = docker(
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
let pool
let db
try {
  const port = docker('port', id, '5432/tcp').split(':').at(-1)
  pool = new pg.Pool({
    host: '127.0.0.1',
    port: Number(port),
    user: 'postgres',
    database: 'postgres',
  })
  for (let i = 0; ; i++) {
    try {
      await pool.query('select 1')
      break
    } catch (error) {
      if (i === 60) throw error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  const dir = new URL('../../../db/migrations/', import.meta.url)
  const migrations = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => {
      const text = readFileSync(new URL(file, dir), 'utf8')
      const [up, down] = text.split('-- migrate:down')
      assert.ok(down, `rollback missing: ${file}`)
      return { up: up.replace('-- migrate:up', ''), down }
    })
  for (const migration of migrations) await pool.query(migration.up)
  for (const migration of [...migrations].reverse()) await pool.query(migration.down)
  for (const migration of migrations) await pool.query(migration.up)
  console.log(`PASS migrations up/down/up: ${migrations.length}`)
  db = new Kysely({ dialect: new PostgresDialect({ pool }) })
  const store = makePasswordResetStore(db)
  const user = (
    await pool.query(
      "insert into users(phone_number,email,password_hash,role) values('0800000001','fixture@example.com','old','admin') returning id",
    )
  ).rows[0]
  let sent = 0
  await requestPasswordReset(
    store,
    {
      dispatch: async () => {
        sent++
      },
    },
    { email: 'fixture@example.com', channel: 'email', ttlSeconds: 600 },
  )
  assert.equal(sent, 0)
  assert.equal(
    (await pool.query('select count(*)::int as n from password_reset_otps')).rows[0].n,
    0,
  )
  assert.equal(
    (
      await resetPassword(store, {
        email: 'fixture@example.com',
        otp: '123456',
        newPassword: 'newpassword',
      })
    ).ok,
    false,
  )
  console.log('PASS legacy identity fail-closed')
  const issue = async () =>
    (
      await pool.query(
        "insert into password_reset_otps(user_id,otp_hash,expires_at,channel) values($1,'hash',now()+interval '10 minutes','email') returning id",
        [user.id],
      )
    ).rows[0].id
  const otpId = await issue()
  const outcomes = await Promise.all([
    store.completeReset(otpId, user.id, 'hash1'),
    store.completeReset(otpId, user.id, 'hash2'),
  ])
  assert.equal(outcomes.filter(Boolean).length, 1)
  assert.equal(await store.completeReset(otpId, user.id, 'replay'), false)
  console.log('PASS concurrent atomic consume and replay')
  const rollbackId = await issue()
  await pool.query(
    "create function reject_password() returns trigger language plpgsql as $$ begin raise exception 'test rollback'; end $$; create trigger reject_password before update on users for each row execute function reject_password()",
  )
  await assert.rejects(store.completeReset(rollbackId, user.id, 'rejected'), /test rollback/)
  assert.equal(
    (await pool.query('select consumed_at from password_reset_otps where id=$1', [rollbackId]))
      .rows[0].consumed_at,
    null,
  )
  await pool.query('drop trigger reject_password on users; drop function reject_password()')
  assert.equal(await store.completeReset(rollbackId, user.id, 'accepted'), true)
  console.log('PASS failed password update rolls back OTP consumption')
} finally {
  if (db) await db.destroy()
  else if (pool) await pool.end()
  docker('stop', id)
}
