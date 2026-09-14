import { useState, type FormEvent } from 'react'
import { LogIn } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginRequest } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { useLogin } from './useAuth'

/**
 * Trang dang nhap toi thieu (SDT + mat khau) — slice-0 cho phep giao dien toi thieu.
 * Validate phia client bang contract chung `LoginRequest` (Zod).
 */
export function LoginPage(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLogin()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  // Sau khi dang nhap, quay lai trang dinh vao truoc do (neu co) hoac trang chu.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    setFieldError(null)
    const parsed = LoginRequest.safeParse({ phoneNumber, password })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    loginMutation.mutate(parsed.data, {
      onSuccess: () => navigate(from, { replace: true }),
    })
  }

  const serverError = loginMutation.isError ? (loginMutation.error as Error).message : null

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-slate-900">
        <LogIn className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Đăng nhập LMS</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            Số điện thoại
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="0901234567"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Mật khẩu
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="••••••••"
          />
        </div>

        {(fieldError || serverError) && (
          <p role="alert" className="text-sm text-red-600">
            {fieldError ?? serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
    </main>
  )
}
