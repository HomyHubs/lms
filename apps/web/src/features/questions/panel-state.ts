// NOTE (nợ kỹ thuật slice-18): Trạng thái đóng/mở của các panel chỉ được nhớ trên
// từng trình duyệt của user (localStorage), KHÔNG đồng bộ đa thiết bị. Nếu cần đồng bộ
// chéo thiết bị thì mở slice lưu preference phía server sau — không đổi schema DB ở đây.

/** Map mã cấp độ -> đang thu gọn (true = collapsed). Thiếu key nghĩa là đang mở. */
export type PanelState = Record<string, boolean>

function panelKey(userId: string): string {
  return `questions:panels:${userId}`
}

/**
 * Đọc trạng thái panel đã lưu cho user. Fallback về rỗng ({} = tất cả mở) khi:
 * không có userId, không có bản ghi, hoặc dữ liệu hỏng/không đọc được.
 * Theo đúng mẫu try/catch của `exam-draft.ts` (slice-4.3).
 */
export function readPanelState(userId: string | undefined): PanelState {
  if (!userId) return {}
  try {
    const raw = window.localStorage.getItem(panelKey(userId))
    if (!raw) return {}
    const value = JSON.parse(raw) as Record<string, unknown>
    const state: PanelState = {}
    if (value && typeof value === 'object') {
      for (const [code, collapsed] of Object.entries(value)) {
        if (typeof collapsed === 'boolean') state[code] = collapsed
      }
    }
    return state
  } catch {
    return {}
  }
}

/** Ghi trạng thái panel cho user. Không có userId thì bỏ qua (chế độ tất-cả-mở). */
export function writePanelState(userId: string | undefined, state: PanelState): void {
  if (!userId) return
  try {
    window.localStorage.setItem(panelKey(userId), JSON.stringify(state))
  } catch {
    // Storage đầy hoặc bị tắt: trạng thái panel chỉ là tiện ích, bỏ qua an toàn.
  }
}
