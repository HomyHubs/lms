import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SubmitExamRequest } from '@lms/shared'
import { listExams, startExamAttempt, submitExamAttempt } from '@/lib/api'

const EXAMS_KEY = ['exams'] as const

export function useExams() {
  return useQuery({ queryKey: EXAMS_KEY, queryFn: listExams })
}

export function useStartExamAttempt() {
  return useMutation({ mutationFn: (examId: string) => startExamAttempt(examId) })
}

export function useSubmitExamAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, input }: { examId: string; input: SubmitExamRequest }) =>
      submitExamAttempt(examId, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: EXAMS_KEY }),
  })
}
