import type { AppDb } from '../../platform/db.js'
import type { MediaStore } from './service.js'

const ASSET_COLUMNS = ['id', 'sha256', 'mime', 'bytes', 'width', 'height', 'storage_key'] as const

export function makeMediaStore(db: AppDb): MediaStore {
  return {
    async findAssetBySha(sha256) {
      return db.selectFrom('media_assets').select(ASSET_COLUMNS).where('sha256', '=', sha256).executeTakeFirst()
    },

    async insertAsset(fields) {
      const inserted = await db.insertInto('media_assets').values(fields)
        .onConflict((oc) => oc.column('sha256').doNothing())
        .returning(ASSET_COLUMNS).executeTakeFirst()
      return inserted
        ?? db.selectFrom('media_assets').select(ASSET_COLUMNS).where('sha256', '=', fields.sha256).executeTakeFirstOrThrow()
    },

    async findAssetById(id) {
      return db.selectFrom('media_assets').select(ASSET_COLUMNS).where('id', '=', id).executeTakeFirst()
    },

    async countAssets(ids) {
      const row = await db.selectFrom('media_assets').select((eb) => eb.fn.countAll<string>().as('count'))
        .where('id', 'in', ids).executeTakeFirstOrThrow()
      return Number(row.count)
    },

    async isInStudentAttempt(mediaId, studentId) {
      const row = await db.selectFrom('exam_attempt_media')
        .innerJoin('exam_attempts', 'exam_attempts.id', 'exam_attempt_media.attempt_id')
        .select('exam_attempt_media.media_id')
        .where('exam_attempt_media.media_id', '=', mediaId)
        .where('exam_attempts.student_id', '=', studentId)
        .limit(1).executeTakeFirst()
      return row !== undefined
    },

    async findQuestionOptions(questionId) {
      return db.selectFrom('questions').select('options').where('id', '=', questionId).executeTakeFirst()
    },

    async listQuestionMedia(questionId) {
      return db.selectFrom('question_media').select(['media_id', 'slot', 'option_index'])
        .where('question_id', '=', questionId).orderBy('position').execute()
    },

    async replaceQuestionMedia(questionId, items) {
      await db.transaction().execute(async (trx) => {
        await trx.deleteFrom('question_media').where('question_id', '=', questionId).execute()
        if (items.length === 0) return
        await trx.insertInto('question_media').values(items.map((m, index) => ({
          question_id: questionId, position: index + 1, media_id: m.mediaId, slot: m.slot, option_index: m.optionIndex,
        }))).execute()
      })
    },
  }
}
