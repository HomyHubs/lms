import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateClassRequest, CreateCourseRequest, CreateEnrollmentRequest } from '@lms/shared'
import {
  createClass,
  createCourse,
  createEnrollment,
  deleteClass,
  deleteCourse,
  deleteEnrollment,
  listClasses,
  listCourses,
  listEnrollments,
  listLevels,
} from '@/lib/api'

const LEVELS_KEY = ['levels'] as const
const COURSES_KEY = ['courses'] as const
const CLASSES_KEY = ['classes'] as const
const enrollmentsKey = (classId: string) => ['enrollments', classId] as const

export function useLevels() {
  return useQuery({ queryKey: LEVELS_KEY, queryFn: listLevels })
}

export function useCourses() {
  return useQuery({ queryKey: COURSES_KEY, queryFn: listCourses })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCourseRequest) => createCourse(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COURSES_KEY }),
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COURSES_KEY })
      // Xoa Course keo theo Class (cascade) -> lam moi danh sach lop.
      void qc.invalidateQueries({ queryKey: CLASSES_KEY })
    },
  })
}

export function useClasses() {
  return useQuery({ queryKey: CLASSES_KEY, queryFn: listClasses })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClassRequest) => createClass(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLASSES_KEY }),
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLASSES_KEY }),
  })
}

export function useEnrollments(classId: string | null) {
  return useQuery({
    queryKey: enrollmentsKey(classId ?? ''),
    queryFn: () => listEnrollments(classId as string),
    enabled: classId !== null,
  })
}

export function useCreateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEnrollmentRequest) => createEnrollment(input),
    onSuccess: (_data, input) =>
      void qc.invalidateQueries({ queryKey: enrollmentsKey(input.classId) }),
  })
}

export function useDeleteEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; classId: string }) => deleteEnrollment(vars.id),
    onSuccess: (_data, vars) =>
      void qc.invalidateQueries({ queryKey: enrollmentsKey(vars.classId) }),
  })
}
