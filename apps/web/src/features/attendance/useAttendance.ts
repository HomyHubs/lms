import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateClassSessionRequest, MarkAttendanceRequest } from '@lms/shared'
import {
  assignClassTeacher,
  cancelClassSession,
  createClassSession,
  getAttendanceRates,
  getBranchAttendanceRates,
  getMyAttendance,
  getSessionAttendance,
  getStudentAttendance,
  getTodayAttendanceSummary,
  listClassSessions,
  listClassTeachers,
  listClasses,
  listTeachingClasses,
  listUsers,
  markSessionAttendance,
  removeClassTeacher,
} from '@/lib/api'

/** slice-6 attendance hooks. The backend enforces RBAC; these only fetch/cache. */

export function useTeachingClasses(enabled: boolean) {
  return useQuery({ queryKey: ['attendance', 'teaching-classes'], queryFn: listTeachingClasses, enabled })
}

export function useAdminClasses(enabled: boolean) {
  return useQuery({ queryKey: ['classes'], queryFn: listClasses, enabled })
}

export function useTeachers(enabled: boolean) {
  return useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled,
    select: (users) => users.filter((u) => u.role === 'teacher'),
  })
}

export function useClassTeachers(classId: string | null) {
  return useQuery({
    queryKey: ['attendance', 'class-teachers', classId],
    queryFn: () => listClassTeachers(classId as string),
    enabled: classId !== null,
  })
}

export function useAssignTeacher(classId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teacherId: string) => assignClassTeacher(classId as string, teacherId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['attendance', 'class-teachers', classId] }),
  })
}

export function useRemoveTeacher(classId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teacherId: string) => removeClassTeacher(classId as string, teacherId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['attendance', 'class-teachers', classId] }),
  })
}

export function useClassSessions(classId: string | null) {
  return useQuery({
    queryKey: ['attendance', 'sessions', classId],
    queryFn: () => listClassSessions(classId as string),
    enabled: classId !== null,
  })
}

export function useCreateSession(classId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClassSessionRequest) => createClassSession(classId as string, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['attendance', 'sessions', classId] }),
  })
}

/** slice-8: cancel an untaught session so it can be made up later. */
export function useCancelSession(classId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => cancelClassSession(sessionId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['attendance', 'sessions', classId] }),
  })
}

export function useSessionAttendance(sessionId: string | null) {
  return useQuery({
    queryKey: ['attendance', 'session', sessionId],
    queryFn: () => getSessionAttendance(sessionId as string),
    enabled: sessionId !== null,
  })
}

export function useMarkAttendance(sessionId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MarkAttendanceRequest) => markSessionAttendance(sessionId as string, input),
    onSuccess: (data) => {
      qc.setQueryData(['attendance', 'session', sessionId], data)
      void qc.invalidateQueries({ queryKey: ['attendance', 'rates'] })
    },
  })
}

export function useClassRates(classId: string | null) {
  return useQuery({
    queryKey: ['attendance', 'rates', classId],
    queryFn: () => getAttendanceRates({ classId: classId as string }),
    enabled: classId !== null,
  })
}

/** slice-16: attendance rates for a branch (overall + per-class). Admin-only on the backend. */
export function useBranchRates(branchId: string | null) {
  return useQuery({
    queryKey: ['attendance', 'branch-rates', branchId],
    queryFn: () => getBranchAttendanceRates(branchId as string),
    enabled: branchId !== null,
  })
}

export function useStudentAttendance(studentId: string | null) {
  return useQuery({
    queryKey: ['attendance', 'student', studentId],
    queryFn: () => getStudentAttendance(studentId as string),
    enabled: studentId !== null,
  })
}

export function useMyAttendance(enabled: boolean) {
  return useQuery({ queryKey: ['attendance', 'me'], queryFn: getMyAttendance, enabled })
}

/** Cac lop co buoi hoc trong ngay chon (mac dinh hom nay) + ty le diem danh (admin). */
export function useTodayAttendanceSummary(enabled: boolean, date?: string) {
  return useQuery({
    queryKey: ['attendance', 'today-summary', date ?? 'today'],
    queryFn: () => getTodayAttendanceSummary(date),
    enabled,
  })
}
