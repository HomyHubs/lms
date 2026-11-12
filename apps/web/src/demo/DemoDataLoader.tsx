import { useRef, useState } from 'react'
import type { DemoDataset } from './store'
import { setDataset } from './store'

/**
 * Màn nạp dữ liệu cho chế độ demo. Hiện khi demo mode bật nhưng chưa có dataset.
 * - Nút "Chọn file dữ liệu": đọc file .json người dùng chọn.
 * - Nút "Dùng dữ liệu mẫu": tải /demo-data.json kèm sẵn trong bản build.
 */
export function DemoDataLoader({ onLoaded }: { onLoaded: () => void }): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function accept(parsed: unknown): void {
    if (!parsed || typeof parsed !== 'object' || !('me' in parsed)) {
      setError('File không hợp lệ: thiếu trường "me" (người dùng demo).')
      return
    }
    setDataset(parsed as DemoDataset)
    onLoaded()
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const text = await file.text()
      accept(JSON.parse(text))
    } catch {
      setError('Không đọc được JSON từ file đã chọn.')
    }
  }

  async function useSample(): Promise<void> {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/demo-data.json')
      if (!res.ok) throw new Error('fetch failed')
      accept(await res.json())
    } catch {
      setError('Không tải được dữ liệu mẫu (/demo-data.json).')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">LMS — Bản demo (chỉ xem)</h1>
        <p className="mt-2 text-sm text-slate-500">
          Bản demo chạy hoàn toàn trên trình duyệt, không cần máy chủ hay cơ sở dữ liệu. Hãy chọn một
          file dữ liệu JSON để xem, hoặc dùng dữ liệu mẫu có sẵn. Mọi thao tác chỉnh sửa đều bị khóa.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Chọn file dữ liệu
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            type="button"
            onClick={useSample}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? 'Đang tải…' : 'Dùng dữ liệu mẫu'}
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}
