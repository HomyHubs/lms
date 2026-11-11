import { loadConfig } from '../platform/config.js'
import { createDb, type AppDb } from '../platform/db.js'
import { hashPassword } from '../features/auth/service.js'
import { makeQuestionsStore } from '../features/questions/store.js'
import { makeExamsStore } from '../features/exams/store.js'
import { createExam, startAttempt, submitAttempt, type ExamsStore } from '../features/exams/service.js'
import {
  DEMO_BRANCHES,
  DEMO_CENTER,
  DEMO_COURSES,
  DEMO_STAFF,
  DEMO_TEACHERS,
  LISTENING,
  READING,
  staffFullName,
  studentFullName,
  studentSlug,
  type DemoLevel,
  type DemoQuestion,
} from './demo-data.js'

/**
 * Demo dataset for showing the product: 1 center, 3 branches, 6 classes, 6 teachers, 3 staff,
 * 77 students (15+12+10+18+8+14 across 6 classes), a question bank, graded exam attempts
 * (with retakes) and 6 weeks of attendance.
 * Cầu Giấy: 27 students (lớp 0: 15, lớp 1: 12)
 * Hai Bà Trưng: 28 students (lớp 2: 10, lớp 3: 18)
 * Quận 7: 22 students (lớp 4: 8, lớp 5: 14)
 * Exams go through the real exam service, so scores are graded exactly like production.
 * Skips when the demo center already exists; `--reset` deletes the previous demo dataset first.
 * Run on a dev/demo database only:
 *
 *   pnpm --filter @lms/api seed:demo [--reset]   (password for every demo account: SEED_DEMO_PASSWORD, default demo1234)
 */

const DAY_MS = 86_400_000
/** Number of students per class, indexed by classIndex (0..5) across all branches. */
const CLASS_SIZES = [15, 12, 10, 18, 8, 14]
const SESSION_WEEKS = 6

/** Classes per branch index: [level, weekdays (0=Sun), start time]. */
const CLASS_PLAN: ReadonlyArray<ReadonlyArray<[DemoLevel, number[], string]>> = [
  [['starter', [1, 3], '17:30'], ['mover', [2, 4], '18:00']],
  [['mover', [1, 4], '17:45'], ['flyer', [3, 5], '19:00']],
  [['starter', [2, 5], '17:30'], ['flyer', [1, 3], '19:15']],
]

const LEVEL_LABEL: Record<DemoLevel, string> = { starter: 'Starters', mover: 'Movers', flyer: 'Flyers' }

/** Deterministic PRNG (mulberry32) so every run produces the same dataset. */
function makeRng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}
const rng = makeRng(20261106)

function phone(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(6, '0')}`
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function insertUser(
  db: AppDb,
  phoneNumber: string,
  email: string,
  role: string,
  passwordHash: string,
  // Ho so hoc vien (tuy chon): chi set khi seed student.
  profile?: {
    lastName: string | null
    firstName: string | null
    birthYear?: number | null
    gender?: 'male' | 'female' | 'other' | null
    parentPhone?: string | null
  },
): Promise<string> {
  const row = await db
    .insertInto('users')
    .values({
      phone_number: phoneNumber,
      email,
      password_hash: passwordHash,
      role,
      last_name: profile?.lastName ?? null,
      first_name: profile?.firstName ?? null,
      birth_year: profile?.birthYear ?? null,
      gender: profile?.gender ?? null,
      parent_phone: profile?.parentPhone ?? null,
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  return row.id
}

/** Tach full name "Ho giua Ten" thanh lastName (ho + chu lot) va firstName (ten cuoi). */
function splitStudentName(fullName: string): { lastName: string | null; firstName: string | null } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { lastName: fullName, firstName: null }
  const firstName = parts[parts.length - 1] ?? null
  const lastName = parts.slice(0, -1).join(' ')
  return { lastName, firstName }
}

/**
 * Sinh cac truong ho so demo (nam sinh, gioi tinh, SDT phu huynh) deterministic theo chi so hoc sinh.
 * Hoc vien Starters/Movers/Flyers la tre em, nen nam sinh roi vao khoang ~6-12 tuoi so voi nam hien tai.
 */
function studentProfileExtras(index: number): {
  birthYear: number
  gender: 'male' | 'female'
  parentPhone: string
} {
  const currentYear = new Date().getFullYear()
  const age = 6 + Math.floor(rng() * 7) // 6..12
  const birthYear = currentYear - age
  const gender: 'male' | 'female' = rng() < 0.5 ? 'male' : 'female'
  const parentPhone = phone('0988', index + 1)
  return { birthYear, gender, parentPhone }
}

async function seedQuestions(db: AppDb, levelIds: Record<DemoLevel, string>): Promise<Map<string, DemoQuestion>> {
  const store = makeQuestionsStore(db)
  const answers = new Map<string, DemoQuestion>()
  for (const [skill, bank] of [['reading', READING], ['listening', LISTENING]] as const) {
    for (const level of Object.keys(bank) as DemoLevel[]) {
      const rows = await store.createQuestions(
        bank[level].map((q) => ({
          levelId: levelIds[level],
          skill,
          questionType: q.type,
          difficulty: q.difficulty,
          questionText: q.text,
          options: q.options ?? null,
          correctAnswer: q.answer,
          points: q.difficulty === 'hard' ? 2 : 1,
          explanation: null,
          sourceReference: 'demo seed',
        })),
      )
      for (const row of rows) {
        const source = bank[level].find((q) => q.text === row.question_text)
        if (source) answers.set(row.id, source)
      }
    }
  }
  return answers
}

/** Simulated answer: correct with probability `ability`, otherwise a plausible wrong answer. */
function answerFor(q: DemoQuestion, ability: number): string {
  const correct = q.answer.split('|')[0] ?? q.answer
  if (rng() < ability) return correct
  const wrong = (q.options ?? []).filter((o) => o !== q.answer)
  return wrong.length > 0 ? wrong[Math.floor(rng() * wrong.length)]! : 'not sure'
}

const DEMO_EMAIL_DOMAINS = ['%@sunshine.demo', '%@hocvien.demo']

function examTitle(skill: 'reading' | 'listening', level: DemoLevel): string {
  return skill === 'reading' ? `Kiểm tra Reading giữa kỳ - ${LEVEL_LABEL[level]}` : `Kiểm tra Listening - ${LEVEL_LABEL[level]}`
}

/** Removes everything a previous run created (identified by demo center, email domains, titles). */
async function resetDemo(db: AppDb): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const users = await trx
      .selectFrom('users')
      .select('id')
      .where((eb) => eb.or(DEMO_EMAIL_DOMAINS.map((d) => eb('email', 'like', d))))
      .execute()
    const userIds = users.map((u) => u.id)
    const center = await trx.selectFrom('centers').select('id').where('name', '=', DEMO_CENTER).executeTakeFirst()
    const branchIds = center
      ? (await trx.selectFrom('branches').select('id').where('center_id', '=', center.id).execute()).map((b) => b.id)
      : []
    const classIds = branchIds.length
      ? (await trx.selectFrom('classes').select('id').where('branch_id', 'in', branchIds).execute()).map((c) => c.id)
      : []
    const titles = (Object.keys(LEVEL_LABEL) as DemoLevel[]).flatMap((l) => [examTitle('reading', l), examTitle('listening', l)])
    const examIds = (await trx.selectFrom('exams').select('id').where('title', 'in', titles).execute()).map((e) => e.id)

    if (classIds.length) {
      const sessionIds = (await trx.selectFrom('class_sessions').select('id').where('class_id', 'in', classIds).execute()).map((s) => s.id)
      if (sessionIds.length) await trx.deleteFrom('attendance_records').where('session_id', 'in', sessionIds).execute()
      await trx.deleteFrom('class_sessions').where('class_id', 'in', classIds).execute()
      await trx.deleteFrom('class_teachers').where('class_id', 'in', classIds).execute()
      await trx.deleteFrom('enrollments').where('class_id', 'in', classIds).execute()
      await trx.deleteFrom('classes').where('id', 'in', classIds).execute()
    }
    if (examIds.length) {
      await trx.deleteFrom('exam_attempts').where('exam_id', 'in', examIds).execute()
      await trx.deleteFrom('exams').where('id', 'in', examIds).execute()
    }
    await trx.deleteFrom('questions').where('source_reference', '=', 'demo seed').execute()
    if (userIds.length) {
      await trx.deleteFrom('exam_attempts').where('student_id', 'in', userIds).execute()
      await trx.deleteFrom('user_branches').where('user_id', 'in', userIds).execute()
      await trx.deleteFrom('sessions').where('user_id', 'in', userIds).execute()
      await trx.deleteFrom('password_reset_otps').where('user_id', 'in', userIds).execute()
      await trx.deleteFrom('users').where('id', 'in', userIds).execute()
    }
    if (branchIds.length) {
      await trx.deleteFrom('user_branches').where('branch_id', 'in', branchIds).execute()
      await trx.deleteFrom('branches').where('id', 'in', branchIds).execute()
    }
    if (center) await trx.deleteFrom('centers').where('id', '=', center.id).execute()
    await trx.deleteFrom('courses').where('name', 'in', DEMO_COURSES.map((c) => c.name)).execute()
  })
}

/**
 * The production store stamps submissions with the DB clock (anti-cheat), which rejects backdated
 * history. The seed writes the historical submission time directly; grading still runs in the service.
 */
function makeBackdatingExamsStore(db: AppDb): ExamsStore {
  return {
    ...makeExamsStore(db),
    async saveSubmission(attemptId, answersJson, submittedAtIso) {
      return db
        .updateTable('exam_attempts')
        .set({ answers: answersJson, submitted_at: submittedAtIso })
        .where('id', '=', attemptId)
        .where('submitted_at', 'is', null)
        .returningAll()
        .executeTakeFirstOrThrow()
    },
  }
}

interface DemoStudent {
  id: string
  ability: number
}

async function main(): Promise<void> {
  const config = loadConfig()
  const db = createDb(config.DATABASE_URL)
  try {
    if (process.argv.includes('--reset')) await resetDemo(db)
    const existing = await db.selectFrom('centers').select('id').where('name', '=', DEMO_CENTER).executeTakeFirst()
    if (existing) {
      console.log(`Demo data already present (${DEMO_CENTER}); nothing to do.`)
      return
    }
    const now = new Date()
    const passwordHash = await hashPassword(process.env.SEED_DEMO_PASSWORD ?? 'demo1234')
    const levels = await db.selectFrom('levels').select(['id', 'code']).execute()
    const levelIds = Object.fromEntries(levels.map((l) => [l.code, l.id])) as Record<DemoLevel, string>
    const admins = await db.selectFrom('users').select('id').where('role', '=', 'admin').execute()
    const creatorId = admins[0]?.id
    if (!creatorId) throw new Error('Seed an admin first: pnpm --filter @lms/api seed')

    const center = await db.insertInto('centers').values({ name: DEMO_CENTER }).returning('id').executeTakeFirstOrThrow()
    const branchIds: string[] = []
    for (const b of DEMO_BRANCHES) {
      const row = await db
        .insertInto('branches')
        .values({ center_id: center.id, name: b.name, address: b.address })
        .returning('id')
        .executeTakeFirstOrThrow()
      branchIds.push(row.id)
    }
    await db
      .insertInto('user_branches')
      .values(admins.flatMap((a) => branchIds.map((branchId) => ({ user_id: a.id, branch_id: branchId }))))
      .onConflict((oc) => oc.doNothing())
      .execute()

    const courseIds = {} as Record<DemoLevel, string>
    for (const c of DEMO_COURSES) {
      const row = await db
        .insertInto('courses')
        .values({ level_id: levelIds[c.level], name: c.name })
        .returning('id')
        .executeTakeFirstOrThrow()
      courseIds[c.level] = row.id
    }

    for (const [i, slug] of DEMO_STAFF.entries()) {
      const id = await insertUser(db, phone('0912', i + 1), `${slug}@sunshine.demo`, 'staff', passwordHash, splitStudentName(staffFullName(slug)))
      await db.insertInto('user_branches').values({ user_id: id, branch_id: branchIds[i % branchIds.length]! }).execute()
    }

    const studentsByLevel: Record<DemoLevel, DemoStudent[]> = { starter: [], mover: [], flyer: [] }
    let studentNo = 0
    let teacherNo = 0
    let sessionCount = 0
    let recordCount = 0
    let classIndex = 0
    for (const [branchIndex, plan] of CLASS_PLAN.entries()) {
      const branchId = branchIds[branchIndex]!
      for (const [level, weekdays, startsAt] of plan) {
        const teacherSlug = DEMO_TEACHERS[teacherNo]!
        teacherNo += 1
        const teacherId = await insertUser(db, phone('0911', teacherNo), `${teacherSlug}@sunshine.demo`, 'teacher', passwordHash, splitStudentName(staffFullName(teacherSlug)))
        await db.insertInto('user_branches').values({ user_id: teacherId, branch_id: branchId }).execute()
        const klass = await db
          .insertInto('classes')
          .values({
            course_id: courseIds[level],
            branch_id: branchId,
            name: `${LEVEL_LABEL[level]} ${String.fromCharCode(65 + teacherNo - 1)} - ${DEMO_BRANCHES[branchIndex]!.name.replace('Cơ sở ', '')}`,
          })
          .returning('id')
          .executeTakeFirstOrThrow()
        await db.insertInto('class_teachers').values({ class_id: klass.id, teacher_id: teacherId }).execute()

        const roster: DemoStudent[] = []
        const studentsInClass = CLASS_SIZES[classIndex] ?? 12
        classIndex += 1
        for (let k = 0; k < studentsInClass; k += 1) {
          const id = await insertUser(
            db,
            phone('0933', studentNo + 1),
            `${studentSlug(studentNo)}@hocvien.demo`,
            'student',
            passwordHash,
            { ...splitStudentName(studentFullName(studentNo)), ...studentProfileExtras(studentNo) },
          )
          studentNo += 1
          await db.insertInto('enrollments').values({ class_id: klass.id, student_id: id }).execute()
          roster.push({ id, ability: 0.35 + rng() * 0.6 })
        }
        studentsByLevel[level].push(...roster)

        for (let d = SESSION_WEEKS * 7; d >= 1; d -= 1) {
          const day = new Date(now.getTime() - d * DAY_MS)
          if (!weekdays.includes(day.getUTCDay())) continue
          const session = await db
            .insertInto('class_sessions')
            .values({
              class_id: klass.id,
              session_date: isoDate(day),
              starts_at: startsAt,
              topic: `Unit ${sessionCount % 12 + 1}`,
              created_by: teacherId,
            })
            .returning('id')
            .executeTakeFirstOrThrow()
          sessionCount += 1
          await db
            .insertInto('attendance_records')
            .values(
              roster.map((s) => {
                const r = rng()
                const presentShare = 0.6 + s.ability * 0.35
                const status = r < presentShare ? 'present' : r < presentShare + 0.06 ? 'late' : r < presentShare + 0.1 ? 'excused' : 'absent'
                return { session_id: session.id, student_id: s.id, status, note: status === 'excused' ? 'Phụ huynh xin phép' : null, recorded_by: teacherId }
              }),
            )
            .execute()
          recordCount += roster.length
        }
      }
    }

    const answers = await seedQuestions(db, levelIds)
    const examsStore = makeBackdatingExamsStore(db)
    let attemptCount = 0
    for (const level of Object.keys(studentsByLevel) as DemoLevel[]) {
      for (const [skill, questionCount] of [['reading', 8], ['listening', 6]] as const) {
        const title = examTitle(skill, level)
        const created = await createExam(
          examsStore,
          {
            title,
            level,
            skill,
            mode: 'random',
            questionCount,
            durationMinutes: 30,
            opensAt: new Date(now.getTime() - 40 * DAY_MS).toISOString(),
            closesAt: new Date(now.getTime() + 20 * DAY_MS).toISOString(),
          },
          creatorId,
        )
        if (!created.ok) throw new Error(`Cannot create exam for level ${level}`)
        const examId = created.exam.id
        for (const student of studentsByLevel[level]) {
          let ability = student.ability
          for (const daysAgo of [21, 9]) {
            const startedAt = new Date(now.getTime() - daysAgo * DAY_MS + Math.floor(rng() * 8) * 3_600_000)
            const started = await startAttempt(examsStore, examId, student.id, startedAt, rng, 'demo-seed')
            if (!started.ok) break
            const picked: Record<string, string> = {}
            for (const q of started.attempt.questions) {
              const source = answers.get(q.id)
              if (source) picked[q.id] = answerFor(source, ability)
            }
            const submitted = await submitAttempt(
              examsStore,
              examId,
              student.id,
              picked,
              new Date(startedAt.getTime() + (12 + Math.floor(rng() * 15)) * 60_000),
              'demo-seed',
            )
            attemptCount += 1
            if (!submitted.ok || submitted.attempt.result?.passed !== false) break
            ability = Math.min(0.97, ability + 0.15)
          }
        }
      }
    }

    console.log(
      `Seeded demo: ${branchIds.length} branches, ${teacherNo} classes/teachers, ${DEMO_STAFF.length} staff, ` +
        `${studentNo} students, ${answers.size} questions, ${sessionCount} sessions, ${recordCount} attendance records, ` +
        `${attemptCount} exam attempts.`,
    )
  } finally {
    await db.destroy()
  }
}

void main()
