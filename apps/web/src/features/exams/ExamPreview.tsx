import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { Exam } from '@lms/shared'
import { listExamSets } from '@/lib/api'
import { Button } from '@/components/ui/button'

const LEVEL_LABEL: Record<string, string> = { starter: 'Starter', mover: 'Mover', flyer: 'Flyer' }
const SKILL_LABEL: Record<string, string> = {
  listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Writing',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN')
}

function Row({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}

/**
 * slice-11a: danh sách bộ đề liên kết (chỉ khi mode = fixed_set).
 *
 * slice-20 (trả nợ): trước đây gọi `getExamSet` cho TỪNG bộ — đề có 5 bộ là 5 request, và mỗi lần
 * mở xem trước lại gọi lại. Giờ một request `listExamSets({ ids })` trả đủ title + số câu; vẫn giữ
 * thứ tự theo `examSetIds` (thứ tự này là thứ tự làm bài, không phải thứ tự API trả về).
 */
function LinkedSets({ examSetIds }: { examSetIds: string[] }): React.ReactElement {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-sets', 'batch', examSetIds],
    queryFn: () => listExamSets({ ids: examSetIds }),
  })
  const byId = new Map((data ?? []).map((set) => [set.id, set]))
  return (
    <section className="grid gap-1">
      <h3 className="text-sm font-medium text-slate-700">Bộ đề liên kết</h3>
      {isLoading && <p className="text-sm text-slate-500">Đang tải bộ đề…</p>}
      {isError && <p role="alert" className="text-sm text-danger-600">Không tải được một số bộ đề.</p>}
      <ul className="grid gap-1">
        {examSetIds.map((id, index) => {
          const set = byId.get(id)
          if (!set) return null
          return (
            <li key={set.id} className="flex justify-between gap-4 text-sm">
              <span className="text-slate-900">{index + 1}. {set.title}</span>
              <span className="text-slate-500">{set.itemCount} câu</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * slice-20 (4.3): Xem trước đề — CHỈ ĐỌC. Hiển thị metadata đề cho Admin/Teacher.
 * Không tạo lượt thi và không lộ đáp án/câu hỏi (khác hẳn luồng "Vào thi" của học viên).
 */
export function ExamPreview({ exam, onClose }: { exam: Exam; onClose: () => void }): React.ReactElement {
  return (
    <section
      role="dialog"
      aria-label={`Xem trước đề: ${exam.title}`}
      className="c-card grid gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-900">Xem trước đề: {exam.title}</h2>
        <Button type="button" variant="outline" size="sm" aria-label="Đóng xem trước" onClick={onClose}>
          <X className="mr-1 h-4 w-4" /> Đóng
        </Button>
      </div>
      <dl className="grid gap-0">
        <Row label="Cấp độ" value={LEVEL_LABEL[exam.levelCode] ?? exam.levelCode} />
        <Row label="Kỹ năng" value={SKILL_LABEL[exam.skill] ?? exam.skill} />
        <Row label="Số câu" value={`${exam.questionCount} câu`} />
        <Row label="Thời lượng" value={`${exam.durationMinutes} phút`} />
        <Row label="Mở lúc" value={formatTime(exam.opensAt)} />
        <Row label="Đóng lúc" value={formatTime(exam.closesAt)} />
        <Row label="Ngưỡng đạt" value={`${exam.passPercent}%`} />
        <Row label="Số lần thi tối đa" value={exam.maxAttempts} />
        <Row label="Cách ra đề" value={exam.mode === 'fixed_set' ? 'Bộ đề cố định' : 'Ngẫu nhiên từ ngân hàng'} />
      </dl>
      {exam.mode === 'fixed_set' && exam.examSetIds.length > 0 && <LinkedSets examSetIds={exam.examSetIds} />}
    </section>
  )
}
