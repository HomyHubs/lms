import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExamSetDetail, ExamSetListQuery } from '@lms/shared'
import { getExamSet, listExamSets } from '@/lib/api'

const EXAM_SETS_KEY = ['exam-sets'] as const

export function useExamSets(query: Partial<ExamSetListQuery>) {
  return useQuery({ queryKey: [...EXAM_SETS_KEY, query], queryFn: () => listExamSets(query) })
}

export function useExamSet(id: string) {
  return useQuery({ queryKey: [...EXAM_SETS_KEY, 'detail', id], queryFn: () => getExamSet(id) })
}

/** Every exam-set command returns the fresh detail; the list is refetched for counts/status. */
export function useExamSetCommand<T>(run: (input: T) => Promise<ExamSetDetail | void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (detail) => {
      if (detail) qc.setQueryData([...EXAM_SETS_KEY, 'detail', detail.id], detail)
      void qc.invalidateQueries({ queryKey: EXAM_SETS_KEY, exact: false, refetchType: 'active' })
    },
  })
}
