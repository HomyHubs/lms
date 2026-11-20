import { useInfiniteQuery } from '@tanstack/react-query'
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

/**
 * Exam attempt report (slice-13 + slice-24). byExam/byBranch/byClass/byLevel come from the first
 * page (aggregated server-side over the scope); the detail `attempts` list pages via `nextCursor`.
 */
export function useExamAttemptReport(query: Omit<ExamAttemptReportQuery, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: ['reports', 'exam-attempts', query],
    queryFn: ({ pageParam }) => getExamAttemptReport({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}
