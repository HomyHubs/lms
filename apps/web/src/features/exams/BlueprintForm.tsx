import { useEffect, useState, type FormEvent } from 'react'
import { CreateExamRequest, type ExamMode, type ExamSet } from '@lms/shared'
import { createExamBlueprint, listExamSets } from '@/lib/api'
import { Button } from '@/components/ui/button'

const FIXED_SET_KEYS = ['examSetIds', 'shuffleQuestions', 'shuffleOptions']

/** Form values are strings; fixed-set fields are rebuilt into typed arrays/booleans before validation. */
function formToRequest(data: FormData): unknown {
  const base = Object.fromEntries([...data.entries()].filter(([key]) => !FIXED_SET_KEYS.includes(key)))
  if (base.mode !== 'fixed_set') return base
  return {
    ...base,
    examSetIds: data.getAll('examSetIds').map(String),
    shuffleQuestions: data.has('shuffleQuestions'),
    shuffleOptions: data.has('shuffleOptions'),
  }
}

export function BlueprintForm({ onCreated }: { onCreated: () => void }): React.ReactElement {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<ExamMode>('random')
  const [sets, setSets] = useState<ExamSet[] | null>(null)

  useEffect(() => {
    if (mode !== 'fixed_set' || sets !== null) return
    listExamSets({ status: 'published' }).then(setSets, (error: Error) => { setSets([]); setMessage(error.message) })
  }, [mode, sets])

  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    const parsed = CreateExamRequest.safeParse(formToRequest(new FormData(form)))
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ'); return }
    setBusy(true)
    try {
      await createExamBlueprint({ ...parsed.data,
        opensAt: new Date(parsed.data.opensAt).toISOString(), closesAt: new Date(parsed.data.closesAt).toISOString() })
      form.reset()
      setMode('random')
      setMessage('Đã tạo đề thi')
      onCreated()
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }
  return (
    <form aria-label="Tạo đề thi" onSubmit={(event) => void create(event)} className="grid gap-3 rounded-lg border p-5">
      <h2 className="text-lg font-medium">Tạo đề thi</h2>
      <label>Tên đề<input name="title" required maxLength={200} className="ml-2 border p-2" /></label>
      <label>Cấp độ<select name="level" defaultValue="starter" className="ml-2 border p-2">
        <option value="starter">Starter</option><option value="mover">Mover</option><option value="flyer">Flyer</option>
      </select></label>
      <label>Kỹ năng<select name="skill" defaultValue="reading" className="ml-2 border p-2">
        <option value="reading">Reading</option><option value="listening">Listening</option>
        <option value="writing">Writing</option><option value="speaking">Speaking</option>
      </select></label>
      <label>Cách ra đề<select name="mode" value={mode} onChange={(e) => setMode(e.target.value as ExamMode)}
        className="ml-2 border p-2">
        <option value="random">Ngẫu nhiên từ ngân hàng</option>
        <option value="fixed_set">Bộ đề cố định</option>
      </select></label>
      {mode === 'random' ? (
        <label>Số câu<input name="questionCount" type="number" defaultValue={10} min={1} max={200} required className="ml-2 border p-2" /></label>
      ) : (
        <fieldset className="grid gap-2 rounded border p-3 text-sm">
          <legend className="px-1 font-medium">Bộ đề đã phát hành (cùng cấp độ & kỹ năng)</legend>
          {sets === null && <p>Đang tải bộ đề…</p>}
          {sets?.length === 0 && <p>Chưa có bộ đề đã phát hành — tạo ở trang “Bộ đề”.</p>}
          {sets?.map((set) => (
            <label key={set.id}>
              <input type="checkbox" name="examSetIds" value={set.id} className="mr-2" />
              {set.title} · {set.levelCode}/{set.skill} · {set.itemCount} câu
            </label>
          ))}
          <label><input type="checkbox" name="shuffleQuestions" className="mr-2" />Trộn thứ tự câu</label>
          <label><input type="checkbox" name="shuffleOptions" className="mr-2" />Trộn đáp án trắc nghiệm</label>
          <label>Khi thi lại<select name="retakeStrategy" defaultValue="same_set_shuffled" className="ml-2 border p-1">
            <option value="same_set_shuffled">Cùng bộ, trộn lại</option>
            <option value="alternate_sets">Đổi sang bộ khác (theo thứ tự chọn)</option>
          </select></label>
        </fieldset>
      )}
      <label>Thời lượng (phút)<input name="durationMinutes" type="number" defaultValue={30} min={1} max={600} required className="ml-2 border p-2" /></label>
      <label>Mở lúc (giờ địa phương)<input name="opensAt" type="datetime-local" required className="ml-2 border p-2" /></label>
      <label>Đóng lúc (giờ địa phương)<input name="closesAt" type="datetime-local" required className="ml-2 border p-2" /></label>
      <Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo đề'}</Button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
