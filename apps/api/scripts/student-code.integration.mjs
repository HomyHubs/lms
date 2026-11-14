// slice-23 (ADR 0014): isolated DB rollback gate for the student_code migration.
// Mirrors reset/questions.integration.mjs: owns one ephemeral PG18 Docker container,
// never reads DATABASE_URL or any local secret. Applies all db/migrations up, asserts
// the student_code / branches.code schema, seeds students, re-runs the backfill, then
// rolls the latest migration DOWN, asserts the columns/index are gone, and re-applies UP.
// Run (from apps/api, after `pnpm -r build`): node scripts/student-code.integration.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import pg from 'pg'

const docker = (...args) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 120_000,
  }).trim()
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
try {
  pool = new pg.Pool({
    host: '127.0.0.1',
    port: Number(docker('port', id, '5432/tcp').split(':').at(-1)),
    user: 'postgres',
    database: 'postgres',
    connectionTimeoutMillis: 2_000,
    statement_timeout: 30_000,
    query_timeout: 35_000,
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
  const version = await pool.query('show server_version_num')
  assert.equal(Math.floor(Number(version.rows[0].server_version_num) / 10_000), 18)
  console.log('PASS isolated PostgreSQL major version 18')

  const target = '20261120000000_users_student_code.sql'
  const dir = new URL('../../../db/migrations/', import.meta.url)
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
  const migrations = files.map((file) => {
    const [up, down] = readFileSync(new URL(file, dir), 'utf8').split('-- migrate:down')
    assert.ok(down, `rollback missing: ${file}`)
    return { file, up: up.replace('-- migrate:up', ''), down }
  })
  assert.ok(
    migrations.some((m) => m.file === target),
    `missing migration ${target}`,
  )

  // Full up/down/up over the whole set (same contract as the other DB gates).
  for (const migration of migrations) await pool.query(migration.up)
  for (const migration of [...migrations].reverse()) await pool.query(migration.down)
  for (const migration of migrations) await pool.query(migration.up)
  console.log(`PASS migrations up/down/up: ${migrations.length}`)

  const columnExists = async (table, column) =>
    (
      await pool.query(
        'select 1 from information_schema.columns where table_name=$1 and column_name=$2',
        [table, column],
      )
    ).rowCount > 0
  const indexExists = async (name) =>
    (await pool.query('select 1 from pg_indexes where indexname=$1', [name])).rowCount > 0

  // After up: columns + partial unique index exist.
  assert.equal(await columnExists('users', 'student_code'), true)
  assert.equal(await columnExists('branches', 'code'), true)
  assert.equal(await indexExists('users_student_code_unique'), true)
  console.log('PASS up: users.student_code + branches.code + unique index exist')

  // Seed: one center, two branches (one with code, one without), students across branches
  // plus one student with no branch, to exercise the backfill + fallback prefix.
  const center = (
    await pool.query("insert into centers(name) values('C') returning id")
  ).rows[0].id
  const hn = (
    await pool.query(
      "insert into branches(center_id,name,code) values($1,'HN','HN') returning id",
      [center],
    )
  ).rows[0].id
  const nocode = (
    await pool.query(
      "insert into branches(center_id,name,code) values($1,'NoCode',null) returning id",
      [center],
    )
  ).rows[0].id
  const mkStudent = async (phone, createdAt) =>
    (
      await pool.query(
        "insert into users(phone_number,password_hash,role,created_at) values($1,'x','student',$2) returning id",
        [phone, createdAt],
      )
    ).rows[0].id
  const s1 = await mkStudent('0900000001', '2026-01-01T00:00:00Z') // HN
  const s2 = await mkStudent('0900000002', '2026-01-02T00:00:00Z') // HN
  const s3 = await mkStudent('0900000003', '2026-01-03T00:00:00Z') // null-code branch -> HV
  const s4 = await mkStudent('0900000004', '2026-01-04T00:00:00Z') // no branch -> HV
  // A non-student must never receive a code.
  const admin = (
    await pool.query(
      "insert into users(phone_number,password_hash,role) values('0900000009','x','admin') returning id",
    )
  ).rows[0].id
  await pool.query('insert into user_branches(user_id,branch_id) values($1,$2),($3,$2),($4,$5)', [
    s1,
    hn,
    s2,
    s3,
    nocode,
  ])

  // Re-run the backfill block (idempotent: only fills where student_code is null).
  const backfill = migrations.find((m) => m.file === target).up
  await pool.query(backfill)
  await pool.query(backfill) // second run must be a no-op (re-runnable).

  const codeOf = async (userId) =>
    (await pool.query('select student_code from users where id=$1', [userId])).rows[0].student_code
  assert.equal(await codeOf(s1), 'HN0001')
  assert.equal(await codeOf(s2), 'HN0002')
  assert.equal(await codeOf(s3), 'HV0001') // branch.code null -> fallback prefix
  assert.equal(await codeOf(s4), 'HV0002') // no branch -> fallback prefix
  assert.equal(await codeOf(admin), null) // non-student untouched
  console.log('PASS backfill: per-prefix zero-padded codes, fallback HV, non-student skipped')

  // Partial unique index: duplicate student code rejected; same value on a non-student allowed.
  await assert.rejects(
    pool.query("update users set student_code='HN0001' where id=$1", [s2]),
    /duplicate key|unique/i,
  )
  await pool.query("update users set student_code='HN0001' where id=$1", [admin])
  console.log('PASS partial unique index: students unique, non-students exempt')

  // Rollback the latest migration (down) -> columns + index gone.
  await pool.query(migrations.find((m) => m.file === target).down)
  assert.equal(await columnExists('users', 'student_code'), false)
  assert.equal(await columnExists('branches', 'code'), false)
  assert.equal(await indexExists('users_student_code_unique'), false)
  console.log('PASS down: student_code / branches.code / unique index removed')

  // Re-apply up -> succeeds and columns return.
  await pool.query(migrations.find((m) => m.file === target).up)
  assert.equal(await columnExists('users', 'student_code'), true)
  assert.equal(await columnExists('branches', 'code'), true)
  assert.equal(await indexExists('users_student_code_unique'), true)
  console.log('PASS re-apply up after down succeeds')
} finally {
  try {
    if (pool) await pool.end()
  } finally {
    docker('stop', id)
  }
}
console.log('STUDENT_CODE_PG_INTEGRATION_PASS')
