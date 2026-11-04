import { useState, type FormEvent } from 'react'
import { BookOpen, GraduationCap, Trash2, Users } from 'lucide-react'
import { CreateClassRequest, CreateCourseRequest, CreateEnrollmentRequest } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { useBranches } from '@/features/centers/useCenters'
import { useUsers } from '@/features/users/useUsers'
import {
  useClasses,
  useCourses,
  useCreateClass,
  useCreateCourse,
  useCreateEnrollment,
  useDeleteClass,
  useDeleteCourse,
  useDeleteEnrollment,
  useEnrollments,
  useLevels,
} from './useCatalog'

/**
 * Trang quan ly chuong trinh hoc (slice-1 Task 3) — chi Admin (route guard theo role).
 * Level (Starter/Mover/Flyer) chi doc; Course/Class/Enrollment CRUD. Moi Class gan 1 Branch.
 * Giao dien toi gian (danh sach + form) theo "Stub cho phep" cua slice-1.
 */
export function CatalogPage(): React.ReactElement {
  const levels = useLevels()
  const courses = useCourses()
  const classes = useClasses()
  const branches = useBranches()
  const users = useUsers()

  const createCourse = useCreateCourse()
  const deleteCourse = useDeleteCourse()
  const createClass = useCreateClass()
  const deleteClass = useDeleteClass()
  const createEnrollment = useCreateEnrollment()
  const deleteEnrollment = useDeleteEnrollment()

  const [courseLevelId, setCourseLevelId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [classCourseId, setClassCourseId] = useState('')
  const [classBranchId, setClassBranchId] = useState('')
  const [className, setClassName] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const enrollments = useEnrollments(selectedClassId)
  const students = users.data?.filter((u) => u.role === 'student') ?? []
  const phoneOf = (id: string): string => users.data?.find((u) => u.id === id)?.phoneNumber ?? id

  function submit<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }, value: unknown, run: (data: T) => void): void {
    setFormError(null)
    const parsed = schema.safeParse(value)
    if (!parsed.success || parsed.data === undefined) {
      setFormError(parsed.error?.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    run(parsed.data)
  }

  function handleCreateCourse(e: FormEvent): void {
    e.preventDefault()
    submit(CreateCourseRequest, { levelId: courseLevelId, name: courseName }, (data) =>
      createCourse.mutate(data, {
        onSuccess: () => setCourseName(''),
        onError: (err) => setFormError((err as Error).message),
      }),
    )
  }

  function handleCreateClass(e: FormEvent): void {
    e.preventDefault()
    submit(
      CreateClassRequest,
      { courseId: classCourseId, branchId: classBranchId, name: className },
      (data) =>
        createClass.mutate(data, {
          onSuccess: () => setClassName(''),
          onError: (err) => setFormError((err as Error).message),
        }),
    )
  }

  function handleEnroll(e: FormEvent): void {
    e.preventDefault()
    if (!selectedClassId) {
      setFormError('Hãy chọn một lớp trước khi ghi danh')
      return
    }
    submit(
      CreateEnrollmentRequest,
      { classId: selectedClassId, studentId: enrollStudentId },
      (data) =>
        createEnrollment.mutate(data, {
          onSuccess: () => setEnrollStudentId(''),
          onError: (err) => setFormError((err as Error).message),
        }),
    )
  }

  return (
    <>
      <PageHeader icon={BookOpen} title="Quản lý chương trình học" />

      {formError && (
        <p role="alert" className="text-sm text-danger-600">
          {formError}
        </p>
      )}

      <section className="c-card">
        <h2 className="c-section-title">
          <BookOpen className="h-5 w-5" /> Khoá học
        </h2>
        <form onSubmit={handleCreateCourse} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            aria-label="Cấp độ"
            value={courseLevelId}
            onChange={(e) => setCourseLevelId(e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn cấp độ --</option>
            {levels.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Tên khoá học"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Tên khoá học"
            className="c-input"
          />
          <Button type="submit" disabled={createCourse.isPending}>
            Thêm khoá học
          </Button>
        </form>
        {courses.data && (
          <ul className="divide-y divide-slate-100">
            {courses.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {c.name}
                  <span className="ml-2 text-slate-400">
                    ({levels.data?.find((l) => l.id === c.levelId)?.name ?? '—'})
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteCourse.mutate(c.id)}
                  disabled={deleteCourse.isPending}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Xoá
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="c-card">
        <h2 className="c-section-title">
          <GraduationCap className="h-5 w-5" /> Lớp học
        </h2>
        <form onSubmit={handleCreateClass} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            aria-label="Khoá học của lớp"
            value={classCourseId}
            onChange={(e) => setClassCourseId(e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn khoá học --</option>
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Cơ sở của lớp"
            value={classBranchId}
            onChange={(e) => setClassBranchId(e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn cơ sở --</option>
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Tên lớp"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Tên lớp"
            className="c-input"
          />
          <Button type="submit" disabled={createClass.isPending}>
            Thêm lớp
          </Button>
        </form>
        {classes.data && (
          <table className="c-table">
            <thead>
              <tr>
                <th>Tên lớp</th>
                <th>Cơ sở</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {classes.data.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td>
                    {branches.data?.find((b) => b.id === k.branchId)?.name ?? '—'}
                  </td>
                  <td className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteClass.mutate(k.id)}
                      disabled={deleteClass.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Xoá
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="c-card">
        <h2 className="c-section-title">
          <Users className="h-5 w-5" /> Ghi danh học viên
        </h2>
        <form onSubmit={handleEnroll} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            aria-label="Lớp"
            value={selectedClassId ?? ''}
            onChange={(e) => setSelectedClassId(e.target.value === '' ? null : e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn lớp --</option>
            {classes.data?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Học viên"
            value={enrollStudentId}
            onChange={(e) => setEnrollStudentId(e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn học viên --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.phoneNumber}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={createEnrollment.isPending || selectedClassId === null}>
            Ghi danh
          </Button>
        </form>
        {selectedClassId && enrollments.data && (
          <ul className="divide-y divide-slate-100">
            {enrollments.data.map((en) => (
              <li key={en.id} className="flex items-center justify-between py-2 text-sm">
                <span>{phoneOf(en.studentId)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteEnrollment.mutate({ id: en.id, classId: en.classId })}
                  disabled={deleteEnrollment.isPending}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Huỷ
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
