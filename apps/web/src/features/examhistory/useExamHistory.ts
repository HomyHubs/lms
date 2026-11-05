import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { ExamAttemptReportQuery, ExamHistoryQuery } from '@lms/shared'
import { getExamAttemptReport, getExamHistory } from '@/lib/api'

/** slice-13 hooks. Own history when studentId is omitted; the backend enforces RBAC + branch scope. */
export function useExamHistory(query: Omit<ExamHistoryQuery, 'cursor'>, studentId?: string) {
  return useInfiniteQuery({
    queryKey: ['exam-history', studentId ?? 'me', query],
    queryFn: ({ pageParam }) => getExamHistory({ ...query, cursor: pageParam }, studentId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useExamAttemptReport(query: ExamAttemptReportQuery) {
  return useQuery({ queryKey: ['reports', 'exam-attempts', query], queryFn: () => getExamAttemptReport(query) })
}
