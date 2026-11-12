import { useEffect, useState } from 'react'
import { MapPin, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import { useBranches } from '@/features/centers/useCenters'
import { useUsers } from '@/features/users/useUsers'
import { useSetUserBranches, useUserBranches } from './useUserBranches'

/**
 * Trang gan co so (Branch) cho nguoi dung — slice-1 Task 4. Chi Admin (route guard theo role).
 * Chon 1 nguoi dung, tich cac co so duoc gan, luu -> quyet dinh pham vi du lieu ho thay
 * (branch-scoped access). Giao dien toi gian theo "Stub cho phep" cua slice-1.
 */
export function AssignmentsPage(): React.ReactElement {
  const users = useUsers()
  const branches = useBranches()
  const setUserBranches = useSetUserBranches()

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [checked, setChecked] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  const assigned = useUserBranches(selectedUserId)

  // Khi doi nguoi dung: reset lua chon; khi tai xong tap Branch da gan: dong bo checkbox.
  useEffect(() => {
    setChecked([])
    setSaved(false)
  }, [selectedUserId])
  useEffect(() => {
    if (assigned.data) setChecked(assigned.data.map((b) => b.id))
  }, [assigned.data])

  function toggle(branchId: string): void {
    setSaved(false)
    setChecked((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    )
  }

  function handleSave(): void {
    if (!selectedUserId) return
    setUserBranches.mutate(
      { userId: selectedUserId, branchIds: checked },
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <>
      <PageHeader icon={MapPin} title="Gán cơ sở cho người dùng" />

      <section className="c-card">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Người dùng</span>
          <select
            aria-label="Người dùng"
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(e.target.value === '' ? null : e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn người dùng --</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.phoneNumber} ({u.role})
              </option>
            ))}
          </select>
        </label>

        {selectedUserId && (
          <>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4" /> Cơ sở được gán
              </span>
              {assigned.isLoading && <p className="text-sm text-slate-500">Đang tải…</p>}
              {branches.data?.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có cơ sở nào. Hãy tạo cơ sở trước.</p>
              )}
              {branches.data?.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    aria-label={b.name}
                    checked={checked.includes(b.id)}
                    onChange={() => toggle(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={setUserBranches.isPending}>
                <Save className="mr-1 h-4 w-4" /> Lưu
              </Button>
              {saved && <span className="text-sm text-success-600">Đã lưu</span>}
              {setUserBranches.isError && (
                <span role="alert" className="text-sm text-danger-600">
                  {(setUserBranches.error as Error).message}
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </>
  )
}
