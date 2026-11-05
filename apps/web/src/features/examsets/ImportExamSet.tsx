import { useState, type FormEvent } from 'react'
import { FileUp } from 'lucide-react'
import {
  EXAM_IMPORT_MAX_BYTES,
  ExamSetImportPreviewQuery,
  type ExamSetImportIssue,
  type ExamSetImportItem,
  type ExamSetImportPreview,
} from '@lms/shared'
import { commitExamSetImport, previewExamSetImport } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/card'
import { SetMetaFields } from './LevelSkillFields'
import { useExamSetCommand } from './useExamSets'

const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'Có lỗi xảy ra')

const TEMPLATES = [
  { href: '/templates/mau-bo-de.docx', label: 'Mẫu Word (.docx)' },
  { href: '/templates/mau-bo-de.xlsx', label: 'Mẫu Excel (.xlsx)' },
  { href: '/templates/mau-bo-de.csv', label: 'Mẫu CSV' },
]

function issuePlace(issue: ExamSetImportIssue): string {
  if (issue.block !== null) return `Câu ${issue.block}`
  if (issue.row !== null) return `Dòng ${issue.row}`
  return 'File'
}

/** Index of the correct option: a letter (a/b/c…) or the option text itself. */
function correctIndex(item: ExamSetImportItem): number {
  if (!item.options) return -1
  const answer = item.correctAnswer.trim().toLowerCase()
  if (/^[a-z]$/.test(answer)) return answer.charCodeAt(0) - 97
  return item.options.findIndex((o) => o.trim().toLowerCase() === answer)
}

function PreviewTable({ items }: { items: ExamSetImportItem[] }): React.ReactElement {
  return (
    <table className="c-table" aria-label="Xem trước câu hỏi">
      <thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án</th><th>Điểm</th><th>Trạng thái</th></tr></thead>
      <tbody>
        {items.map((item) => {
          const correct = correctIndex(item)
          return (
            <tr key={item.order}>
              <td>{item.order}</td>
              <td>
                <p>{item.questionText}</p>
                {item.options && (
                  <ul className="pl-4 text-slate-600">
                    {item.options.map((o, i) => (
                      <li key={`${i}-${o}`} className={i === correct ? 'font-semibold text-success-700' : undefined}>
                        {String.fromCharCode(97 + i)}. {o}{i === correct ? ' ✓' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td>{item.correctAnswer}</td>
              <td>{item.points}</td>
              <td className="text-xs text-warning-700">
                <Badge tone={item.warnings.length === 0 ? 'success' : 'warning'}>
                  {item.warnings.length === 0 ? 'OK' : 'Cảnh báo'}
                </Badge>
                {item.warnings.map((w) => <p key={w}>{w}</p>)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/**
 * slice-11b: import a whole exam set from Word / Excel / CSV. Step 1 previews (nothing saved),
 * step 2 confirms and creates a draft set that opens in the editor.
 */
export function ImportExamSet({ onImported }: { onImported: (id: string) => void }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ExamSetImportPreview | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const commit = useExamSetCommand(commitExamSetImport)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const file = (form.elements.namedItem('file') as HTMLInputElement | null)?.files?.[0]
    setPreview(null)
    commit.reset()
    if (!file || file.size === 0) { setMessage('Chọn file .docx, .xlsx hoặc .csv'); return }
    if (file.size > EXAM_IMPORT_MAX_BYTES) { setMessage('File vượt quá 10 MB'); return }
    const meta = ExamSetImportPreviewQuery.safeParse({
      title: data.get('title'), level: data.get('level'), skill: data.get('skill'), fileName: file.name,
    })
    if (!meta.success) { setMessage(meta.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ'); return }
    setMessage('')
    setLoading(true)
    try {
      setPreview(await previewExamSetImport(file, meta.data))
    } catch (error) {
      setMessage(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  function confirm(): void {
    if (!preview) return
    commit.mutate({
      title: preview.title,
      level: preview.level,
      skill: preview.skill,
      items: preview.items.map((item) => ({
        questionType: item.questionType,
        difficulty: item.difficulty,
        questionText: item.questionText,
        options: item.options,
        correctAnswer: item.correctAnswer,
        points: item.points,
        explanation: item.explanation,
      })),
    }, {
      onSuccess: (set) => { setPreview(null); setOpen(false); if (set) onImported(set.id) },
    })
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="mr-1 h-4 w-4" />Import từ Word/Excel
      </Button>
    )
  }

  const blocked = !preview || preview.errors.length > 0 || preview.items.length === 0
  return (
    <section aria-label="Import bộ đề" className="space-y-3 rounded-md border border-slate-200 p-3 text-sm">
      <form aria-label="Import bộ đề từ file" onSubmit={(e) => void submit(e)} className="flex flex-wrap items-end gap-2">
        <SetMetaFields />
        <label className="grid gap-1">File đề (.docx, .xlsx, .csv)
          <input name="file" type="file" accept=".docx,.xlsx,.csv" className="c-input" />
        </label>
        <Button type="submit" disabled={loading}>{loading ? 'Đang đọc…' : 'Xem trước'}</Button>
        <Button type="button" variant="ghost" onClick={() => { setOpen(false); setPreview(null); setMessage('') }}>Đóng</Button>
      </form>
      <p className="text-slate-500">
        Tải file mẫu:{' '}
        {TEMPLATES.map((t, i) => (
          <span key={t.href}>{i > 0 && ' · '}<a className="underline" href={t.href} download>{t.label}</a></span>
        ))}
      </p>
      {message && <p role="alert" className="text-danger-600">{message}</p>}
      {preview && (
        <div className="space-y-2">
          <p>{preview.items.length} câu hợp lệ · {preview.errors.length} lỗi · định dạng {preview.format}</p>
          {preview.warnings.length > 0 && (
            <ul className="text-warning-700">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          )}
          {preview.errors.length > 0 && (
            <ul aria-label="Lỗi import" className="list-disc pl-5 text-danger-600">
              {preview.errors.map((e, i) => <li key={i}>{issuePlace(e)} · {e.field}: {e.message}</li>)}
            </ul>
          )}
          {preview.items.length > 0 && <PreviewTable items={preview.items} />}
          {preview.errors.length > 0 && <p className="text-danger-600">Sửa file rồi xem trước lại — chưa có gì được lưu.</p>}
          <Button type="button" disabled={blocked || commit.isPending} onClick={confirm}>Xác nhận import</Button>
          {commit.error && <p role="alert" className="text-danger-600">{errorText(commit.error)}</p>}
        </div>
      )}
    </section>
  )
}
