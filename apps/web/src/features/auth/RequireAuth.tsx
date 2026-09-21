import { Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from '@lms/shared'
import { useSession } from './useAuth'

/**
 * Cong gac route: chi cho vao khi da co phien; nguoc lai chuyen ve /login.
 * slice-1 Task 1: neu truyen `role`, chi cho vao khi user co dung role do
 * (RBAC o FE — chi de an/hien; backend van thuc thi RBAC that).
 */
export function RequireAuth({
  children,
  role,
}: {
  children: React.ReactElement
  role?: UserRole | UserRole[]
}): React.ReactElement {
  const { user, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) {
    return <p className="p-6 text-slate-500">Đang tải…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
