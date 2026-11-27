import type { WorkSessionDetail } from '@lms/shared'

/**
 * slice-25: helpers cho báo cáo ngày công & giờ dạy chi tiết (thuần, dễ test).
 * Dữ liệu đầu vào là `report.sessions` (WorkSessionDetail) — KHÔNG tính lại từ kế hoạch.
 */

/** Các buổi liên quan tới một giáo viên (theo lịch hoặc thực dạy), sắp theo ngày tăng dần. */
export function sessionsForTeacher(
  sessions: readonly WorkSessionDetail[],
  phoneNumber: string,
): WorkSessionDetail[] {
  return sessions
    .filter((s) => s.plannedTeacherPhone === phoneNumber || s.taughtByPhone === phoneNumber)
    .sort((a, b) => `${a.sessionDate} ${a.startsAt}`.localeCompare(`${b.sessionDate} ${b.startsAt}`))
}

export interface ClassTeachingHours {
  classId: string
  className: string
  /** Số buổi đã dạy (có điểm danh). */
  heldSessions: number
  /** Tổng phút thực dạy của lớp. */
  taughtMinutes: number
  /** Số buổi bị nghỉ (không tính công). */
  missedSessions: number
}

/** Tổng hợp giờ dạy theo lớp, sắp giảm dần theo số phút dạy. */
export function hoursByClass(sessions: readonly WorkSessionDetail[]): ClassTeachingHours[] {
  const byClass = new Map<string, ClassTeachingHours>()
  for (const s of sessions) {
    const entry =
      byClass.get(s.classId) ?? {
        classId: s.classId,
        className: s.className,
        heldSessions: 0,
        taughtMinutes: 0,
        missedSessions: 0,
      }
    if (s.status === 'held') {
      entry.heldSessions += 1
      entry.taughtMinutes += s.durationMinutes
    }
    if (s.status === 'missed') entry.missedSessions += 1
    byClass.set(s.classId, entry)
  }
  return [...byClass.values()].sort(
    (a, b) => b.taughtMinutes - a.taughtMinutes || a.className.localeCompare(b.className),
  )
}
