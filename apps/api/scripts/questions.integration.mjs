// Explicit isolated DB gate; never reads DATABASE_URL or any local secret.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import pg from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { makeQuestionsStore } from '../dist/features/questions/store.js'
import {
  importQuestions,
  updateQuestion,
  deleteQuestion,
  listQuestions,
} from '../dist/features/questions/service.js'

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
  pool = new pg.Pool({
    host: '127.0.0.1',
    port: Number(docker('port', id, '5432/tcp').split(':').at(-1)),
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
      const [up, down] = readFileSync(new URL(file, dir), 'utf8').split('-- migrate:down')
      assert.ok(down)
      return { up: up.replace('-- migrate:up', ''), down }
    })
  for (const migration of migrations) await pool.query(migration.up)
  for (const migration of [...migrations].reverse()) await pool.query(migration.down)
  for (const migration of migrations) await pool.query(migration.up)
  console.log(`PASS migrations up/down/up: ${migrations.length}`)
  db = new Kysely({ dialect: new PostgresDialect({ pool }) })
  const store = makeQuestionsStore(db)
  const row = {
    level: 'starter',
    skill: 'reading',
    question_type: 'fill_blank',
    difficulty: 'easy',
    question_text: 'Fixture',
    options: '',
    correct_answer: 'answer',
    points: '1',
    explanation: 'Explanation',
    source_reference: 'Source',
  }
  const invalid = await importQuestions(store, [row, { ...row, points: 'bad' }])
  assert.equal(invalid.ok, false)
  assert.equal(invalid.errors[0].row, 2)
  assert.equal(invalid.errors[0].field, 'points')
  assert.equal((await listQuestions(store)).length, 0)
  console.log('PASS strict invalid import is all-or-nothing with row/field errors')
  const imported = await importQuestions(store, [row])
  assert.equal(imported.ok, true)
  const q = imported.result.questions[0]
  assert.equal(q.explanation, 'Explanation')
  assert.equal(q.sourceReference, 'Source')
  const edited = await updateQuestion(store, q.id, {
    questionText: 'Edited',
    explanation: null,
    sourceReference: null,
  })
  assert.equal(edited.ok, true)
  assert.equal(edited.question.questionText, 'Edited')
  assert.equal(edited.question.explanation, null)
  assert.equal(edited.question.sourceReference, null)
  console.log('PASS real DB metadata roundtrip and nullable edit')
  await pool.query(
    "create function reject_fixture() returns trigger language plpgsql as $$ begin if NEW.question_text = 'reject' then raise exception 'test rollback'; end if; return NEW; end $$; create trigger reject_fixture before insert on questions for each row execute function reject_fixture()",
  )
  await assert.rejects(
    importQuestions(store, [row, { ...row, question_text: 'reject' }]),
    /test rollback/,
  )
  assert.equal((await listQuestions(store)).length, 1)
  await pool.query('drop trigger reject_fixture on questions; drop function reject_fixture()')
  console.log('PASS bulk insert failure rolls back entire statement')
  await deleteQuestion(store, q.id)
  assert.equal((await listQuestions(store)).length, 0)
  console.log('PASS CRUD delete')
} finally {
  if (db) await db.destroy()
  else if (pool) await pool.end()
  docker('stop', id)
}
