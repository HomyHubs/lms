import type { FastifyInstance } from 'fastify'
import { QuestionEditPermissions as QuestionEditPermissionsSchema } from '@lms/shared'
import type { Rbac } from '../access/index.js'
import type { SettingsStore } from './service.js'
import { getQuestionEditPermissions, setQuestionEditPermissions } from './service.js'

interface SettingsRoutesDeps {
  rbac: Rbac
  settingsStore: SettingsStore
}

/**
 * Settings routes (slice-19, ADR 0015). Only Admin/Superadmin may read or change the
 * system-wide question-edit permissions. The GET response is merged with defaults so
 * roles without a stored row report their default value.
 */
export async function settingsRoutes(app: FastifyInstance, deps: SettingsRoutesDeps): Promise<void> {
  const { rbac, settingsStore } = deps
  const requireAdmin = rbac.requireRole('admin')

  app.get(
    '/settings/question-edit-permissions',
    { preHandler: requireAdmin },
    async () => getQuestionEditPermissions(settingsStore),
  )

  app.put(
    '/settings/question-edit-permissions',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = QuestionEditPermissionsSchema.safeParse(request.body)
      if (!parsed.success) {
        reply.code(400)
        return { error: parsed.error.issues[0]?.message ?? 'Dữ liệu quyền không hợp lệ' }
      }
      await setQuestionEditPermissions(settingsStore, parsed.data)
      return getQuestionEditPermissions(settingsStore)
    },
  )
}
