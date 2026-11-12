import { useState, type FormEvent } from 'react'
import { Building2, MapPin, Trash2 } from 'lucide-react'
import { CreateBranchRequest, CreateCenterRequest } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import {
  useBranches,
  useCenters,
  useCreateBranch,
  useCreateCenter,
  useDeleteBranch,
  useDeleteCenter,
} from './useCenters'

/**
 * Trang quan ly Center (trung tam) + Branch (co so) — slice-1 Task 2. Chi Admin (route guard).
 * Giao dien toi gian (bang danh sach + form) theo "Stub cho phep" cua slice-1.
 */
export function CentersPage(): React.ReactElement {
  const centersQuery = useCenters()
  const branchesQuery = useBranches()
  const createCenter = useCreateCenter()
  const deleteCenter = useDeleteCenter()
  const createBranch = useCreateBranch()
  const deleteBranch = useDeleteBranch()

  const [centerName, setCenterName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [branchAddress, setBranchAddress] = useState('')
  const [branchCenterId, setBranchCenterId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function handleCreateCenter(e: FormEvent): void {
    e.preventDefault()
    setFormError(null)
    const parsed = CreateCenterRequest.safeParse({ name: centerName })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    createCenter.mutate(parsed.data, {
      onSuccess: () => setCenterName(''),
      onError: (err) => setFormError((err as Error).message),
    })
  }

  function handleCreateBranch(e: FormEvent): void {
    e.preventDefault()
    setFormError(null)
    const parsed = CreateBranchRequest.safeParse({
      centerId: branchCenterId,
      name: branchName,
      address: branchAddress.trim() === '' ? undefined : branchAddress,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    createBranch.mutate(parsed.data, {
      onSuccess: () => {
        setBranchName('')
        setBranchAddress('')
      },
      onError: (err) => setFormError((err as Error).message),
    })
  }

  return (
    <>
      <PageHeader icon={Building2} title="Quản lý trung tâm & cơ sở" />

      {formError && (
        <p role="alert" className="text-sm text-danger-600">
          {formError}
        </p>
      )}

      <section className="c-card">
        <h2 className="c-section-title">
          <Building2 className="h-5 w-5" /> Trung tâm
        </h2>
        <form onSubmit={handleCreateCenter} className="flex gap-3">
          <input
            aria-label="Tên trung tâm"
            value={centerName}
            onChange={(e) => setCenterName(e.target.value)}
            placeholder="Tên trung tâm"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={createCenter.isPending}>
            Thêm trung tâm
          </Button>
        </form>
        {centersQuery.data && (
          <ul className="divide-y divide-slate-100">
            {centersQuery.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span>{c.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteCenter.mutate(c.id)}
                  disabled={deleteCenter.isPending}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Xoá
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="c-card">
        <h2 className="c-section-title">
          <MapPin className="h-5 w-5" /> Cơ sở
        </h2>
        <form onSubmit={handleCreateBranch} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            aria-label="Trung tâm của cơ sở"
            value={branchCenterId}
            onChange={(e) => setBranchCenterId(e.target.value)}
            className="c-input"
          >
            <option value="">-- Chọn trung tâm --</option>
            {centersQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Tên cơ sở"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Tên cơ sở"
            className="c-input"
          />
          <input
            aria-label="Địa chỉ"
            value={branchAddress}
            onChange={(e) => setBranchAddress(e.target.value)}
            placeholder="Địa chỉ (tuỳ chọn)"
            className="c-input"
          />
          <Button type="submit" disabled={createBranch.isPending}>
            Thêm cơ sở
          </Button>
        </form>
        {branchesQuery.data && (
          <table className="c-table">
            <thead>
              <tr>
                <th>Tên cơ sở</th>
                <th>Địa chỉ</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {branchesQuery.data.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.address ?? '—'}</td>
                  <td className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBranch.mutate(b.id)}
                      disabled={deleteBranch.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Xoá
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
