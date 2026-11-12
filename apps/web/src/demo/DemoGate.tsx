import { useState } from 'react'
import { App } from '@/App'
import { DemoDataLoader } from './DemoDataLoader'
import { clearDataset, hasDataset, isDemoMode } from './store'

/**
 * Cổng demo: bọc ngoài <App/>.
 * - Không ở demo mode -> render App bình thường (dev với backend thật).
 * - Demo mode nhưng chưa nạp dữ liệu -> hiện DemoDataLoader.
 * - Đã nạp -> render App kèm banner "chỉ xem".
 */
export function DemoGate(): React.ReactElement {
  const [loaded, setLoaded] = useState<boolean>(hasDataset())

  if (!isDemoMode()) return <App />
  if (!loaded) return <DemoDataLoader onLoaded={() => setLoaded(true)} />

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
        <span>Chế độ demo — chỉ xem (read-only). Dữ liệu không thay đổi.</span>
        <button
          type="button"
          onClick={() => {
            clearDataset()
            setLoaded(false)
          }}
          className="rounded border border-amber-400 px-2 py-0.5 font-medium hover:bg-amber-200"
        >
          Đổi file
        </button>
      </div>
      <div className="flex-1">
        <App />
      </div>
    </div>
  )
}
