import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Eye, FileStack, ImagePlus, Trash2 } from 'lucide-react'
import {
  AddExamSetQuestionRequest,
  CreateExamSetRequest,
  type ExamSetDetail,
  type ExamSetStatus,
} from '@lms/shared'
import {
  addExamSetQuestion,
  archiveExamSet,
  createExamSet,
  deleteExamSet,
  duplicateExamSet,
  publishExamSet,
  replaceExamSetItems,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardTitle, PageHeader } from '@/components/ui/card'
import type { Tone } from '@/components/ui/tone'
import { BlueprintForm } from '@/features/exams/BlueprintForm'
import { useExams } from '@/features/exams/useExams'
import { QuestionImages } from '@/features/media/QuestionImages'
import { BankPicker } from './BankPicker'
import { ExamSetPreview } from './ExamSetPreview'
import { ImportExamSet } from './ImportExamSet'
import { SetMetaFields } from './LevelSkillFields'
import { useExamSet, useExamSetCommand, useExamSets } from './useExamSets'

const STATUS: Record<ExamSetStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Nháp', tone: 'warning' },
  published: { label: 'Đã phát hành', tone: 'success' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}
const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'Có lỗi xảy ra')

function CreateSetForm({ onCreated }: { onCreated: (id: string) => void }): React.ReactElement {
  const create = useExamSetCommand(createExamSet)
  const [message, setMessage] = useState('')
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const form = event.currentTarget
    const parsed = CreateExamSetRequest.safeParse(Object.fromEntries(new FormData(form).entries()))
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ'); return }
    create.mutate(parsed.data, { onSuccess: (set) => { form.reset(); setMessage(''); if (set) onCreated(set.id) } })
  }
  return (
    <form aria-label="Tạo bộ đề" onSubmit={submit} className="flex flex-wrap items-end gap-2 text-sm">
      <SetMetaFields />
      <Button type="submit" disabled={create.isPending}>Tạo bộ đề</Button>
      {(message || create.error) && <p role="alert" className="text-danger-600">{message || errorText(create.error)}</p>}
    </form>
  )
}

/** Objective question typed straight into the set (true/false answers are `true`/`false`). */
function ComposeQuestion({ set }: { set: ExamSetDetail }): React.ReactElement {
  const add = useExamSetCommand((input: AddExamSetQuestionRequest) => addExamSetQuestion(set.id, input))
  const [type, setType] = useState<'multiple_choice' | 'true_false'>('multiple_choice')
  const [message, setMessage] = useState('')
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const options = String(data.get('options') ?? '').split('\n').map((o) => o.trim()).filter(Boolean)
    const parsed = AddExamSetQuestionRequest.safeParse({
      questionType: type,
      questionText: data.get('questionText'),
      correctAnswer: data.get('correctAnswer'),
      points: data.get('points') || undefined,
      ...(type === 'multiple_choice' ? { options } : {}),
    })
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ'); return }
    add.mutate(parsed.data, { onSuccess: () => { form.reset(); setMessage('') } })
  }
  return (
    <form aria-label="Soạn câu hỏi" onSubmit={submit} className="grid gap-2 text-sm">
      <label className="grid gap-1">Loại câu<select value={type} className="c-input"
        onChange={(e) => setType(e.target.value as typeof type)}>
        <option value="multiple_choice">Trắc nghiệm</option><option value="true_false">Đúng / Sai</option>
      </select></label>
      <label className="grid gap-1">Nội dung câu hỏi<textarea name="questionText" required rows={2} className="c-input" /></label>
      {type === 'multiple_choice' && (
        <label className="grid gap-1">Các lựa chọn (mỗi dòng một)<textarea name="options" rows={4} className="c-input" /></label>
      )}
      <label className="grid gap-1">
        {type === 'multiple_choice' ? 'Đáp án đúng (chữ cái a/b/c… hoặc nội dung)' : 'Đáp án đúng (true / false)'}
        <input name="correctAnswer" required className="c-input" />
      </label>
      <label className="grid gap-1">Điểm<input name="points" type="number" min={1} max={100} defaultValue={1} className="c-input w-24" /></label>
      <div className="flex gap-2">
        <Button type="submit" disabled={add.isPending}>Thêm vào bộ đề</Button>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <ImagePlus className="h-4 w-4" />Thêm câu xong, bấm “Hình ảnh” ở câu đó để chèn hình.
        </p>
      </div>
      {(message || add.error) && <p role="alert" className="text-danger-600">{message || errorText(add.error)}</p>}
    </form>
  )
}

function SetEditor({ id, onClose }: { id: string; onClose: (nextId?: string) => void }): React.ReactElement {
  const detail = useExamSet(id)
  const [imagesFor, setImagesFor] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const reorder = useExamSetCommand((ids: string[]) => replaceExamSetItems(id, ids))
  const publish = useExamSetCommand(() => publishExamSet(id))
  const archive = useExamSetCommand(() => archiveExamSet(id))
  const duplicate = useExamSetCommand(() => duplicateExamSet(id))
  const remove = useExamSetCommand(() => deleteExamSet(id))
  if (detail.isPending) return <p className="text-sm text-slate-500">Đang tải bộ đề…</p>
  if (detail.error) return <p role="alert" className="text-sm text-danger-600">{errorText(detail.error)}</p>
  const set = detail.data
  const draft = set.status === 'draft'
  const ids = set.items.map((q) => q.id)
  const move = (from: number, to: number) => {
    const next = [...ids]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    reorder.mutate(next)
  }
  const failure = [reorder, publish, archive, duplicate, remove].find((m) => m.error)?.error
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{set.title}</h3>
        <Badge tone={STATUS[set.status].tone}>{STATUS[set.status].label}</Badge>
        <span className="text-sm text-slate-500">{set.levelCode} · {set.skill} · {set.itemCount} câu</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {draft && <Button size="sm" onClick={() => publish.mutate(undefined)}>Phát hành</Button>}
          {set.status === 'published' && <Button size="sm" variant="outline" onClick={() => archive.mutate(undefined)}>Lưu trữ</Button>}
          <Button size="sm" variant="outline" aria-label="Xem trước bộ đề"
            aria-pressed={previewing} onClick={() => setPreviewing((on) => !on)}>
            <Eye className="mr-1 h-4 w-4" />Xem trước</Button>
          <Button size="sm" variant="outline"
            onClick={() => duplicate.mutate(undefined, { onSuccess: (copy) => copy && onClose(copy.id) })}>Nhân bản</Button>
          {draft && <Button size="sm" variant="ghost" onClick={() => remove.mutate(undefined, { onSuccess: () => onClose() })}>
            <Trash2 className="mr-1 h-4 w-4" />Xoá</Button>}
        </div>
      </div>
      {!draft && <p className="text-sm text-slate-500">Bộ đề đã phát hành không thể sửa — dùng “Nhân bản” để tạo bản nháp mới.</p>}
      {previewing && <ExamSetPreview id={id} onClose={() => setPreviewing(false)} />}
      {failure && <p role="alert" className="text-sm text-danger-600">{errorText(failure)}</p>}
      <ol aria-label="Câu hỏi trong bộ đề" className="space-y-2">
        {set.items.map((q, index) => (
          <li key={q.id} className="rounded-md border border-slate-100 p-3 text-sm">
            <div className="flex items-start gap-2">
              <p className="flex-1 font-medium">Câu {index + 1}. {q.questionText}</p>
              <Button size="sm" variant={imagesFor === q.id ? 'default' : 'ghost'} aria-expanded={imagesFor === q.id}
                aria-label={`Hình ảnh câu ${index + 1}`} onClick={() => setImagesFor(imagesFor === q.id ? null : q.id)}>
                <ImagePlus className="mr-1 h-4 w-4" />Hình ảnh</Button>
              {draft && (
                <>
                  <Button size="sm" variant="ghost" aria-label={`Lên câu ${index + 1}`} disabled={index === 0}
                    onClick={() => move(index, index - 1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Xuống câu ${index + 1}`} disabled={index === ids.length - 1}
                    onClick={() => move(index, index + 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Bỏ câu ${index + 1}`}
                    onClick={() => reorder.mutate(ids.filter((x) => x !== q.id))}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
            {q.options && (
              <ul className="mt-1 pl-4 text-slate-600">
                {q.options.map((o, i) => <li key={o}>{String.fromCharCode(97 + i)}. {o}</li>)}
              </ul>
            )}
            <p className="mt-1 text-xs text-slate-500">Đáp án: {q.correctAnswer} · {q.points} điểm</p>
            {imagesFor === q.id && (
              <QuestionImages questionId={q.id} label={`Hình câu ${index + 1}`} options={q.options ?? null} editable={draft} />
            )}
          </li>
        ))}
      </ol>
      {draft && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="font-medium">Thêm từ ngân hàng</h4>
            <BankPicker
              set={set}
              onAdd={(q) => reorder.mutate([...ids, q.id])}
              onAddMany={(sel) => reorder.mutate([...ids, ...sel])}
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Soạn câu mới</h4>
            <ComposeQuestion set={set} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Admin/Teacher: fixed exam sets (slice-11a, ADR 0011) and exam blueprints that use them. */
export function ExamSetsPage(): React.ReactElement {
  const [status, setStatus] = useState<ExamSetStatus | ''>('')
  const [selected, setSelected] = useState<string | null>(null)
  const sets = useExamSets(status ? { status } : {})
  const exams = useExams()
  return (
    <div className="space-y-6">
      <PageHeader icon={FileStack} title="Bộ đề & đề thi"
        description="Soạn bộ đề cố định, phát hành rồi gắn vào đề thi; hoặc tạo đề ngẫu nhiên từ ngân hàng." />
      <Card className="space-y-4">
        <CardTitle>Bộ đề</CardTitle>
        <CreateSetForm onCreated={setSelected} />
        <ImportExamSet onImported={setSelected} />
        <label className="block text-sm">Lọc trạng thái<select aria-label="Lọc trạng thái" value={status} className="c-input ml-2"
          onChange={(e) => setStatus(e.target.value as ExamSetStatus | '')}>
          <option value="">Tất cả</option>
          {Object.entries(STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </select></label>
        {sets.error && <p role="alert" className="text-sm text-danger-600">{errorText(sets.error)}</p>}
        {sets.data?.length === 0 && <p className="text-sm text-slate-500">Chưa có bộ đề nào.</p>}
        {sets.data && sets.data.length > 0 && (
          <table className="c-table">
            <thead><tr><th>Tên</th><th>Cấp độ / kỹ năng</th><th>Số câu</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {sets.data.map((set) => (
                <tr key={set.id}>
                  <td>{set.title}</td>
                  <td>{set.levelCode} · {set.skill}</td>
                  <td>{set.itemCount}</td>
                  <td><Badge tone={STATUS[set.status].tone}>{STATUS[set.status].label}</Badge></td>
                  <td><Button size="sm" variant={selected === set.id ? 'default' : 'outline'}
                    onClick={() => setSelected(set.id)}>Mở</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {selected && (
        <Card>
          <SetEditor key={selected} id={selected} onClose={(nextId) => setSelected(nextId ?? null)} />
        </Card>
      )}
      <Card className="space-y-4">
        <CardTitle>Đề thi</CardTitle>
        <BlueprintForm onCreated={() => void exams.refetch()} />
        {exams.data && exams.data.length > 0 && (
          <table className="c-table">
            <thead><tr><th>Đề thi</th><th>Cách ra đề</th><th>Số câu</th><th>Mở – đóng</th></tr></thead>
            <tbody>
              {exams.data.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.title}</td>
                  <td><Badge tone={exam.mode === 'fixed_set' ? 'accent' : 'primary'}>
                    {exam.mode === 'fixed_set' ? `Bộ đề cố định (${exam.examSetIds.length})` : 'Ngẫu nhiên'}</Badge></td>
                  <td>{exam.questionCount}</td>
                  <td>{new Date(exam.opensAt).toLocaleString('vi-VN')} – {new Date(exam.closesAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
