import { useQueries, useQuery } from '@tanstack/react-query'
import type { Branch, Center, Class, Course, Enrollment } from '@lms/shared'
import { listBranches, listCenters, listClasses, listCourses, listEnrollments } from '@/lib/api'

/** One labelled slice/bar of a chart. */
export interface ChartDatum {
  name: string
  value: number
}

export interface DashboardStats {
  /** Số học viên (enrollment) theo từng khóa học. */
  studentsByCourse: ChartDatum[]
  /** Số học viên (enrollment) theo từng trung tâm. */
  studentsByCenter: ChartDatum[]
  isLoading: boolean
  isEmpty: boolean
}

/**
 * Tổng hợp số liệu cho dashboard từ các endpoint hiện có (slice-1):
 *   - học viên theo khóa học: enrollment -> class.courseId -> course
 *   - học viên theo trung tâm: enrollment -> class.branchId -> branch.centerId -> center
 * Enrollment được lấy theo từng lớp (listEnrollments nhận classId), nên dùng useQueries
 * để chạy song song một query cho mỗi lớp.
 */
export function useDashboardStats(): DashboardStats {
  const courses = useQuery<Course[]>({ queryKey: ['courses'], queryFn: listCourses })
  const classes = useQuery<Class[]>({ queryKey: ['classes'], queryFn: listClasses })
  const centers = useQuery<Center[]>({ queryKey: ['centers'], queryFn: listCenters })
  const branches = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: listBranches })

  const classList: Class[] = classes.data ?? []

  const enrollmentQueries = useQueries({
    queries: classList.map((cls: Class) => ({
      queryKey: ['enrollments', cls.id] as const,
      queryFn: (): Promise<Enrollment[]> => listEnrollments(cls.id),
    })),
  })

  const baseLoading = courses.isLoading || classes.isLoading || centers.isLoading || branches.isLoading
  const enrollmentsLoading = enrollmentQueries.some((q) => q.isLoading)
  const isLoading = baseLoading || enrollmentsLoading

  // enrollmentCountByClass[classId] = số học viên của lớp đó.
  const enrollmentCountByClass = new Map<string, number>()
  classList.forEach((cls: Class, index: number) => {
    const rows: Enrollment[] = enrollmentQueries[index]?.data ?? []
    enrollmentCountByClass.set(cls.id, rows.length)
  })

  // Khóa học: cộng dồn số học viên của mọi lớp thuộc course đó.
  const courseList: Course[] = courses.data ?? []
  const studentsByCourse: ChartDatum[] = courseList.map((course: Course) => {
    const value = classList
      .filter((cls: Class) => cls.courseId === course.id)
      .reduce((sum: number, cls: Class) => sum + (enrollmentCountByClass.get(cls.id) ?? 0), 0)
    return { name: course.name, value }
  })

  // Trung tâm: class.branchId -> branch.centerId.
  const branchList: Branch[] = branches.data ?? []
  const centerIdByBranch = new Map<string, string>()
  branchList.forEach((branch: Branch) => centerIdByBranch.set(branch.id, branch.centerId))

  const centerList: Center[] = centers.data ?? []
  const studentsByCenter: ChartDatum[] = centerList.map((center: Center) => {
    const value = classList
      .filter((cls: Class) => centerIdByBranch.get(cls.branchId) === center.id)
      .reduce((sum: number, cls: Class) => sum + (enrollmentCountByClass.get(cls.id) ?? 0), 0)
    return { name: center.name, value }
  })

  const totalStudents =
    studentsByCourse.reduce((sum: number, d: ChartDatum) => sum + d.value, 0) +
    studentsByCenter.reduce((sum: number, d: ChartDatum) => sum + d.value, 0)
  const isEmpty = !isLoading && totalStudents === 0

  return { studentsByCourse, studentsByCenter, isLoading, isEmpty }
}
