import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CreateExamRequest, type ExamMode, type ExamSet, type LevelCode } from '@lms/shared'
import { createExamBlueprint, listExamSets } from '@/lib/api'
import { useClasses, useCourses, useLevels } from '@/features/catalog/useCatalog'
import { Button } from '@/components/ui/button'

// slice-14: classIds la mang; tach khoi FormData roi gan rieng (giong examSetIds).
const FIXED_SET_KEYS = ['examSetIds', 'shuffleQuestions', 'shuffleOptions', 'classIds']

/** Form values are strings; fixed-set + class fields are rebuilt into typed arrays/booleans before validation. */
function formToRequest(data: FormData, classIds: string[]): unknown {
  const base = Object.fromEntries([...data.entries()].filter(([key]) => !FIXED_SET_KEYS.includes(key)))
  const withClasses = { ...base, classIds }
  if (base.mode !== 'fixed_set') return withClasses
  return {
    ...withClasses,
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
  // slice-14: level + lop ap dung (controlled de loc lop theo cap do dang chon).
  const [level, setLevel] = useState<LevelCode>('starter')
  const [classIds, setClassIds] = useState<string[]>([])

  const levelsQuery = useLevels()
  const coursesQuery = useCourses()
  const classesQuery = useClasses()

  // Lop cung cap do dang chon (map lop -> course -> level).
  const levelClasses = useMemo(() => {
    const levelId = levelsQuery.data?.find((l) => l.code === level)?.id
    if (!levelId) return []
    const courseIds = new Set((coursesQuery.data ?? []).filter((c) => c.levelId === levelId).map((c) => c.id))
    return (classesQuery.data ?? []).filter((c) => courseIds.has(c.courseId))
  }, [level, levelsQuery.data, coursesQuery.data, classesQuery.data])

  // Khi doi cap do, bo cac lop da chon khong con thuoc cap do moi.
  useEffect(() => {
    const allowed = new Set(levelClasses.map((c) => c.id))
    setClassIds((prev) => prev.filter((id) => allowed.has(id)))
  }, [levelClasses])

  useEffect(() => {
    if (mode !== 'fixed_set' || sets !== null) return
    listExamSets({ status: 'published' }).then(setSets, (error: Error) => { setSets([]); setMessage(error.message) })
  }, [mode, sets])

  function toggleClass(id: string): void {
    setClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    const parsed = CreateExamRequest.safeParse(formToRequest(new FormData(form), classIds))
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
    // slice-20 (4.1): bố cục lại theo nhóm trường + lưới nhiều cột. Giữ nguyên name/validation/logic.
    <form aria-label="Tạo đề thi" onSubmit={(event) => void create(event)} className="grid gap-5 rounded-lg border p-5">
      <h2 className="text-lg font-medium">Tạo đề thi</h2>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium text-slate-700">Thông tin chung</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-sm">Tên đề
            <input name="title" required maxLength={200} className="border p-2" /></label>
          <label className="grid gap-1 text-sm">Cấp độ
            <select name="level" value={level} onChange={(e) => setLevel(e.target.value as LevelCode)} className="border p-2">
              <option value="starter">Starter</option><option value="mover">Mover</option><option value="flyer">Flyer</option>
            </select></label>
          <label className="grid gap-1 text-sm">Kỹ năng
            <select name="skill" defaultValue="reading" className="border p-2">
              <option value="reading">Reading</option><option value="listening">Listening</option>
              <option value="writing">Writing</option><option value="speaking">Speaking</option>
            </select></label>
          <label className="grid gap-1 text-sm">Thời lượng (phút)
            <input name="durationMinutes" type="number" defaultValue={30} min={1} max={600} required className="border p-2" /></label>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium text-slate-700">Lịch mở / đóng</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Mở lúc (giờ địa phương)
            <input name="opensAt" type="datetime-local" required className="border p-2" /></label>
          <label className="grid gap-1 text-sm">Đóng lúc (giờ địa phương)
            <input name="closesAt" type="datetime-local" required className="border p-2" /></label>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium text-slate-700">Nguồn câu hỏi</legend>
        <label className="grid gap-1 text-sm sm:max-w-xs">Cách ra đề
          <select name="mode" value={mode} onChange={(e) => setMode(e.target.value as ExamMode)} className="border p-2">
            <option value="random">Ngẫu nhiên từ ngân hàng</option>
            <option value="fixed_set">Bộ đề cố định</option>
          </select></label>
        {mode === 'random' ? (
          <label className="grid gap-1 text-sm sm:max-w-xs">Số câu
            <input name="questionCount" type="number" defaultValue={10} min={1} max={200} required className="border p-2" /></label>
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
      </fieldset>

      <fieldset className="grid gap-2 rounded border p-3 text-sm">
        <legend className="px-1 font-medium">Lớp áp dụng (tùy chọn — để trống = toàn cấp độ)</legend>
        {levelClasses.length === 0 && <p>Chưa có lớp nào thuộc cấp độ này.</p>}
        {levelClasses.map((klass) => (
          <label key={klass.id}>
            <input
              type="checkbox"
              name="classIds"
              value={klass.id}
              checked={classIds.includes(klass.id)}
              onChange={() => toggleClass(klass.id)}
              className="mr-2"
            />
            {klass.name}
          </label>
        ))}
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo đề'}</Button>
        {message && <p role="status">{message}</p>}
      </div>
    </form>
  )
}
