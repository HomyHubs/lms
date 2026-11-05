/** slice-4.3: per-attempt backup of answers and review flags; the server stays authoritative (ADR 0002). */
export interface LocalDraft {
  answers: Record<string, string>
  flagged: string[]
  /** Last server revision acknowledged when the draft was written. */
  revision: number
}

function draftKey(examId: string, startedAt: string): string {
  return `lms.examDraft:${examId}:${startedAt}`
}

export function readDraft(examId: string, startedAt: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(examId, startedAt))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<LocalDraft>
    const answers: Record<string, string> = {}
    if (value.answers && typeof value.answers === 'object') {
      for (const [id, answer] of Object.entries(value.answers)) {
        if (typeof answer === 'string') answers[id] = answer
      }
    }
    const flagged = Array.isArray(value.flagged) ? value.flagged.filter((id) => typeof id === 'string') : []
    const revision = typeof value.revision === 'number' ? value.revision : 0
    return { answers, flagged, revision }
  } catch {
    return null
  }
}

export function writeDraft(examId: string, startedAt: string, draft: LocalDraft): void {
  try {
    window.localStorage.setItem(draftKey(examId, startedAt), JSON.stringify(draft))
  } catch {
    // Storage full or disabled: the server checkpoint still works.
  }
}

export function clearDraft(examId: string, startedAt: string): void {
  try {
    window.localStorage.removeItem(draftKey(examId, startedAt))
  } catch {
    // Storage disabled: nothing was stored.
  }
}

export function sameAnswers(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) if ((a[key] ?? '') !== (b[key] ?? '')) return false
  return true
}
