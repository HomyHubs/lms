import { Navigate, Route, Routes } from 'react-router-dom'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { HomePage } from '@/features/home/HomePage'
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
