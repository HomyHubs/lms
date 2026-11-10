import { useQueries, useQuery } from '@tanstack/react-query'
import type { Branch, Class, Course, Enrollment } from '@lms/shared'
import { listBranches, listClasses, listCourses, listEnrollments } from '@/lib/api'

/** One labelled slice/bar of a chart. */
export interface ChartDatum {
  name: string
  value: number
}

/** Một lớp cùng sĩ số riêng của nó (dùng để vẽ sĩ số từng lớp). */
export interface ClassSizeDatum {
  classId: string
  className: string
  size: number
}

/** Một cơ sở kèm danh sách lớp (mỗi lớp có sĩ số riêng) thuộc cơ sở đó. */
export interface BranchClassGroup {
  branchId: string
  branchName: string
  classes: ClassSizeDatum[]
  /** Tổng sĩ số của cơ sở = tổng sĩ số các lớp trong cơ sở. */
  total: number
}

export interface DashboardStats {
  /** Số học viên (enrollment) theo từng khóa học. */
  studentsByCourse: ChartDatum[]
  /** Số học viên (enrollment) theo từng cơ sở (branch). */
  studentsByBranch: ChartDatum[]
  /** Sĩ số TỪNG LỚP, nhóm theo cơ sở (mỗi lớp là một mục riêng, không cộng gộp). */
  classesByBranch: BranchClassGroup[]
  /** Tổng số học viên của cả trung tâm (= tổng mọi cơ sở) — dùng để tính tỉ lệ %. */
  totalStudents: number
  isLoading: boolean
  isEmpty: boolean
}

/**
 * Tổng hợp số liệu cho dashboard từ các endpoint hiện có (slice-1):
 *   - học viên theo khóa học: enrollment -> class.courseId -> course
 *   - học viên theo cơ sở: enrollment -> class.branchId -> branch
 * Enrollment được lấy theo từng lớp (listEnrollments nhận classId), nên dùng useQueries
 * để chạy song song một query cho mỗi lớp.
 */
export function useDashboardStats(): DashboardStats {
  const courses = useQuery<Course[]>({ queryKey: ['courses'], queryFn: listCourses })
  const classes = useQuery<Class[]>({ queryKey: ['classes'], queryFn: listClasses })
  const branches = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: listBranches })

  const classList: Class[] = classes.data ?? []

  const enrollmentQueries = useQueries({
    queries: classList.map((cls: Class) => ({
      queryKey: ['enrollments', cls.id] as const,
      queryFn: (): Promise<Enrollment[]> => listEnrollments(cls.id),
    })),
  })

  const baseLoading = courses.isLoading || classes.isLoading || branches.isLoading
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

  // Cơ sở: cộng dồn số học viên của mọi lớp thuộc branch đó.
  const branchList: Branch[] = branches.data ?? []
  const studentsByBranch: ChartDatum[] = branchList.map((branch: Branch) => {
    const value = classList
      .filter((cls: Class) => cls.branchId === branch.id)
      .reduce((sum: number, cls: Class) => sum + (enrollmentCountByClass.get(cls.id) ?? 0), 0)
    return { name: branch.name, value }
  })

  // Sĩ số TỪNG LỚP, nhóm theo cơ sở: mỗi lớp giữ sĩ số riêng (KHÔNG cộng gộp theo cơ sở).
  // Chỉ giữ cơ sở có ít nhất một lớp để chart không hiện cơ sở rỗng.
  const classesByBranch: BranchClassGroup[] = branchList
    .map((branch: Branch) => {
      const classes: ClassSizeDatum[] = classList
        .filter((cls: Class) => cls.branchId === branch.id)
        .map((cls: Class) => ({
          classId: cls.id,
          className: cls.name,
          size: enrollmentCountByClass.get(cls.id) ?? 0,
        }))
      const total = classes.reduce((sum: number, c: ClassSizeDatum) => sum + c.size, 0)
      return { branchId: branch.id, branchName: branch.name, classes, total }
    })
    .filter((group: BranchClassGroup) => group.classes.length > 0)

  // Tổng học viên cả trung tâm = tổng mọi cơ sở (1 trung tâm → coi là 100%).
  const totalStudents = studentsByBranch.reduce((sum: number, d: ChartDatum) => sum + d.value, 0)
  const isEmpty = !isLoading && totalStudents === 0

  return { studentsByCourse, studentsByBranch, classesByBranch, totalStudents, isLoading, isEmpty }
}
