import type { AppDb } from '../../platform/db.js'
import type {
  AttemptRow,
  CreateAttemptFields,
  CreateExamFields,
  ExamRow,
  ExamsStore,
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
  'exams.created_by',
  'exams.created_at',
] as const

const ATTEMPT_COLUMNS = [
  'id',
  'exam_id',
  'student_id',
  'question_ids',
  'answers',
  'started_at',
  'deadline_at',
  'submitted_at',
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
        .select(['id', 'question_text', 'question_type', 'skill', 'points', 'options'])
        .where('id', 'in', ids)
        .execute()
    },

    async findAttempt(examId, studentId) {
      return selectAttempts()
        .where('exam_id', '=', examId)
        .where('student_id', '=', studentId)
        .executeTakeFirst()
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
          started_at: input.startedAt,
          deadline_at: input.deadlineAt,
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      return requireAttemptById(inserted.id)
    },

    async saveSubmission(attemptId, answersJson, submittedAtIso) {
      const updated = await db
        .updateTable('exam_attempts')
        .set({ answers: answersJson, submitted_at: submittedAtIso })
        .where('id', '=', attemptId)
        .returning('id')
        .executeTakeFirstOrThrow()
      return requireAttemptById(updated.id)
    },
  }
}
