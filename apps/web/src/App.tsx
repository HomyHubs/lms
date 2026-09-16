import { Navigate, Route, Routes } from 'react-router-dom'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { CentersPage } from '@/features/centers/CentersPage'
import { HomePage } from '@/features/home/HomePage'
import { AssignmentsPage } from '@/features/userbranches/AssignmentsPage'
import { UsersPage } from '@/features/users/UsersPage'

/** Router goc: /login va /forgot-password cong khai, / duoc bao ve boi phien dang nhap. */
export function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth role="admin">
            <UsersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/centers"
        element={
          <RequireAuth role="admin">
            <CentersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/catalog"
        element={
          <RequireAuth role="admin">
            <CatalogPage />
          </RequireAuth>
        }
      />
      <Route
        path="/assignments"
        element={
          <RequireAuth role="admin">
            <AssignmentsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
