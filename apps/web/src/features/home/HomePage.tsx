import { useQuery } from '@tanstack/react-query'
import { Activity, Building2, CheckCircle2, LogOut, Users, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchHealth } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLogout, useSession } from '@/features/auth/useAuth'

/**
 * Trang chu (sau dang nhap): hien trang thai ket noi Database that va thong tin phien.
 * Giu nguyen health-check cua Task 1, bo sung thanh dieu huong dang nhap/xuat.
 * slice-1 Task 1: hien lien ket "Quan ly nguoi dung" chi khi role === 'admin' (RBAC menu).
 */
export function HomePage(): React.ReactElement {
  const { user } = useSession()
  const logout = useLogout()

  const health = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 10_000,
  })

  const dbUp = health.data?.db.status === 'up'

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900">
          <Activity className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">LMS — Walking skeleton</h1>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-slate-500">{user.phoneNumber}</span>}
          {user?.role === 'admin' && (
            <Link
              to="/users"
              className="flex items-center gap-1 text-sm text-slate-600 underline"
            >
              <Users className="h-4 w-4" /> Quản lý người dùng
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              to="/centers"
              className="flex items-center gap-1 text-sm text-slate-600 underline"
            >
              <Building2 className="h-4 w-4" /> Trung tâm &amp; cơ sở
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="mr-1 h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </div>

      <section className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-slate-800">Trạng thái kết nối Database</h2>

        {health.isLoading && <p className="text-slate-500">Đang kiểm tra…</p>}

        {health.isError && (
          <p className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" /> Không gọi được backend health-check.
          </p>
        )}

        {health.data && (
          <div className="space-y-2">
            <p
              className={cn(
                'flex items-center gap-2 text-base font-medium',
                dbUp ? 'text-green-600' : 'text-red-600',
              )}
            >
              {dbUp ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              Database: {dbUp ? 'Đã kết nối (thật)' : 'Mất kết nối'}
            </p>
            <p className="text-sm text-slate-500">
              Backend: {health.data.status} · Latency:{' '}
              {health.data.db.latencyMs === null ? '—' : `${health.data.db.latencyMs} ms`}
            </p>
            <p className="text-xs text-slate-400">Cập nhật: {health.data.timestamp}</p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void health.refetch()}
          disabled={health.isFetching}
        >
          Kiểm tra lại
        </Button>
      </section>
    </main>
  )
}
