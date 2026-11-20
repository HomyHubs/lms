import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { ExamAttemptReportQuery, ExamHistoryQuery, type ExamAttemptReport, type ExamHistoryPage } from '@lms/shared'
import { getSessionUser, type Rbac } from '../access/index.js'
import type { BranchScope } from '../userbranches/index.js'
import { listStudentHistory, loadExamAttemptReport, type ExamHistoryStore } from './service.js'

interface ExamHistoryRoutesDeps {
  rbac: Rbac
  examHistoryStore: ExamHistoryStore
  branchScope: BranchScope
}

const StudentIdParam = z.object({ id: z.string().uuid() })

/** Exam history (student: own; Admin/Teacher: students of their branches) + attempt report (slice-13). */
export async function examHistoryRoutes(app: FastifyInstance, deps: ExamHistoryRoutesDeps): Promise<void> {
  const { rbac, examHistoryStore: store, branchScope } = deps
  const requireStudent = rbac.requireRole('student')
  const requireManager = rbac.requireRole('admin', 'teacher')

  async function sendHistory(request: FastifyRequest, reply: FastifyReply, studentId: string) {
    const parsed = ExamHistoryQuery.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: 'Bo loc lich su thi khong hop le' })
    const outcome = await listStudentHistory(store, studentId, parsed.data, new Date())
    if (!outcome.ok) return reply.code(400).send({ error: 'Con tro phan trang khong hop le' })
    const body: ExamHistoryPage = outcome.page
    return body
  }

  app.get('/me/exam-attempts', { preHandler: requireStudent }, async (request, reply) =>
    sendHistory(request, reply, getSessionUser(request).id),
  )

  app.get('/students/:id/exam-attempts', { preHandler: requireManager }, async (request, reply) => {
    const params = StudentIdParam.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'Ma hoc vien khong hop le' })
    const branchIds = await branchScope.branchIdsForUser(getSessionUser(request).id)
    if (!(await store.isStudentInBranches(params.data.id, branchIds))) {
      return reply.code(403).send({ error: 'Hoc vien khong thuoc co so ban phu trach' })
    }
    return sendHistory(request, reply, params.data.id)
  })

  app.get('/reports/exam-attempts', { preHandler: requireManager }, async (request, reply) => {
    const parsed = ExamAttemptReportQuery.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: 'Bo loc bao cao thi khong hop le' })
    const { branchId, cursor, ...rest } = parsed.data
    const scoped = await branchScope.branchIdsForUser(getSessionUser(request).id)
    if (branchId && !scoped.includes(branchId)) return reply.code(404).send({ error: 'Khong tim thay co so' })
    const outcome = await loadExamAttemptReport(
      store,
      { ...rest, branchIds: branchId ? [branchId] : scoped },
      { cursor },
      new Date(),
    )
    if (!outcome.ok) return reply.code(400).send({ error: 'Con tro phan trang khong hop le' })
    const body: ExamAttemptReport = outcome.report
    return body
  })
}
