import { useState, type FormEvent } from 'react'
import { CreateExamRequest } from '@lms/shared'
import { createExamBlueprint } from '@/lib/api'
import { Button } from '@/components/ui/button'

export function BlueprintForm({ onCreated }: { onCreated: () => void }): React.ReactElement {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const parsed = CreateExamRequest.safeParse(Object.fromEntries(data.entries()))
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ'); return }
    setBusy(true)
    try {
      await createExamBlueprint({ ...parsed.data,
        opensAt: new Date(parsed.data.opensAt).toISOString(), closesAt: new Date(parsed.data.closesAt).toISOString() })
      form.reset()
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
      <label>Số câu<input name="questionCount" type="number" defaultValue={10} min={1} max={200} required className="ml-2 border p-2" /></label>
      <label>Thời lượng (phút)<input name="durationMinutes" type="number" defaultValue={30} min={1} max={600} required className="ml-2 border p-2" /></label>
      <label>Mở lúc (giờ địa phương)<input name="opensAt" type="datetime-local" required className="ml-2 border p-2" /></label>
      <label>Đóng lúc (giờ địa phương)<input name="closesAt" type="datetime-local" required className="ml-2 border p-2" /></label>
      <Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo đề'}</Button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
