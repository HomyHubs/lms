import { useState, type FormEvent } from 'react'
import { LogIn } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600 p-6">
      {/* Lớp nền trang trí mềm mại (xanh dương → tím) cho cảm giác sang trọng. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent-400/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-primary-300/30 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-white drop-shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <LogIn className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Đăng nhập LMS</h1>
            <p className="text-sm font-normal text-white/80">Hệ thống quản lý học tập</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-4 rounded-2xl border border-white/60 bg-white/95 p-7 shadow-2xl shadow-primary-900/20 backdrop-blur"
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
              className="c-input w-full"
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
              className="c-input w-full"
              placeholder="••••••••"
            />
          </div>

          {(fieldError || serverError) && (
            <p role="alert" className="text-sm text-danger-600">
              {fieldError ?? serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>

          <Link to="/forgot-password" className="block text-center text-sm text-primary-600 underline hover:text-accent-600">
            Quên mật khẩu?
          </Link>
        </form>
      </div>
    </main>
  )
}
