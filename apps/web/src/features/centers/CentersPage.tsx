import { useState, type FormEvent } from 'react'
import { Building2, MapPin, Pencil, Trash2 } from 'lucide-react'
import { CreateBranchRequest, CreateCenterRequest, UpdateBranchRequest, UpdateCenterRequest } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/card'
import {
  useBranches,
  useCenters,
  useCreateBranch,
  useCreateCenter,
  useDeleteBranch,
  useDeleteCenter,
  useUpdateBranch,
  useUpdateCenter,
} from './useCenters'

/**
 * Trang quan ly Center (trung tam) + Branch (co so) — slice-1 Task 2, sua thong tin o slice-27.
 * Chi Admin (route guard). Bang danh sach + form tao nhanh + form sua inline theo tung dong.
 */
export function CentersPage(): React.ReactElement {
  const centersQuery = useCenters()
  const branchesQuery = useBranches()
  const createCenter = useCreateCenter()
  const deleteCenter = useDeleteCenter()
  const createBranch = useCreateBranch()
  const deleteBranch = useDeleteBranch()
  const updateCenter = useUpdateCenter()
  const updateBranch = useUpdateBranch()

  const [centerName, setCenterName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [branchAddress, setBranchAddress] = useState('')
  const [branchCenterId, setBranchCenterId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // slice-27: dong dang sua (chi 1 dong moi luc) + gia tri nhap.
  const [editingCenterId, setEditingCenterId] = useState<string | null>(null)
  const [centerEditName, setCenterEditName] = useState('')
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [branchEditName, setBranchEditName] = useState('')
  const [branchEditAddress, setBranchEditAddress] = useState('')

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

  function startEditCenter(id: string, currentName: string): void {
    setFormError(null)
    setEditingBranchId(null)
    setEditingCenterId(id)
    setCenterEditName(currentName)
  }

  function cancelEditCenter(): void {
    setEditingCenterId(null)
    setCenterEditName('')
  }

  function saveCenter(e: FormEvent, id: string): void {
    e.preventDefault()
    setFormError(null)
    const parsed = UpdateCenterRequest.safeParse({ name: centerEditName })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    updateCenter.mutate(
      { id, input: parsed.data },
      { onSuccess: cancelEditCenter, onError: (err) => setFormError((err as Error).message) },
    )
  }

  function startEditBranch(id: string, currentName: string, currentAddress: string | null): void {
    setFormError(null)
    setEditingCenterId(null)
    setEditingBranchId(id)
    setBranchEditName(currentName)
    setBranchEditAddress(currentAddress ?? '')
  }

  function cancelEditBranch(): void {
    setEditingBranchId(null)
    setBranchEditName('')
    setBranchEditAddress('')
  }

  function saveBranch(id: string): void {
    setFormError(null)
    const parsed = UpdateBranchRequest.safeParse({
      name: branchEditName,
      address: branchEditAddress.trim() === '' ? null : branchEditAddress,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Du lieu khong hop le')
      return
    }
    updateBranch.mutate(
      { id, input: parsed.data },
      { onSuccess: cancelEditBranch, onError: (err) => setFormError((err as Error).message) },
    )
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
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                {editingCenterId === c.id ? (
                  <form onSubmit={(e) => saveCenter(e, c.id)} className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      aria-label="Tên trung tâm mới"
                      value={centerEditName}
                      onChange={(e) => setCenterEditName(e.target.value)}
                      className="min-w-40 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <Button type="submit" size="sm" disabled={updateCenter.isPending}>
                      Lưu
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={cancelEditCenter}>
                      Huỷ
                    </Button>
                  </form>
                ) : (
                  <>
                    <span>{c.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Sửa ${c.name}`}
                        onClick={() => startEditCenter(c.id, c.name)}
                      >
                        <Pencil className="mr-1 h-4 w-4" /> Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCenter.mutate(c.id)}
                        disabled={deleteCenter.isPending}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Xoá
                      </Button>
                    </div>
                  </>
                )}
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
                  {editingBranchId === b.id ? (
                    <>
                      <td>
                        <input
                          aria-label="Tên cơ sở mới"
                          value={branchEditName}
                          onChange={(e) => setBranchEditName(e.target.value)}
                          className="c-input"
                        />
                      </td>
                      <td>
                        <input
                          aria-label="Địa chỉ mới"
                          value={branchEditAddress}
                          onChange={(e) => setBranchEditAddress(e.target.value)}
                          className="c-input"
                        />
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => saveBranch(b.id)} disabled={updateBranch.isPending}>
                            Lưu
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelEditBranch}>
                            Huỷ
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{b.name}</td>
                      <td>{b.address ?? '—'}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Sửa ${b.name}`}
                            onClick={() => startEditBranch(b.id, b.name, b.address)}
                          >
                            <Pencil className="mr-1 h-4 w-4" /> Sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBranch.mutate(b.id)}
                            disabled={deleteBranch.isPending}
                          >
                            <Trash2 className="mr-1 h-4 w-4" /> Xoá
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
