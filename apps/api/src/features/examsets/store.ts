import { sql } from 'kysely'
import type { AppDb } from '../../platform/db.js'
import { questionInsertValues } from '../questions/index.js'
import type { ExamSetsStore } from './service.js'

const SET_COLUMNS = [
  'exam_sets.id',
  'exam_sets.title',
  'exam_sets.level_id',
  'levels.code as level_code',
  'exam_sets.skill',
  'exam_sets.description',
  'exam_sets.status',
  'exam_sets.created_by',
  'exam_sets.created_at',
  'exam_sets.updated_at',
  'exam_sets.published_at',
] as const

const QUESTION_COLUMNS = [
  'questions.id',
  'questions.level_id',
  'levels.code as level_code',
  'questions.skill',
  'questions.question_type',
  'questions.difficulty',
  'questions.question_text',
  'questions.options',
  'questions.correct_answer',
  'questions.points',
  'questions.explanation',
  'questions.source_reference',
  'questions.source',
  'questions.created_at',
] as const

/** ExamSetsStore on real Postgres; published-set immutability is also enforced by DB triggers. */
export function makeExamSetsStore(db: AppDb): ExamSetsStore {
  function selectSets() {
    return db
      .selectFrom('exam_sets')
      .innerJoin('levels', 'levels.id', 'exam_sets.level_id')
      .select(SET_COLUMNS)
      .select(sql<number>`(select count(*)::int from exam_set_items i where i.exam_set_id = exam_sets.id)`.as('item_count'))
  }

  function requireSet(id: string) {
    return selectSets().where('exam_sets.id', '=', id).executeTakeFirstOrThrow()
  }

  function selectQuestions() {
    return db.selectFrom('questions').innerJoin('levels', 'levels.id', 'questions.level_id').select(QUESTION_COLUMNS)
  }

  return {
    async findLevelByCode(code) {
      return db.selectFrom('levels').select(['id', 'code']).where('code', '=', code).executeTakeFirst()
    },

    async listSets(filter) {
      let query = selectSets()
      if (filter.levelId) query = query.where('exam_sets.level_id', '=', filter.levelId)
      if (filter.skill) query = query.where('exam_sets.skill', '=', filter.skill)
      if (filter.status) query = query.where('exam_sets.status', '=', filter.status)
      return query.orderBy('exam_sets.updated_at', 'desc').execute()
    },

    async findSet(id) {
      return selectSets().where('exam_sets.id', '=', id).executeTakeFirst()
    },

    async createSet(input) {
      const inserted = await db.insertInto('exam_sets').values({
        title: input.title,
        level_id: input.levelId,
        skill: input.skill,
        description: input.description,
        created_by: input.createdBy,
      }).returning('id').executeTakeFirstOrThrow()
      return requireSet(inserted.id)
    },

    async updateSet(id, patch) {
      await db.updateTable('exam_sets').set({
        updated_at: new Date().toISOString(),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
      }).where('id', '=', id).execute()
      return requireSet(id)
    },

    async deleteSet(id) {
      await db.deleteFrom('exam_sets').where('id', '=', id).execute()
    },

    async listItems(id) {
      return db
        .selectFrom('exam_set_items')
        .innerJoin('questions', 'questions.id', 'exam_set_items.question_id')
        .innerJoin('levels', 'levels.id', 'questions.level_id')
        .select(QUESTION_COLUMNS)
        .where('exam_set_items.exam_set_id', '=', id)
        .orderBy('exam_set_items.position')
        .execute()
    },

    async findQuestions(ids) {
      if (ids.length === 0) return []
      return selectQuestions().where('questions.id', 'in', ids).execute()
    },

    async replaceItems(id, questionIds) {
      await db.transaction().execute(async (trx) => {
        await trx.deleteFrom('exam_set_items').where('exam_set_id', '=', id).execute()
        if (questionIds.length > 0) {
          await trx.insertInto('exam_set_items')
            .values(questionIds.map((questionId, index) => ({ exam_set_id: id, position: index + 1, question_id: questionId })))
            .execute()
        }
        await trx.updateTable('exam_sets').set({ updated_at: new Date().toISOString() }).where('id', '=', id).execute()
      })
    },

    async appendNewQuestion(id, fields) {
      await db.transaction().execute(async (trx) => {
        // Row lock serializes concurrent appends so each gets its own position.
        await trx.selectFrom('exam_sets').select('id').where('id', '=', id).forUpdate().executeTakeFirstOrThrow()
        const question = await trx.insertInto('questions').values(questionInsertValues(fields))
          .returning('id').executeTakeFirstOrThrow()
        const last = await trx.selectFrom('exam_set_items').select((eb) => eb.fn.max('position').as('position'))
          .where('exam_set_id', '=', id).executeTakeFirst()
        await trx.insertInto('exam_set_items')
          .values({ exam_set_id: id, position: Number(last?.position ?? 0) + 1, question_id: question.id })
          .execute()
        await trx.updateTable('exam_sets').set({ updated_at: new Date().toISOString() }).where('id', '=', id).execute()
      })
    },

    async importSet(input, questions) {
      const setId = await db.transaction().execute(async (trx) => {
        const set = await trx.insertInto('exam_sets').values({
          title: input.title,
          level_id: input.levelId,
          skill: input.skill,
          description: input.description,
          created_by: input.createdBy,
        }).returning('id').executeTakeFirstOrThrow()
        // One insert per question keeps position = confirmed preview order (<= 200 rows).
        for (const [index, fields] of questions.entries()) {
          const question = await trx.insertInto('questions').values(questionInsertValues(fields))
            .returning('id').executeTakeFirstOrThrow()
          await trx.insertInto('exam_set_items')
            .values({ exam_set_id: set.id, position: index + 1, question_id: question.id })
            .execute()
        }
        return set.id
      })
      return requireSet(setId)
    },

    async publish(id, publishedAtIso) {
      await db.updateTable('exam_sets')
        .set({ status: 'published', published_at: publishedAtIso, updated_at: publishedAtIso })
        .where('id', '=', id).where('status', '=', 'draft').execute()
      return requireSet(id)
    },

    async archive(id) {
      await db.updateTable('exam_sets')
        .set({ status: 'archived', updated_at: new Date().toISOString() })
        .where('id', '=', id).where('status', '=', 'published').execute()
      return requireSet(id)
    },

    async duplicate(id, title, createdBy) {
      const copyId = await db.transaction().execute(async (trx) => {
        const source = await trx.selectFrom('exam_sets').select(['level_id', 'skill', 'description'])
          .where('id', '=', id).executeTakeFirstOrThrow()
        const copy = await trx.insertInto('exam_sets').values({
          title, level_id: source.level_id, skill: source.skill, description: source.description, created_by: createdBy,
        }).returning('id').executeTakeFirstOrThrow()
        const items = await trx.selectFrom('exam_set_items').select(['position', 'question_id'])
          .where('exam_set_id', '=', id).orderBy('position').execute()
        if (items.length > 0) {
          await trx.insertInto('exam_set_items')
            .values(items.map((item) => ({ exam_set_id: copy.id, position: item.position, question_id: item.question_id })))
            .execute()
        }
        return copy.id
      })
      return requireSet(copyId)
    },
  }
}
