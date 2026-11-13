import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, LogOut, Menu, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { TONE_TILE } from '@/components/ui/tone'
import { useLogout, useSession } from '@/features/auth/useAuth'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { fetchHealth } from '@/lib/api'
import { cn } from '@/lib/utils'
import { navItemsFor, ROLE_LABELS } from './nav'

function HealthChip(): React.ReactElement {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth, refetchInterval: 30_000 })
  const up = health.data?.db.status === 'up'
  const label = health.isLoading ? 'Đang kiểm tra…' : health.isError ? 'Không gọi được backend' : up ? 'Đã kết nối' : 'Mất kết nối'
  return (
    <span
      title={health.data ? `Latency ${health.data.db.latencyMs ?? '—'} ms` : undefined}
      className={cn(
        'hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline',
        TONE_TILE[up ? 'success' : 'danger'],
        // Darker text for this small badge so it meets WCAG 2 AA contrast on the
        // tinted -50 background (success/danger -600 on -50 is only ~3.6:1).
        up ? 'text-success-700' : 'text-danger-700',
      )}
    >
      DB: {label}
    </span>
  )
}

/** Layout for every signed-in page: role-filtered sidebar + top bar; pages render in <Outlet />. */
export function AppShell(): React.ReactElement | null {
  const { user } = useSession()
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)
  if (!user) return null // rendered only inside RequireAuth
  const items = navItemsFor(user.role)

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 w-64 flex-col border-r border-slate-100 bg-white p-4 print:!hidden md:sticky md:top-0 md:flex md:h-screen',
          menuOpen ? 'flex' : 'hidden',
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className={cn('rounded-lg p-1.5', TONE_TILE.primary)}>
              <GraduationCap className="h-5 w-5" />
            </span>
            LMS
          </span>
          <Button variant="ghost" size="sm" className="md:hidden" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur print:hidden md:px-6">
          <Button variant="ghost" size="sm" className="md:hidden" aria-label="Mở menu" onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell canRunReminders={user.role === 'admin'} />
            <HealthChip />
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-slate-800">{user.phoneNumber}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="mr-1 h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
