import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from './useAuth'

/** Cong gac route: chi cho vao khi da co phien; nguoc lai chuyen ve /login. */
export function RequireAuth({ children }: { children: React.ReactElement }): React.ReactElement {
  const { user, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) {
    return <p className="p-6 text-slate-500">Đang tải…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
