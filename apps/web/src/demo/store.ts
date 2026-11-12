/**
 * Demo mode store (chế độ demo — chỉ xem, không server/DB).
 *
 * Giữ dataset đang nạp trong bộ nhớ + sessionStorage để reload không mất.
 * Demo mode BẬT khi: build có VITE_DEMO='1' (bản static trên Vercel),
 * hoặc khi đã nạp một dataset (người dùng chọn file ở môi trường dev).
 */

const STORAGE_KEY = 'lms-demo-dataset'

/** Dataset demo: map từ "đường dẫn API" sang dữ liệu trả về.
 * Interceptor đọc theo key cố định; xem interceptor.ts để biết key nào dùng ở đâu. */
export type DemoDataset = Record<string, unknown> & {
  me: { user: unknown }
}

let dataset: DemoDataset | null = null

/** Demo mode bật khi build flag VITE_DEMO='1'. Luôn bật trên bản static Vercel. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO === '1'
}

export function getDataset(): DemoDataset | null {
  if (dataset) return dataset
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      dataset = JSON.parse(raw) as DemoDataset
      return dataset
    }
  } catch {
    // sessionStorage không khả dụng hoặc JSON hỏng: coi như chưa nạp.
  }
  return null
}

export function setDataset(d: DemoDataset): void {
  dataset = d
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    // Bỏ qua nếu không ghi được sessionStorage (vẫn giữ trong bộ nhớ).
  }
}

export function clearDataset(): void {
  dataset = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function hasDataset(): boolean {
  return getDataset() !== null
}
