import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GradeAttemptRequest } from '@lms/shared'
import { getGradingAttempt, gradeAttempt, listGradingQueue } from '@/lib/api'

/** slice-9a manual grading hooks. The backend enforces RBAC (Admin/Teacher); these only fetch/cache. */

export function useGradingQueue() {
  return useQuery({ queryKey: ['grading', 'queue'], queryFn: listGradingQueue })
}

export function useGradingAttempt(attemptId: string | null) {
  return useQuery({
    queryKey: ['grading', 'attempt', attemptId],
    queryFn: () => getGradingAttempt(attemptId ?? ''),
    enabled: attemptId !== null,
  })
}

export function useGradeAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: GradeAttemptRequest }) => gradeAttempt(attemptId, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['grading'] }),
  })
}
