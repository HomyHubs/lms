import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GradeAttemptRequest } from '@lms/shared'
import { getGradingAttempt, gradeAttempt, importGrades, listGradingQueue } from '@/lib/api'

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

/**
 * slice-9a (revised): nhap bang diem Speaking/Writing tu file Excel/CSV theo ma hoc vien (= SDT).
 * Thanh cong -> lam moi hang doi cham (cac bai da co diem bien mat khoi queue).
 */
export function useImportGrades() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, file }: { examId: string; file: File }) =>
      importGrades(file, { examId, fileName: file.name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['grading'] }),
  })
}
