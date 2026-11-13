import type { AppDb } from '../../platform/db.js'
import type { SettingsStore } from './service.js'

/**
 * Kysely implementation of SettingsStore (slice-19, ADR 0015) over a real Postgres.
 * The `question_edit_permissions` table holds one row per role; missing rows mean
 * "use the default" — the merge happens in the service, not here.
 */
export function makeSettingsStore(db: AppDb): SettingsStore {
  return {
    async listQuestionEditPermissions() {
      return db
        .selectFrom('question_edit_permissions')
        .select(['role', 'can_edit'])
        .execute()
    },
    async upsertQuestionEditPermissions(entries) {
      if (entries.length === 0) return
      await db
        .insertInto('question_edit_permissions')
        .values(entries.map((e) => ({ role: e.role, can_edit: e.can_edit })))
        .onConflict((oc) => oc.column('role').doUpdateSet({ can_edit: (eb) => eb.ref('excluded.can_edit') }))
        .execute()
    },
  }
}
