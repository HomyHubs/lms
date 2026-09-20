import { useState, type FormEvent } from 'react'
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CreateUserRequest, type UserRole } from '@lms/shared'
import { Button } from '@/components/ui/button'
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Quản lý người dùng</h1>
        <Link to="/" className="flex items-center gap-1 text-sm text-slate-500 underline">
          <ArrowLeft className="h-4 w-4" /> Trang chủ
        </Link>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-5"
      >
        <input
          aria-label="Số điện thoại"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Số điện thoại"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (tuỳ chọn)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Vai trò"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {usersQuery.isLoading && <p className="p-4 text-slate-500">Đang tải…</p>}
        {usersQuery.isError && (
          <p className="p-4 text-red-600">Không tải được danh sách người dùng.</p>
        )}
        {usersQuery.data && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="p-3">Số điện thoại</th>
                <th className="p-3">Email</th>
                <th className="p-3">Vai trò</th>
                <th className="p-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="p-3">{u.phoneNumber}</td>
                  <td className="p-3">{u.email ?? '—'}</td>
                  <td className="p-3">
                    <select
                      aria-label={`Vai trò của ${u.phoneNumber}`}
                      value={u.role}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: u.id,
                          input: { role: e.target.value as UserRole },
                        })
                      }
                      className="rounded-md border border-slate-300 px-2 py-1"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-right">
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
    </main>
  )
}
