import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkHoursReportQuery } from '@lms/shared'
import { checkShift, checkTeacherShift, getMyTimesheet, getTeacherTimesheet, getWorkHoursReport, listBranches } from '@/lib/api'

/** slice-8 work-hours hooks. The backend enforces RBAC + branch scope; these only fetch/cache. */

export function useMyTimesheet(month: string, enabled: boolean) {
  return useQuery({ queryKey: ['workhours', 'me', month], queryFn: () => getMyTimesheet(month), enabled })
}

export function useCheckShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: checkShift,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['workhours', 'me'] }),
  })
}

export function useWorkHoursReport(query: WorkHoursReportQuery, enabled: boolean) {
  return useQuery({ queryKey: ['workhours', 'report', query], queryFn: () => getWorkHoursReport(query), enabled })
}

export function useTeacherTimesheet(teacherId: string, branchId: string, month: string) {
  return useQuery({ queryKey: ['workhours', 'teacher', teacherId, branchId, month], queryFn: () => getTeacherTimesheet(teacherId, branchId, month), enabled: Boolean(teacherId && branchId) })
}

export function useCheckTeacherShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teacherId, branchId, action }: { teacherId: string; branchId: string; action: 'check-in' | 'check-out' }) => checkTeacherShift(teacherId, branchId, action),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['workhours'] }),
    onError: () => void qc.invalidateQueries({ queryKey: ['workhours', 'teacher'] }),
  })
}

export function useBranches(enabled: boolean) {
  return useQuery({ queryKey: ['branches'], queryFn: listBranches, enabled })
}
