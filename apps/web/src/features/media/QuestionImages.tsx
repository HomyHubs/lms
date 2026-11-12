import { useState, type ClipboardEvent, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { MEDIA_MAX_BYTES, MEDIA_MIME_TYPES, type QuestionMediaItem } from '@lms/shared'
import { getQuestionMedia, setQuestionMedia, uploadMedia } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ExamImage } from './ExamImage'

const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'Có lỗi xảy ra')
const letter = (index: number) => String.fromCharCode(97 + index)

/** `stem` or the option index as a string, so one <select> covers every slot. */
type SlotValue = 'stem' | `${number}`

function toItem(slot: SlotValue, mediaId: string): QuestionMediaItem {
  return slot === 'stem' ? { mediaId, slot: 'stem', optionIndex: null } : { mediaId, slot: 'option', optionIndex: Number(slot) }
}

/**
 * Images of one question (slice-12): upload by file picker, drag-drop or paste, choose the slot
 * (question text or an option), remove. Read-only when the question is held by a published set.
 */
export function QuestionImages({ questionId, label, options, editable }: {
  questionId: string
  label: string
  options: string[] | null
  editable: boolean
}): React.ReactElement {
  const key = ['question-media', questionId]
  const qc = useQueryClient()
  const media = useQuery({ queryKey: key, queryFn: () => getQuestionMedia(questionId) })
  const save = useMutation({
    mutationFn: (items: QuestionMediaItem[]) => setQuestionMedia(questionId, items),
    onSuccess: (list) => qc.setQueryData(key, list),
  })
  const [slot, setSlot] = useState<SlotValue>('stem')
  const [message, setMessage] = useState('')
  const current = (media.data ?? []).map((m) => (m.slot === 'stem' ? toItem('stem', m.mediaId) : toItem(`${m.optionIndex ?? 0}`, m.mediaId)))

  async function add(file: File | undefined): Promise<void> {
    if (!file) return
    if (!(MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) { setMessage('Chỉ nhận ảnh PNG, JPEG, WebP hoặc GIF'); return }
    if (file.size > MEDIA_MAX_BYTES) { setMessage('Ảnh tối đa 2MB'); return }
    setMessage('')
    try {
      const uploaded = await uploadMedia(file)
      const kept = slot === 'stem' ? current : current.filter((m) => m.optionIndex !== Number(slot))
      save.mutate([...kept, toItem(slot, uploaded.id)])
    } catch (error) {
      setMessage(errorText(error))
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); void add(event.dataTransfer.files[0]) }
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = [...event.clipboardData.files].find((f) => f.type.startsWith('image/'))
    if (file) { event.preventDefault(); void add(file) }
  }

  if (media.isPending) return <p className="text-xs text-slate-500">Đang tải hình…</p>
  if (media.error) return <p role="alert" className="text-xs text-danger-600">{errorText(media.error)}</p>
  return (
    <div className="mt-2 space-y-2 text-xs">
      {(media.data ?? []).length === 0 && <p className="text-slate-500">Chưa có hình.</p>}
      <ul className="flex flex-wrap gap-3">
        {(media.data ?? []).map((m, index) => {
          const place = m.slot === 'stem' ? 'đề bài' : `lựa chọn ${letter(m.optionIndex ?? 0)}`
          return (
            <li key={`${m.mediaId}-${index}`} className="space-y-1">
              <ExamImage src={m.url} alt={`${label} — ${place}`} className="max-h-24" />
              <div className="flex items-center gap-1">
                <span>{place}</span>
                {editable && (
                  <Button type="button" size="sm" variant="ghost" aria-label={`Gỡ hình ${place}`} disabled={save.isPending}
                    onClick={() => save.mutate(current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {editable && (
        <div onDrop={onDrop} onDragOver={(event) => event.preventDefault()} onPaste={onPaste}
          className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-slate-300 p-2">
          <label className="flex items-center gap-1">Gắn vào
            <select value={slot} onChange={(event) => setSlot(event.target.value as SlotValue)} className="c-input">
              <option value="stem">Đề bài</option>
              {(options ?? []).map((o, i) => <option key={o} value={`${i}`}>Lựa chọn {letter(i)}</option>)}
            </select>
          </label>
          <label className="cursor-pointer text-primary-700 underline">Chọn ảnh
            <input type="file" accept={MEDIA_MIME_TYPES.join(',')} className="sr-only" aria-label={`Chọn ảnh cho ${label}`}
              onChange={(event) => { void add(event.target.files?.[0]); event.target.value = '' }} />
          </label>
          <span className="text-slate-500">hoặc kéo-thả / dán ảnh vào đây (≤ 2MB, ≤ 4000×4000 px)</span>
        </div>
      )}
      {(message || save.error) && <p role="alert" className="text-danger-600">{message || errorText(save.error)}</p>}
    </div>
  )
}
