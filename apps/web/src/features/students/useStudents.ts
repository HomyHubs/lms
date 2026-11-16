import { useQuery } from '@tanstack/react-query'
import type { StudentProfile, StudentSearchResult } from '@lms/shared'
import { getStudentProfile, searchStudents } from '@/lib/api'

/** Tìm học viên theo tên / SĐT. Chỉ fetch khi q có ít nhất 1 ký tự. */
export function useStudentSearch(q: string) {
  return useQuery<StudentSearchResult[]>({
    queryKey: ['students', 'search', q],
    queryFn: () => searchStudents(q),
    enabled: q.trim().length > 0,
  })
}

/** Hồ sơ tổng hợp một học viên. */
export function useStudentProfile(id: string | null) {
  return useQuery<StudentProfile>({
    queryKey: ['students', 'profile', id],
    queryFn: () => getStudentProfile(id!),
    enabled: id !== null,
  })
}
