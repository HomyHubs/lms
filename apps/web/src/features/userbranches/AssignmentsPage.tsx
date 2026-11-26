import { useEffect, useState } from 'react'
import { GraduationCap, MapPin, Save, UserPlus, Users } from 'lucide-react'
import type { AdminUser } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { useBranches } from '@/features/centers/useCenters'
import { useClasses, useCreateEnrollment, useDeleteEnrollment, useEnrollments } from '@/features/catalog/useCatalog'
import {
  useAssignTeacher,
  useClassTeachers,
  useRemoveTeacher,
} from '@/features/attendance/useAttendance'
import { useUsers } from '@/features/users/useUsers'
import { useSetUserBranches, useUserBranches } from './useUserBranches'

/** Ten hien thi: uu tien ho ten, thieu thi dung SDT (khong bia ten). */
function displayName(user: AdminUser): string {
  const full = [user.lastName, user.firstName].filter(Boolean).join(' ')
  return full || user.phoneNumber
}

/**
 * Trang "Ghi danh & Quản lý" (slice-29, trước đây là "Gán cơ sở") — chỉ Admin.
 * Panel 1: học viên & giáo viên gán theo LỚP (ghi danh / gán giáo viên phụ trách).
 * Panel 2: tài khoản quản lý (admin/staff) gán theo CƠ SỞ — quyết định phạm vi dữ liệu họ thấy.
 */
export function AssignmentsPage(): React.ReactElement {
  const users = useUsers()
  const branches = useBranches()
  const classes = useClasses()

  const [classId, setClassId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [managerId, setManagerId] = useState<string | null>(null)
  const [checked, setChecked] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enrollments = useEnrollments(classId)
  const classTeachers = useClassTeachers(classId)
  const createEnrollment = useCreateEnrollment()
  const deleteEnrollment = useDeleteEnrollment()
  const assignTeacher = useAssignTeacher(classId)
  const removeTeacher = useRemoveTeacher(classId)

  const assigned = useUserBranches(managerId)
  const setUserBranches = useSetUserBranches()

  const students = users.data?.filter((u) => u.role === 'student') ?? []
  const teachers = users.data?.filter((u) => u.role === 'teacher') ?? []
  const managers = users.data?.filter((u) => u.role === 'admin' || u.role === 'staff') ?? []
  const userById = (id: string): AdminUser | undefined => users.data?.find((u) => u.id === id)

  // Doi lop: reset lua chon hoc vien/giao vien dang chon.
  useEffect(() => {
    setStudentId('')
    setTeacherId('')
    setError(null)
  }, [classId])

  // Doi tai khoan quan ly: reset lua chon; khi tai xong tap Branch da gan: dong bo checkbox.
  useEffect(() => {
    setChecked([])
    setSaved(false)
  }, [managerId])
  useEffect(() => {
    if (assigned.data) setChecked(assigned.data.map((b) => b.id))
  }, [assigned.data])

  function handleEnroll(): void {
    if (!classId) {
      setError('Hãy chọn một lớp trước khi ghi danh')
      return
    }
    setError(null)
    createEnrollment.mutate(
      { classId, studentId },
      {
        onSuccess: () => setStudentId(''),
        onError: (err) => setError((err as Error).message),
      },
    )
  }

  function handleAssignTeacher(): void {
    if (!classId) {
      setError('Hãy chọn một lớp trước khi gán giáo viên')
      return
    }
    setError(null)
    assignTeacher.mutate(teacherId, {
      onSuccess: () => setTeacherId(''),
      onError: (err) => setError((err as Error).message),
    })
  }

  function toggle(branchId: string): void {
    setSaved(false)
    setChecked((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    )
  }

  function handleSaveBranches(): void {
    if (!managerId) return
    setError(null)
    setUserBranches.mutate(
      { userId: managerId, branchIds: checked },
      { onSuccess: () => setSaved(true), onError: (err) => setError((err as Error).message) },
    )
  }

  return (
    <>
      <PageHeader icon={UserPlus} title="Ghi danh & Quản lý" />

      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}

      <section className="c-card">
        <h2 className="c-section-title">
          <GraduationCap className="h-5 w-5" /> Học viên & giáo viên theo lớp
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Lớp</span>
          <select
            aria-label="Lớp"
            value={classId ?? ''}
            onChange={(e) => setClassId(e.target.value === '' ? null : e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn lớp --</option>
            {classes.data?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>

        {classId && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Users className="h-4 w-4" /> Học viên trong lớp
              </h3>
              {enrollments.isLoading && <p className="text-sm text-slate-500">Đang tải…</p>}
              {enrollments.data?.length === 0 && (
                <p className="text-sm text-slate-500">Lớp chưa có học viên.</p>
              )}
              <ul className="divide-y divide-slate-100">
                {enrollments.data?.map((en) => (
                  <li key={en.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{userById(en.studentId) ? displayName(userById(en.studentId)!) : en.studentId}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Gỡ học viên ${userById(en.studentId)?.phoneNumber ?? en.studentId}`}
                      onClick={() =>
                        deleteEnrollment.mutate(
                          { id: en.id, classId },
                          { onError: (err) => setError((err as Error).message) },
                        )
                      }
                      disabled={deleteEnrollment.isPending}
                    >
                      Gỡ
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Học viên để ghi danh"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="c-input flex-1"
                >
                  <option value="">-- Chọn học viên --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {displayName(s)}
                    </option>
                  ))}
                </select>
                <Button onClick={handleEnroll} disabled={!studentId || createEnrollment.isPending}>
                  Ghi danh
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <GraduationCap className="h-4 w-4" /> Giáo viên phụ trách
              </h3>
              {classTeachers.isLoading && <p className="text-sm text-slate-500">Đang tải…</p>}
              {classTeachers.data?.length === 0 && (
                <p className="text-sm text-slate-500">Lớp chưa gán giáo viên.</p>
              )}
              <ul className="divide-y divide-slate-100">
                {classTeachers.data?.map((t) => (
                  <li key={t.teacherId} className="flex items-center justify-between py-2 text-sm">
                    <span>{userById(t.teacherId) ? displayName(userById(t.teacherId)!) : t.phoneNumber}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Gỡ giáo viên ${t.phoneNumber}`}
                      onClick={() =>
                        removeTeacher.mutate(t.teacherId, {
                          onError: (err) => setError((err as Error).message),
                        })
                      }
                      disabled={removeTeacher.isPending}
                    >
                      Gỡ
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Giáo viên để gán"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="c-input flex-1"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {displayName(t)}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAssignTeacher} disabled={!teacherId || assignTeacher.isPending}>
                  Gán giáo viên
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="c-card">
        <h2 className="c-section-title">
          <MapPin className="h-5 w-5" /> Quản lý theo cơ sở
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Tài khoản quản lý</span>
          <select
            aria-label="Tài khoản quản lý"
            value={managerId ?? ''}
            onChange={(e) => setManagerId(e.target.value === '' ? null : e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn tài khoản --</option>
            {managers.map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u)} ({u.role})
              </option>
            ))}
          </select>
        </label>

        {managerId && (
          <>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4" /> Cơ sở được gán
              </span>
              {assigned.isLoading && <p className="text-sm text-slate-500">Đang tải…</p>}
              {branches.data?.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có cơ sở nào. Hãy tạo cơ sở trước.</p>
              )}
              {branches.data?.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    aria-label={b.name}
                    checked={checked.includes(b.id)}
                    onChange={() => toggle(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveBranches} disabled={setUserBranches.isPending}>
                <Save className="mr-1 h-4 w-4" /> Lưu
              </Button>
              {saved && <span className="text-sm text-success-600">Đã lưu</span>}
            </div>
          </>
        )}
      </section>
    </>
  )
}
