import { useQuery } from '@tanstack/react-query'
import { Activity, CheckCircle2, XCircle } from 'lucide-react'
import { fetchHealth } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function App(): React.ReactElement {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 10_000,
  })

  const dbUp = health.data?.db.status === 'up'

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-slate-900">
        <Activity className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">LMS — Walking skeleton</h1>
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
