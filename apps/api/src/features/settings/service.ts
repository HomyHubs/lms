import {
  DEFAULT_QUESTION_EDIT_PERMISSIONS,
  type QuestionEditPermissions,
} from '@lms/shared'

/**
 * Settings logic (slice-19, ADR 0015) over a store interface so it is easy to test.
 * Question-edit permissions are system-wide; a role with no stored row falls back to
 * DEFAULT_QUESTION_EDIT_PERMISSIONS (fail-safe toward restriction).
 */

export interface SettingsStore {
  listQuestionEditPermissions(): Promise<Array<{ role: string; can_edit: boolean }>>
  upsertQuestionEditPermissions(entries: Array<{ role: string; can_edit: boolean }>): Promise<void>
}

/** Known roles that the permission map covers (keys of QuestionEditPermissions). */
const ROLE_KEYS = Object.keys(DEFAULT_QUESTION_EDIT_PERMISSIONS) as Array<
  keyof QuestionEditPermissions
>

/** Read stored rows and merge over the defaults so missing roles keep their default. */
export async function getQuestionEditPermissions(
  store: SettingsStore,
): Promise<QuestionEditPermissions> {
  const rows = await store.listQuestionEditPermissions()
  const merged: QuestionEditPermissions = { ...DEFAULT_QUESTION_EDIT_PERMISSIONS }
  for (const row of rows) {
    if ((ROLE_KEYS as string[]).includes(row.role)) {
      merged[row.role as keyof QuestionEditPermissions] = row.can_edit
    }
  }
  return merged
}

/** Persist every role's flag (full replace of the 5 known roles). */
export async function setQuestionEditPermissions(
  store: SettingsStore,
  perms: QuestionEditPermissions,
): Promise<void> {
  await store.upsertQuestionEditPermissions(
    ROLE_KEYS.map((role) => ({ role, can_edit: perms[role] })),
  )
}
