import { ArrowRight, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { examItemsFor } from '@/components/layout/nav'
import { PageHeader } from '@/components/ui/card'
import { TONE_TILE } from '@/components/ui/tone'
import { useSession } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

export function ExamManagementPage(): React.ReactElement | null {
  const { user } = useSession()
  if (!user) return null
  return (
    <>
      <PageHeader icon={ClipboardList} title="Quản lý thi" />
      <p className="text-sm text-slate-600">Chọn chức năng để tiếp tục.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {examItemsFor(user.role).map((item) => (
          <Link key={item.path} to={item.path} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 text-slate-800 shadow-sm hover:border-primary-200 hover:bg-primary-50">
            <span className={cn('rounded-lg p-3', TONE_TILE[item.tone])}><item.icon className="h-6 w-6" /></span>
            <span className="flex-1 font-medium">{item.label}</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </>
  )
}
