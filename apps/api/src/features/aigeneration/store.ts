import type { AppDb } from '../../platform/db.js'
import { questionInsertValues } from '../questions/index.js'
import type { AiGenerationStore } from './service.js'

const REQUEST_COLUMNS = [
  'ai_generation_requests.id',
  'ai_generation_requests.created_by',
  'ai_generation_requests.level_id',
  'levels.code as level_code',
  'ai_generation_requests.skill',
  'ai_generation_requests.question_type',
  'ai_generation_requests.difficulty',
  'ai_generation_requests.question_count',
  'ai_generation_requests.sample_question_ids',
  'ai_generation_requests.prompt',
  'ai_generation_requests.status',
  'ai_generation_requests.created_at',
  'ai_generation_requests.updated_at',
] as const

const ITEM_COLUMNS = ['id', 'request_id', 'position', 'payload', 'status', 'question_id'] as const

/** Kysely store for slice-4.5 on real Postgres; status transitions are guarded in SQL. */
export function makeAiGenerationStore(db: AppDb): AiGenerationStore {
  function selectRequests() {
    return db
      .selectFrom('ai_generation_requests')
      .innerJoin('levels', 'levels.id', 'ai_generation_requests.level_id')
      .select(REQUEST_COLUMNS)
  }

  return {
    async findLevelByCode(code) {
      return db.selectFrom('levels').select(['id', 'code']).where('code', '=', code).executeTakeFirst()
    },

    async findQuestionsByIds(ids) {
      if (ids.length === 0) return []
      return db
        .selectFrom('questions')
        .select([
          'id',
          'level_id',
          'skill',
          'question_type',
          'difficulty',
          'question_text',
          'options',
          'correct_answer',
          'points',
          'explanation',
        ])
        .where('id', 'in', ids)
        .execute()
    },

    async createRequest(fields) {
      const inserted = await db
        .insertInto('ai_generation_requests')
        .values({
          created_by: fields.createdBy,
          level_id: fields.levelId,
          skill: fields.skill,
          question_type: fields.questionType,
          difficulty: fields.difficulty,
          question_count: fields.count,
          sample_question_ids: JSON.stringify(fields.sampleQuestionIds),
          prompt: fields.prompt,
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      return selectRequests()
        .where('ai_generation_requests.id', '=', inserted.id)
        .executeTakeFirstOrThrow()
    },

    async listRequests(createdBy) {
      let query = selectRequests()
      if (createdBy !== undefined) query = query.where('ai_generation_requests.created_by', '=', createdBy)
      return query.orderBy('ai_generation_requests.created_at', 'desc').execute()
    },

    async findRequest(id) {
      return selectRequests().where('ai_generation_requests.id', '=', id).executeTakeFirst()
    },

    async listItems(requestId) {
      return db
        .selectFrom('ai_generated_items')
        .select(ITEM_COLUMNS)
        .where('request_id', '=', requestId)
        .orderBy('position', 'asc')
        .execute()
    },

    async replaceItems(requestId, payloads) {
      return db.transaction().execute(async (trx) => {
        const moved = await trx
          .updateTable('ai_generation_requests')
          .set({ status: 'imported', updated_at: new Date().toISOString() })
          .where('id', '=', requestId)
          .where('status', 'in', ['draft', 'imported'])
          .returning('id')
          .executeTakeFirst()
        if (!moved) return false
        await trx.deleteFrom('ai_generated_items').where('request_id', '=', requestId).execute()
        await trx
          .insertInto('ai_generated_items')
          .values(payloads.map((payload, i) => ({ request_id: requestId, position: i + 1, payload })))
          .execute()
        return true
      })
    },

    async updateItem(requestId, itemId, patch) {
      const updated = await db
        .updateTable('ai_generated_items')
        .set({
          updated_at: new Date().toISOString(),
          ...(patch.payload !== undefined ? { payload: patch.payload } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        })
        .where('id', '=', itemId)
        .where('request_id', '=', requestId)
        .where('status', '<>', 'saved')
        .returning('id')
        .executeTakeFirst()
      return updated !== undefined
    },

    async setRequestStatus(requestId, status) {
      await db
        .updateTable('ai_generation_requests')
        .set({ status, updated_at: new Date().toISOString() })
        .where('id', '=', requestId)
        .execute()
    },

    async saveApproved(requestId, items) {
      return db.transaction().execute(async (trx) => {
        const claimed = await trx
          .updateTable('ai_generation_requests')
          .set({ status: 'saved_to_bank', updated_at: new Date().toISOString() })
          .where('id', '=', requestId)
          .where('status', '=', 'reviewed')
          .returning('id')
          .executeTakeFirst()
        if (!claimed) return null
        for (const item of items) {
          const question = await trx
            .insertInto('questions')
            .values(questionInsertValues(item.fields))
            .returning('id')
            .executeTakeFirstOrThrow()
          await trx
            .updateTable('ai_generated_items')
            .set({ status: 'saved', question_id: question.id, updated_at: new Date().toISOString() })
            .where('id', '=', item.itemId)
            .execute()
        }
        return items.length
      })
    },
  }
}
