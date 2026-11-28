import { Navigate, useLocation } from 'react-router-dom'
import { canAny, type Permission } from '@lms/shared'
import { useSession } from './useAuth'

/**
 * Cong gac route: chi cho vao khi da co phien; nguoc lai chuyen ve /login.
 *
 * slice-1 (ADR 0021) / slice-32 (ADR 0024): khi truyen `permission`, chi cho vao khi user co IT NHAT
 * MOT quyen trong danh sach. FE va API dung CHUNG ma tran `ROLE_PERMISSIONS` — FE khong con mang
 * role rieng, nen khong con cho de lech (RBAC o FE chi de an/hien; backend van thuc thi that).
 */
export function RequireAuth({
  children,
  permission,
}: {
  children: React.ReactElement
  permission?: Permission | readonly Permission[]
}): React.ReactElement {
  const { user, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) {
    return <p className="p-6 text-slate-500">Đang tải…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  const permissions = permission === undefined ? [] : Array.isArray(permission) ? permission : [permission]
  // Luat "superadmin vuot moi guard" nam trong `can`/`canAny` cua `@lms/shared`, dung chung voi guard
  // phia API — FE khong con mot ban sao de lech.
  if (!canAny(user.role, permissions)) {
    return <Navigate to="/" replace />
  }
  return children
}
