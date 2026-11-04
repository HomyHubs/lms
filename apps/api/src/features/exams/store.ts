import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type {
  AttemptRow,
  CreateAttemptFields,
  CreateExamFields,
  ExamRow,
  ExamsStore,
  GradingPolicyRow,
  LevelRef,
  QuestionLite,
} from './service.js'

/** Cot de doc kem level_code (join levels) — dung chung cho list/find/re-select sau ghi. */
const EXAM_COLUMNS = [
  'exams.id',
  'exams.title',
  'exams.level_id',
  'levels.code as level_code',
  'exams.skill',
  'exams.question_count',
  'exams.duration_minutes',
  'exams.opens_at',
  'exams.closes_at',
  'exams.pass_percent',
  'exams.max_attempts',
  'exams.retake_cooldown_minutes',
  'exams.created_by',
  'exams.created_at',
] as const

const ATTEMPT_COLUMNS = [
  'id',
  'exam_id',
  'student_id',
  'question_ids',
  'question_snapshot',
  'session_key',
  'answer_revision',
  'answers',
  'started_at',
  'deadline_at',
  'submitted_at',
  'attempt_number',
  'score',
  'max_score',
  'passed',
  'graded_at',
  'grading_detail',
] as const

const POLICY_COLUMNS = [
  'exam_grading_policies.level_id',
  'levels.code as level_code',
  'exam_grading_policies.pass_percent',
  'exam_grading_policies.max_attempts',
  'exam_grading_policies.retake_cooldown_minutes',
] as const

/** Hien thuc ExamsStore bang Kysely tren Postgres THUC (khong mock). */
export function makeExamsStore(db: AppDb): ExamsStore {
  function selectExams() {
    return db
      .selectFrom('exams')
      .innerJoin('levels', 'levels.id', 'exams.level_id')
      .select(EXAM_COLUMNS)
  }

  async function requireExamById(id: string): Promise<ExamRow> {
    return selectExams().where('exams.id', '=', id).executeTakeFirstOrThrow()
  }

  function selectAttempts() {
    return db.selectFrom('exam_attempts').select(ATTEMPT_COLUMNS)
  }

  async function requireAttemptById(id: string): Promise<AttemptRow> {
    return selectAttempts().where('id', '=', id).executeTakeFirstOrThrow()
  }

  function selectPolicies() {
    return db
      .selectFrom('exam_grading_policies')
      .innerJoin('levels', 'levels.id', 'exam_grading_policies.level_id')
      .select(POLICY_COLUMNS)
  }

  return {
    async findLevelByCode(code): Promise<LevelRef | undefined> {
      return db
        .selectFrom('levels')
        .select(['id', 'code'])
        .where('code', '=', code)
        .executeTakeFirst()
    },

    async createExam(input: CreateExamFields) {
      const inserted = await db
        .insertInto('exams')
        .values({
          title: input.title,
          level_id: input.levelId,
          skill: input.skill,
          question_count: input.questionCount,
          duration_minutes: input.durationMinutes,
          opens_at: input.opensAt,
          closes_at: input.closesAt,
          pass_percent: input.passPercent,
          max_attempts: input.maxAttempts,
          retake_cooldown_minutes: input.retakeCooldownMinutes,
          created_by: input.createdBy,
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      return requireExamById(inserted.id)
    },

    async listExams() {
      return selectExams().orderBy('exams.created_at', 'desc').execute()
    },

    async findExamById(id) {
      return selectExams().where('exams.id', '=', id).executeTakeFirst()
    },

    async listQuestionIdsFor(levelId, skill): Promise<string[]> {
      const rows = await db
        .selectFrom('questions')
        .select('id')
        .where('level_id', '=', levelId)
        .where('skill', '=', skill)
        .execute()
      return rows.map((r) => r.id)
    },

    async findQuestionsByIds(ids): Promise<QuestionLite[]> {
      if (ids.length === 0) return []
      return db
        .selectFrom('questions')
        .select(['id', 'question_text', 'question_type', 'skill', 'points', 'options', 'correct_answer', 'explanation'])
        .where('id', 'in', ids)
        .execute()
    },

    async findAttempt(examId, studentId) {
      return selectAttempts()
        .where('exam_id', '=', examId)
        .where('student_id', '=', studentId)
        .orderBy('attempt_number', 'desc')
        .limit(1)
        .executeTakeFirst()
    },

    async listAttempts(examId, studentId) {
      let query = selectAttempts().where('exam_id', '=', examId)
      if (studentId !== undefined) query = query.where('student_id', '=', studentId)
      return query.orderBy('student_id').orderBy('attempt_number').execute()
    },

    async findLatestAttemptForStudent(studentId) {
      return selectAttempts()
        .where('student_id', '=', studentId)
        .orderBy('started_at', 'desc')
        .limit(1)
        .executeTakeFirst()
    },

    async createAttempt(input: CreateAttemptFields) {
      const inserted = await db
        .insertInto('exam_attempts')
        .values({
          exam_id: input.examId,
          student_id: input.studentId,
          question_ids: JSON.stringify(input.questionIds),
          question_snapshot: JSON.stringify(input.questionSnapshot),
          attempt_number: input.attemptNumber,
          session_key: input.sessionKey,
          started_at: input.startedAt,
          deadline_at: input.deadlineAt,
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      return requireAttemptById(inserted.id)
    },

    async claimSession(attemptId, sessionKey) {
      const updated = await db.updateTable('exam_attempts').set({ session_key: sessionKey })
        .where('id', '=', attemptId)
        .where((eb) => eb.or([eb('session_key', 'is', null), eb('session_key', '=', sessionKey)]))
        .returning('id').executeTakeFirst()
      return updated !== undefined
    },

    async saveAnswers(attemptId, answersJson, revision, nowIso) {
      return db.transaction().execute(async (trx) => {
        const row = await trx.selectFrom('exam_attempts').selectAll().where('id', '=', attemptId)
          .forUpdate().executeTakeFirstOrThrow()
        const clock = await sql<{ now: Date }>`select clock_timestamp() as now`.execute(trx)
        const now = new Date(Math.max(Date.parse(nowIso), clock.rows[0]!.now.getTime()))
        if (row.submitted_at !== null) return row
        if (now.getTime() >= row.deadline_at.getTime()) {
          return trx.updateTable('exam_attempts').set({ submitted_at: row.deadline_at.toISOString() })
            .where('id', '=', attemptId).returningAll().executeTakeFirstOrThrow()
        }
        if (row.answer_revision !== revision) return undefined
        return trx.updateTable('exam_attempts').set({ answers: answersJson, answer_revision: revision + 1 })
          .where('id', '=', attemptId).returningAll().executeTakeFirstOrThrow()
      })
    },

    async saveSubmission(attemptId, answersJson, submittedAtIso) {
      return db.transaction().execute(async (trx) => {
        const row = await trx.selectFrom('exam_attempts').selectAll().where('id', '=', attemptId)
          .forUpdate().executeTakeFirstOrThrow()
        if (row.submitted_at !== null) return row
        // Read the database clock AFTER acquiring the row lock; waiting cannot extend the deadline.
        const clock = await sql<{ now: Date }>`select clock_timestamp() as now`.execute(trx)
        const now = new Date(Math.max(Date.parse(submittedAtIso), clock.rows[0]!.now.getTime()))
        const late = now.getTime() >= row.deadline_at.getTime()
        return trx.updateTable('exam_attempts').set({
          answers: late ? row.answers : answersJson,
          submitted_at: late ? row.deadline_at.toISOString() : now.toISOString(),
        }).where('id', '=', attemptId).returningAll().executeTakeFirstOrThrow()
      })
    },

    async saveGrade(attemptId, grade) {
      // First grade wins; concurrent readers re-read the stored grade (trigger forbids rewriting it).
      const updated = await db.updateTable('exam_attempts').set({
        score: grade.score,
        max_score: grade.maxScore,
        passed: grade.passed,
        graded_at: grade.gradedAt,
        grading_detail: grade.detailJson,
      })
        .where('id', '=', attemptId)
        .where('submitted_at', 'is not', null)
        .where('graded_at', 'is', null)
        .returning(ATTEMPT_COLUMNS)
        .executeTakeFirst()
      return updated ?? requireAttemptById(attemptId)
    },

    async findGradingPolicy(levelId): Promise<GradingPolicyRow | undefined> {
      return selectPolicies().where('exam_grading_policies.level_id', '=', levelId).executeTakeFirst()
    },

    async listGradingPolicies(): Promise<GradingPolicyRow[]> {
      return selectPolicies().orderBy('levels.code').execute()
    },

    async upsertGradingPolicy(levelId, fields): Promise<GradingPolicyRow> {
      const values = {
        pass_percent: fields.passPercent,
        max_attempts: fields.maxAttempts,
        retake_cooldown_minutes: fields.retakeCooldownMinutes,
      }
      await db.insertInto('exam_grading_policies')
        .values({ level_id: levelId, ...values })
        .onConflict((oc) => oc.column('level_id').doUpdateSet({ ...values, updated_at: sql<string>`now()` }))
        .execute()
      return selectPolicies().where('exam_grading_policies.level_id', '=', levelId).executeTakeFirstOrThrow()
    },
  }
}
