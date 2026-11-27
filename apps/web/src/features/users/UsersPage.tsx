import { useState, type FormEvent } from 'react'
import { ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import {
  CreateUserRequest,
  DEFAULT_QUESTION_EDIT_PERMISSIONS,
  type AdminUser,
  type Gender,
  type QuestionEditPermissions,
  type UserRole,
} from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import {
  useQuestionEditPermissions,
  useUpdateQuestionEditPermissions,
} from '@/features/settings/useSettings'
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from './useUsers'

const ROLES: UserRole[] = ['admin', 'teacher', 'student', 'staff']

/** slice-19: thu tu + nhan hien thi cac role trong bang cau hinh quyen sua cau hoi. */
const QUESTION_EDIT_ROLES: { role: keyof QuestionEditPermissions; label: string }[] = [
  { role: 'superadmin', label: 'Quản trị cấp cao (superadmin)' },
  { role: 'admin', label: 'Quản trị (admin)' },
  { role: 'staff', label: 'Nhân viên (staff)' },
  { role: 'teacher', label: 'Giáo viên (teacher)' },
  { role: 'student', label: 'Học viên (student)' },
]

/** Nhan giới tính hiển thị tiếng Việt. */
const GENDER_LABEL: Record<Gender, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }

/**
 * Tuổi hiển thị (slice-26, ADR 0018). Chỉ học viên mới có tuổi. Khi học viên chỉ có năm sinh
 * (dữ liệu cũ) thì tuổi là ƯỚC LƯỢNG lệch ±1, nên đánh dấu `~` thay vì trình bày như số chính xác.
 */
function formatAge(user: AdminUser): string {
  if (user.role !== 'student' || user.age === null) return '—'
  return user.birthDate === null ? `~${user.age}` : String(user.age)
}

/**
 * Trang quan ly nguoi dung (slice-1 Task 1) — chi Admin (route guard theo role).
 * Giao dien toi gian (bang danh sach + form) theo "Stub cho phep" cua slice-1.
 */
export function UsersPage(): React.ReactElement {
  const usersQuery = useUsers()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  // slice-19 (ADR 0015): cau hinh quyen sua cau hoi theo role (toan he thong).
  const permsQuery = useQuestionEditPermissions()
  const updatePerms = useUpdateQuestionEditPermissions()
  const perms = permsQuery.data ?? DEFAULT_QUESTION_EDIT_PERMISSIONS

  function togglePerm(target: keyof QuestionEditPermissions): void {
    updatePerms.mutate({ ...perms, [target]: !perms[target] })
  }

  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  // slice-26 (ADR 0018): nhập NGÀY sinh (type=date) thay vì chỉ năm — đây là cách duy nhất để
  // tuổi chính xác, không lệch ±1 khi chưa tới sinh nhật.
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function handleCreate(e: FormEvent): void {
    e.preventDefault()
    setFormError(null)
    const parsed = CreateUserRequest.safeParse({
      phoneNumber,
      password,
      role,
      email: email.trim() === '' ? undefined : email,
      // Truong rong -> undefined (contract coi la khong nhap).
      lastName: lastName.trim() === '' ? undefined : lastName,
      firstName: firstName.trim() === '' ? undefined : firstName,
      // slice-26 (ADR 0018): gửi ngày sinh đầy đủ; backend tự dẫn xuất birthYear từ đó.
      birthDate: birthDate.trim() === '' ? undefined : birthDate,
      gender: gender === '' ? undefined : gender,
      address: address.trim() === '' ? undefined : address,
      parentPhone: parentPhone.trim() === '' ? undefined : parentPhone,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    createMutation.mutate(parsed.data, {
      onSuccess: () => {
        setPhoneNumber('')
        setPassword('')
        setEmail('')
        setRole('student')
        setLastName('')
        setFirstName('')
        setBirthDate('')
        setGender('')
        setAddress('')
        setParentPhone('')
      },
      onError: (err) => setFormError((err as Error).message),
    })
  }

  return (
    <>
      <PageHeader icon={Users} title="Quản lý người dùng" />

      <form
        onSubmit={handleCreate}
        className="c-card grid grid-cols-1 sm:grid-cols-5"
      >
        <input
          aria-label="Số điện thoại"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Số điện thoại"
          className="c-input"
        />
        <input
          aria-label="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="c-input"
        />
        <input
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (tuỳ chọn)"
          className="c-input"
        />
        <select
          aria-label="Vai trò"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="c-input"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          aria-label="Họ và chữ lót"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Họ và chữ lót"
          className="c-input"
        />
        <input
          aria-label="Tên"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Tên"
          className="c-input"
        />
        <input
          aria-label="Ngày sinh"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="c-input"
        />
        <select
          aria-label="Giới tính"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="c-input"
        >
          <option value="">Giới tính</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>
        <input
          aria-label="Địa chỉ"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Địa chỉ"
          className="c-input"
        />
        <input
          aria-label="SĐT phụ huynh"
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
          placeholder="SĐT phụ huynh"
          className="c-input"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          <UserPlus className="mr-1 h-4 w-4" /> Thêm
        </Button>
      </form>

      {formError && (
        <p role="alert" className="text-sm text-danger-600">
          {formError}
        </p>
      )}

      <section className="c-card overflow-x-auto">
        {usersQuery.isLoading && <p className="p-4 text-slate-500">Đang tải…</p>}
        {usersQuery.isError && (
          <p className="p-4 text-danger-600">Không tải được danh sách người dùng.</p>
        )}
        {usersQuery.data && (
          <table className="c-table">
            <thead>
              <tr>
                {/* slice-23: cot ma hoc vien (chi doc). slice-26: bo cot SDT rieng (SDT nho duoi ho ten). */}
                <th>Mã học viên</th>
                <th>Họ tên</th>
                <th>Năm sinh</th>
                <th>Tuổi</th>
                <th>Giới tính</th>
                <th>SĐT phụ huynh</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.map((u) => (
                <tr key={u.id}>
                  {/* slice-23: ma hoc vien (chi doc) — chi hien khi co gia tri (hoc vien moi co ma). */}
                  <td>{u.studentCode ?? '—'}</td>
                  {/* slice-26: ho ten to, SDT nho ngay duoi (bo cot SDT rieng). */}
                  <td>
                    <div className="flex flex-col">
                      <span>
                        {u.lastName || u.firstName
                          ? [u.lastName, u.firstName].filter(Boolean).join(' ')
                          : '—'}
                      </span>
                      <span className="text-xs text-slate-400">{u.phoneNumber}</span>
                    </div>
                  </td>
                  {/* slice-26 (ADR 0018): năm sinh là chính; ngày sinh đầy đủ hiện nhỏ bên dưới. */}
                  <td>
                    <div className="flex flex-col">
                      <span>{u.birthYear ?? '—'}</span>
                      {u.birthDate && (
                        <span className="text-xs text-slate-400">{u.birthDate}</span>
                      )}
                    </div>
                  </td>
                  {/* slice-26: tuoi chi co y nghia voi hoc vien; role khac de trong.
                      ADR 0018: `~` = chỉ biết năm sinh nên tuổi là ước lượng (lệch ±1). */}
                  <td title={u.role === 'student' && u.birthDate === null && u.age !== null
                    ? 'Chỉ biết năm sinh nên tuổi có thể lệch 1 tuổi'
                    : undefined}
                  >
                    {formatAge(u)}
                  </td>
                  <td>{u.gender ? GENDER_LABEL[u.gender] : '—'}</td>
                  <td>{u.parentPhone ?? '—'}</td>
                  <td>{u.email ?? '—'}</td>
                  <td>
                    <select
                      aria-label={`Vai trò của ${u.phoneNumber}`}
                      value={u.role}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: u.id,
                          input: { role: e.target.value as UserRole },
                        })
                      }
                      className="c-input py-1"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(u.id)}
                      disabled={deleteMutation.isPending}
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

      {/* slice-19 (ADR 0015): bat/tat quyen SUA cau hoi theo tung role (toan he thong). */}
      <section className="c-card" aria-label="Quyền sửa câu hỏi theo vai trò">
        <h2 className="c-section-title">
          <ShieldCheck className="h-5 w-5" /> Quyền sửa câu hỏi theo vai trò
        </h2>
        <p className="text-sm text-slate-500">
          Bật/tắt quyền thêm, sửa, xoá và nhập câu hỏi cho từng vai trò. Máy chủ luôn thực thi;
          thay đổi áp dụng toàn hệ thống.
        </p>
        {permsQuery.isError && (
          <p role="alert" className="text-sm text-danger-600">
            Không tải được cấu hình quyền sửa câu hỏi.
          </p>
        )}
        {updatePerms.isError && (
          <p role="alert" className="text-sm text-danger-600">
            Lưu cấu hình thất bại, vui lòng thử lại.
          </p>
        )}
        <ul className="divide-y divide-slate-200">
          {QUESTION_EDIT_ROLES.map(({ role: r, label }) => (
            <li key={r} className="flex items-center justify-between py-2">
              <span className="text-sm">{label}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={`Cho phép ${label} sửa câu hỏi`}
                  checked={perms[r]}
                  disabled={permsQuery.isLoading || updatePerms.isPending}
                  onChange={() => togglePerm(r)}
                />
                <span>{perms[r] ? 'Được sửa' : 'Không được sửa'}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
