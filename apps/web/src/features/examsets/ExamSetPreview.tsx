import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExamSet } from './useExamSets'

const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'Có lỗi xảy ra')

/**
 * slice-21 (4.4): Xem trước bộ đề — CHỈ ĐỌC, dành cho Admin/Teacher.
 * Mô phỏng thứ tự học viên thấy trong cửa sổ thi: liệt kê câu theo thứ tự + các lựa chọn,
 * KHÔNG đánh dấu đáp án đúng, KHÔNG hiển thị correctAnswer/explanation.
 */
// TODO(slice-21): keo-tha sap xep thay nut len/xuong
export function ExamSetPreview({ id, onClose }: { id: string; onClose: () => void }): React.ReactElement {
  const detail = useExamSet(id)
  const title = detail.data?.title ?? ''
  return (
    <section role="dialog" aria-label={`Xem trước bộ đề: ${title}`} className="c-card grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-medium text-slate-900">Xem trước bộ đề: {title}</h3>
        <Button type="button" variant="outline" size="sm" aria-label="Đóng xem trước" onClick={onClose}>
          <X className="mr-1 h-4 w-4" /> Đóng
        </Button>
      </div>
      {detail.isPending && <p className="text-sm text-slate-500">Đang tải bộ đề…</p>}
      {detail.error && <p role="alert" className="text-sm text-danger-600">{errorText(detail.error)}</p>}
      {detail.data && detail.data.items.length === 0 && (
        <p className="text-sm text-slate-500">Bộ đề chưa có câu hỏi nào.</p>
      )}
      {detail.data && detail.data.items.length > 0 && (
        <ol aria-label="Xem trước câu hỏi" className="space-y-2">
          {detail.data.items.map((q, index) => (
            <li key={q.id} className="rounded-md border border-slate-100 p-3 text-sm">
              <p className="font-medium">Câu {index + 1}. {q.questionText}</p>
              {q.options && q.options.length > 0 && (
                <ul className="mt-1 pl-4 text-slate-600">
                  {q.options.map((o, i) => (
                    <li key={o}>{String.fromCharCode(97 + i)}. {o}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
