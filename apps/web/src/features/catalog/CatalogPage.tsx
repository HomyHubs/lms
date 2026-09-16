import { useState, type FormEvent } from 'react'
import { ArrowLeft, BookOpen, GraduationCap, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CreateClassRequest, CreateCourseRequest, CreateEnrollmentRequest } from '@lms/shared'
import { Button } from '@/components/ui/button'
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Quản lý chương trình học</h1>
        <Link to="/" className="flex items-center gap-1 text-sm text-slate-500 underline">
          <ArrowLeft className="h-4 w-4" /> Trang chủ
        </Link>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-medium text-slate-800">
          <BookOpen className="h-5 w-5" /> Khoá học
        </h2>
        <form onSubmit={handleCreateCourse} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            aria-label="Cấp độ"
            value={courseLevelId}
            onChange={(e) => setCourseLevelId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-medium text-slate-800">
          <GraduationCap className="h-5 w-5" /> Lớp học
        </h2>
        <form onSubmit={handleCreateClass} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            aria-label="Khoá học của lớp"
            value={classCourseId}
            onChange={(e) => setClassCourseId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={createClass.isPending}>
            Thêm lớp
          </Button>
        </form>
        {classes.data && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="p-2">Tên lớp</th>
                <th className="p-2">Cơ sở</th>
                <th className="p-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {classes.data.map((k) => (
                <tr key={k.id} className="border-b border-slate-100">
                  <td className="p-2">{k.name}</td>
                  <td className="p-2">
                    {branches.data?.find((b) => b.id === k.branchId)?.name ?? '—'}
                  </td>
                  <td className="p-2 text-right">
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

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-medium text-slate-800">
          <Users className="h-5 w-5" /> Ghi danh học viên
        </h2>
        <form onSubmit={handleEnroll} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            aria-label="Lớp"
            value={selectedClassId ?? ''}
            onChange={(e) => setSelectedClassId(e.target.value === '' ? null : e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
    </main>
  )
}
