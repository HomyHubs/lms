import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ForgotPasswordRequest, ResetPasswordRequest, type OtpChannel } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { useForgotPassword, useResetPassword } from './useAuth'

/**
 * Task 3 (slice-0) + Slice-2: quen mat khau qua OTP da kenh (Email/WhatsApp/Telegram).
 * Luong 2 buoc: (1) nhap email + chon kenh -> nhan OTP; (2) nhap OTP + mat khau moi.
 * Validate phia client bang contract chung (Zod). Giao dien toi thieu.
 */
const CHANNEL_LABELS: Record<OtpChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
}

export function ForgotPasswordPage(): React.ReactElement {
  const navigate = useNavigate()
  const forgotMutation = useForgotPassword()
  const resetMutation = useResetPassword()

  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [channel, setChannel] = useState<OtpChannel>('email')
  const [recipient, setRecipient] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function handleRequest(e: FormEvent): void {
    e.preventDefault()
    setFieldError(null)
    const parsed = ForgotPasswordRequest.safeParse({
      email,
      channel,
      // Voi kenh email, dia chi nhan mac dinh la chinh email (khong can nhap rieng).
      recipient: channel === 'email' ? undefined : recipient,
    })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    forgotMutation.mutate(parsed.data, {
      // Luon chuyen sang buoc nhap OTP (backend khong tiet lo email co ton tai hay khong).
      onSuccess: () => setStep('reset'),
    })
  }

  function handleReset(e: FormEvent): void {
    e.preventDefault()
    setFieldError(null)
    const parsed = ResetPasswordRequest.safeParse({ email, otp, newPassword })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    resetMutation.mutate(parsed.data, {
      onSuccess: () => setDone(true),
    })
  }

  const requestError = forgotMutation.isError ? (forgotMutation.error as Error).message : null
  const resetError = resetMutation.isError ? (resetMutation.error as Error).message : null

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-slate-900">
        <KeyRound className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Quên mật khẩu</h1>
      </div>

      {done ? (
        <div className="w-full space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p role="status" className="text-sm text-green-600">
            Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
          </p>
          <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Về trang đăng nhập
          </Button>
        </div>
      ) : step === 'request' ? (
        <form
          onSubmit={handleRequest}
          className="w-full space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm text-slate-500">
            Nhập email tài khoản và chọn kênh nhận mã. Nếu tài khoản tồn tại, chúng tôi sẽ gửi mã
            OTP để đặt lại mật khẩu.
          </p>
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="channel" className="block text-sm font-medium text-slate-700">
              Kênh nhận OTP
            </label>
            <select
              id="channel"
              name="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as OtpChannel)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>

          {channel !== 'email' && (
            <div className="space-y-1">
              <label htmlFor="recipient" className="block text-sm font-medium text-slate-700">
                {channel === 'whatsapp' ? 'Số WhatsApp (E.164)' : 'Chat ID Telegram'}
              </label>
              <input
                id="recipient"
                name="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder={channel === 'whatsapp' ? '84901234567' : '123456789'}
              />
            </div>
          )}

          {(fieldError || requestError) && (
            <p role="alert" className="text-sm text-red-600">
              {fieldError ?? requestError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
            {forgotMutation.isPending ? 'Đang gửi…' : 'Gửi mã OTP'}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleReset}
          className="w-full space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm text-slate-500">
            Nhập mã OTP đã gửi qua{' '}
            <span className="font-medium">
              {CHANNEL_LABELS[channel]}
              {channel === 'email' ? ` (${email})` : recipient ? ` (${recipient})` : ''}
            </span>{' '}
            và mật khẩu mới.
          </p>
          <div className="space-y-1">
            <label htmlFor="otp" className="block text-sm font-medium text-slate-700">
              Mã OTP
            </label>
            <input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tracking-widest focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="123456"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
              Mật khẩu mới
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="••••••••"
            />
          </div>

          {(fieldError || resetError) && (
            <p role="alert" className="text-sm text-red-600">
              {fieldError ?? resetError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-slate-500 underline"
            onClick={() => {
              setStep('request')
              setFieldError(null)
            }}
          >
            Gửi lại mã khác
          </button>
        </form>
      )}

      <Link to="/login" className="text-sm text-slate-500 underline">
        Quay lại đăng nhập
      </Link>
    </main>
  )
}
