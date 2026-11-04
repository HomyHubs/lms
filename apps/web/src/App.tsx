import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { NAV_ITEMS, type NavPath } from '@/components/layout/nav'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AiQuestionsPage } from '@/features/aigeneration/AiQuestionsPage'
import { AttendancePage } from '@/features/attendance/AttendancePage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { CentersPage } from '@/features/centers/CentersPage'
import { ExamsPage } from '@/features/exams/ExamsPage'
import { GradingPage } from '@/features/grading/GradingPage'
import { HomePage } from '@/features/home/HomePage'
import { QuestionsPage } from '@/features/questions/QuestionsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { AssignmentsPage } from '@/features/userbranches/AssignmentsPage'
import { UsersPage } from '@/features/users/UsersPage'
import { WorkHoursPage } from '@/features/workhours/WorkHoursPage'

const PAGES: Record<NavPath, React.ReactElement> = {
  '/': <HomePage />,
  '/exams': <ExamsPage />,
  '/attendance': <AttendancePage />,
  '/questions': <QuestionsPage />,
  '/ai-questions': <AiQuestionsPage />,
  '/grading': <GradingPage />,
  '/work-hours': <WorkHoursPage />,
  '/reports': <ReportsPage />,
  '/users': <UsersPage />,
  '/centers': <CentersPage />,
  '/catalog': <CatalogPage />,
  '/assignments': <AssignmentsPage />,
}

/** Public: /login, /forgot-password. Everything else renders inside AppShell, role-guarded by NAV_ITEMS. */
export function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        {NAV_ITEMS.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={<RequireAuth role={[...item.roles]}>{PAGES[item.path]}</RequireAuth>}
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
