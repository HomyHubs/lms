import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { StudentReportQuery, UpdateClassificationPolicyRequest } from '@lms/shared'
import {
  getStudentReport,
  listBranches,
  listClasses,
  listClassificationPolicies,
  listLevels,
  updateClassificationPolicy,
} from '@/lib/api'

/** slice-7 report hooks. The backend enforces admin RBAC + branch scope; these only fetch/cache. */

export function useReportFilters() {
  const branches = useQuery({ queryKey: ['branches'], queryFn: listBranches })
  const levels = useQuery({ queryKey: ['levels'], queryFn: listLevels })
  const classes = useQuery({ queryKey: ['classes'], queryFn: listClasses })
  return { branches: branches.data ?? [], levels: levels.data ?? [], classes: classes.data ?? [] }
}

export function useStudentReport(query: StudentReportQuery) {
  return useQuery({ queryKey: ['reports', 'students', query], queryFn: () => getStudentReport(query) })
}

export function useClassificationPolicies() {
  return useQuery({ queryKey: ['reports', 'policies'], queryFn: listClassificationPolicies })
}

export function useUpdateClassificationPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ levelId, input }: { levelId: string; input: UpdateClassificationPolicyRequest }) =>
      updateClassificationPolicy(levelId, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}
