import { useState } from 'react'
import { History } from 'lucide-react'
import type { ExamHistoryQuery } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { HistoryTable } from './HistoryTable'
import { useExamHistory } from './useExamHistory'

type HistoryFilter = Omit<ExamHistoryQuery, 'cursor'>

/** Date range + pass filter and the paged attempt table; `studentId` switches to a manager view of that student. */
export function StudentHistory({ studentId }: { studentId?: string }): React.ReactElement {
  const [filter, setFilter] = useState<HistoryFilter>({})
  const history = useExamHistory(filter, studentId)
  const set = (key: keyof HistoryFilter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilter((f) => ({ ...f, [key]: e.target.value || undefined }))
  const rows = history.data?.pages.flatMap((page) => page.attempts) ?? []

  return (
    <section className="c-card" aria-label="Lịch sử thi">
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1 text-sm text-slate-600">
          Từ <input aria-label="Từ ngày" type="date" className="c-input" value={filter.from ?? ''} onChange={set('from')} />
        </label>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          Đến <input aria-label="Đến ngày" type="date" className="c-input" value={filter.to ?? ''} onChange={set('to')} />
        </label>
        <select aria-label="Kết quả" className="c-input" value={filter.passed ?? ''} onChange={set('passed')}>
          <option value="">Mọi kết quả</option>
          <option value="true">Đạt</option>
          <option value="false">Không đạt</option>
        </select>
      </div>
      {history.isLoading && <p className="text-sm text-slate-500">Đang tải lịch sử…</p>}
      {history.isError && <p className="text-sm text-danger-600">{(history.error as Error).message}</p>}
      {history.isSuccess && <HistoryTable rows={rows} />}
      {history.hasNextPage && (
        <Button variant="outline" size="sm" onClick={() => void history.fetchNextPage()} disabled={history.isFetchingNextPage}>
          Tải thêm
        </Button>
      )}
    </section>
  )
}

/** slice-13 student page: every own attempt, newest first. */
export function ExamHistoryPage(): React.ReactElement {
  return (
    <>
      <PageHeader icon={History} title="Lịch sử thi" description="Mọi lượt thi của bạn, kể cả các lần thi lại." />
      <StudentHistory />
    </>
  )
}
