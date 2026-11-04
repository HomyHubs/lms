import { useState, type FormEvent } from 'react'
import { Trash2, UserPlus, Users } from 'lucide-react'
import { CreateUserRequest, type UserRole } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from './useUsers'

const ROLES: UserRole[] = ['admin', 'teacher', 'student', 'staff']

/**
 * Trang quan ly nguoi dung (slice-1 Task 1) — chi Admin (route guard theo role).
 * Giao dien toi gian (bang danh sach + form) theo "Stub cho phep" cua slice-1.
 */
export function UsersPage(): React.ReactElement {
  const usersQuery = useUsers()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [formError, setFormError] = useState<string | null>(null)

  function handleCreate(e: FormEvent): void {
    e.preventDefault()
    setFormError(null)
    const parsed = CreateUserRequest.safeParse({
      phoneNumber,
      password,
      role,
      email: email.trim() === '' ? undefined : email,
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
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.map((u) => (
                <tr key={u.id}>
                  <td>{u.phoneNumber}</td>
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
    </>
  )
}
