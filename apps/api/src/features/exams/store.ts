import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import type {
  AttemptRow,
  CreateAttemptFields,
  CreateExamFields,
  ExamRow,
  ExamsStore,
  GradingPolicyRow,
  GradingRow,
  LevelRef,
  QuestionLite,
  QuestionMediaRef,
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
  'exams.mode',
  'exams.exam_set_id',
  'exams.shuffle_questions',
  'exams.shuffle_options',
  'exams.retake_strategy',
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
  'graded_by',
  'grader_feedback',
  'exam_set_id',
] as const

const JOINED_ATTEMPT_COLUMNS = ATTEMPT_COLUMNS.map((column) => `exam_attempts.${column}` as const)

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
      .select(sql<string[]>`coalesce((select array_agg(l.exam_set_id::text order by l.position)
        from exam_set_links l where l.exam_id = exams.id), '{}')`.as('exam_set_ids'))
      .select(sql<string[]>`coalesce((select array_agg(ec.class_id::text order by ec.class_id)
        from exam_classes ec where ec.exam_id = exams.id), '{}')`.as('exam_class_ids'))
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

  function selectGradingRows() {
    return db
      .selectFrom('exam_attempts')
      .innerJoin('exams', 'exams.id', 'exam_attempts.exam_id')
      .innerJoin('levels', 'levels.id', 'exams.level_id')
      .innerJoin('users', 'users.id', 'exam_attempts.student_id')
      .select(JOINED_ATTEMPT_COLUMNS)
      .select(['exams.title as exam_title', 'levels.code as level_code', 'exams.skill', 'exams.pass_percent',
        'users.phone_number as student_phone',
        'users.first_name as student_first_name', 'users.last_name as student_last_name'])
  }

  /** slice-12: attaches image links so they are frozen into the attempt snapshot. */
  async function withMedia(rows: QuestionLite[]): Promise<QuestionLite[]> {
    if (rows.length === 0) return rows
    const links = await db.selectFrom('question_media')
      .select(['question_id', 'media_id', 'slot', 'option_index'])
      .where('question_id', 'in', rows.map((r) => r.id))
      .orderBy('question_id').orderBy('position')
      .execute()
    const byQuestion = new Map<string, QuestionMediaRef[]>()
    for (const link of links) {
      const list = byQuestion.get(link.question_id) ?? []
      list.push({ mediaId: link.media_id, slot: link.slot === 'option' ? 'option' : 'stem', optionIndex: link.option_index })
      byQuestion.set(link.question_id, list)
    }
    return rows.map((r) => {
      const media = byQuestion.get(r.id)
      return media ? { ...r, media } : r
    })
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
      const examSetIds = input.examSetIds ?? []
      const id = await db.transaction().execute(async (trx) => {
        const inserted = await trx
        .insertInto('exams')
        .values({
          mode: input.mode ?? 'random',
          exam_set_id: examSetIds[0] ?? null,
          shuffle_questions: input.shuffleQuestions ?? false,
          shuffle_options: input.shuffleOptions ?? false,
          retake_strategy: input.retakeStrategy ?? 'same_set_shuffled',
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
        if (examSetIds.length > 0) {
          await trx.insertInto('exam_set_links')
            .values(examSetIds.map((examSetId, index) => ({ exam_id: inserted.id, exam_set_id: examSetId, position: index + 1 })))
            .execute()
        }
        // slice-14: gan lop ap dung (cung cap do) cho de.
        const classIds = input.classIds ?? []
        if (classIds.length > 0) {
          await trx.insertInto('exam_classes')
            .values(classIds.map((classId) => ({ exam_id: inserted.id, class_id: classId })))
            .execute()
        }
        return inserted.id
      })
      return requireExamById(id)
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
        // Set-authored questions stay out of random papers so they cannot leak before the set's exam opens.
        .where('source', '<>', 'exam_set')
        .execute()
      return rows.map((r) => r.id)
    },

    async findExamSetRefs(ids) {
      if (ids.length === 0) return []
      const rows = await db
        .selectFrom('exam_sets')
        .leftJoin('exam_set_items', 'exam_set_items.exam_set_id', 'exam_sets.id')
        .select(['exam_sets.id', 'exam_sets.status', 'exam_sets.level_id', 'exam_sets.skill'])
        .select((eb) => eb.fn.count<string>('exam_set_items.question_id').as('item_count'))
        .where('exam_sets.id', 'in', ids)
        .groupBy('exam_sets.id')
        .execute()
      return rows.map((row) => ({ ...row, item_count: Number(row.item_count) }))
    },

    async listExamSetQuestions(examSetId): Promise<QuestionLite[]> {
      const rows = await db
        .selectFrom('exam_set_items')
        .innerJoin('questions', 'questions.id', 'exam_set_items.question_id')
        .select(['questions.id', 'questions.question_text', 'questions.question_type', 'questions.skill',
          'questions.points', 'questions.options', 'questions.correct_answer', 'questions.explanation'])
        .where('exam_set_items.exam_set_id', '=', examSetId)
        .orderBy('exam_set_items.position')
        .execute()
      return withMedia(rows)
    },

    async findQuestionsByIds(ids): Promise<QuestionLite[]> {
      if (ids.length === 0) return []
      const rows = await db
        .selectFrom('questions')
        .select(['id', 'question_text', 'question_type', 'skill', 'points', 'options', 'correct_answer', 'explanation'])
        .where('id', 'in', ids)
        .execute()
      return withMedia(rows)
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
      const mediaIds = [...new Set(input.questionSnapshot.flatMap((q) => (q.media ?? []).map((m) => m.mediaId)))]
      const inserted = await db.transaction().execute(async (trx) => {
        const attempt = await trx
        .insertInto('exam_attempts')
        .values({
          exam_id: input.examId,
          student_id: input.studentId,
          question_ids: JSON.stringify(input.questionIds),
          question_snapshot: JSON.stringify(input.questionSnapshot),
          attempt_number: input.attemptNumber,
          session_key: input.sessionKey,
          exam_set_id: input.examSetId ?? null,
          started_at: input.startedAt,
          deadline_at: input.deadlineAt,
        })
        .returning('id')
        .executeTakeFirstOrThrow()
        if (mediaIds.length > 0) {
          await trx.insertInto('exam_attempt_media')
            .values(mediaIds.map((mediaId) => ({ attempt_id: attempt.id, media_id: mediaId })))
            .execute()
        }
        return attempt
      })
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
          return trx.updateTable('exam_attempts')
            .set({ submitted_at: row.deadline_at.toISOString(), submit_reason: 'deadline_auto' })
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
          submit_reason: late ? 'deadline_auto' : 'manual',
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
        graded_by: grade.gradedBy ?? null,
        grader_feedback: grade.feedback ?? null,
      })
        .where('id', '=', attemptId)
        .where('submitted_at', 'is not', null)
        .where('graded_at', 'is', null)
        .returning(ATTEMPT_COLUMNS)
        .executeTakeFirst()
      return updated ?? requireAttemptById(attemptId)
    },

    async listUngradedAttempts(skills, nowIso): Promise<GradingRow[]> {
      return selectGradingRows()
        .where('exams.skill', 'in', [...skills])
        .where('exam_attempts.graded_at', 'is', null)
        .where((eb) => eb.or([
          eb('exam_attempts.submitted_at', 'is not', null),
          eb('exam_attempts.deadline_at', '<=', new Date(nowIso)),
        ]))
        .orderBy('exam_attempts.deadline_at')
        .execute()
    },

    async findGradingRow(attemptId): Promise<GradingRow | undefined> {
      return selectGradingRows().where('exam_attempts.id', '=', attemptId).executeTakeFirst()
    },

    async listStudentPhonesInBranches(branchIds): Promise<string[]> {
      // SDT (ma hoc vien) cua hoc vien ghi danh lop thuoc cac co so da cho — dung cho branch-scope.
      if (branchIds.length === 0) return []
      const rows = await db
        .selectFrom('enrollments')
        .innerJoin('classes', 'classes.id', 'enrollments.class_id')
        .innerJoin('users', 'users.id', 'enrollments.student_id')
        .where('classes.branch_id', 'in', branchIds)
        .select('users.phone_number as phone')
        .distinct()
        .execute()
      return rows.map((r) => r.phone)
    },

    async listClassRefsForLevel(levelId): Promise<{ id: string; branchId: string }[]> {
      // slice-14: cac lop cung cap do voi de (map lop -> course -> level), kem co so.
      const rows = await db
        .selectFrom('classes')
        .innerJoin('courses', 'courses.id', 'classes.course_id')
        .where('courses.level_id', '=', levelId)
        .select(['classes.id as id', 'classes.branch_id as branchId'])
        .execute()
      return rows
    },

    async listStudentPhonesInClasses(classIds): Promise<string[]> {
      // slice-14: SDT hoc vien ghi danh CAC LOP da cho — gioi han cohort cham diem theo lop.
      if (classIds.length === 0) return []
      const rows = await db
        .selectFrom('enrollments')
        .innerJoin('users', 'users.id', 'enrollments.student_id')
        .where('enrollments.class_id', 'in', classIds)
        .select('users.phone_number as phone')
        .distinct()
        .execute()
      return rows.map((r) => r.phone)
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
