import type { ClassificationPolicy, StudentClassification } from '@lms/shared'

/**
 * Công thức xếp loại học lực DÙNG CHUNG (ADR 0006) — tách khỏi `reports/service.ts`
 * để hồ sơ học viên (`students`) và báo cáo (`reports`) không bao giờ lệch nhau.
 *
 * Thứ tự ưu tiên khi đọc: ADR 0006 mục 2 là nguồn sự thật duy nhất.
 */

export const round1 = (n: number): number => Math.round(n * 10) / 10

/**
 * Điểm tổng có trọng số. Không có điểm thi -> không xếp loại được (null).
 * Không có buổi nào đếm được chuyên cần -> chỉ dùng điểm thi, để việc thiếu điểm danh
 * không trừng phạt học viên.
 */
export function finalScore(
  examScore: number | null,
  attendanceRate: number | null,
  policy: Pick<ClassificationPolicy, 'examWeight' | 'attendanceWeight'>,
): number | null {
  if (examScore === null) return null
  if (attendanceRate === null) return round1(examScore)
  return round1((examScore * policy.examWeight + attendanceRate * policy.attendanceWeight) / 100)
}

/** Xếp loại theo ngưỡng của policy cấp độ (Giỏi >= excellentMin >= Khá >= ... > Yếu). */
export function classify(
  score: number | null,
  policy: Pick<ClassificationPolicy, 'excellentMin' | 'goodMin' | 'averageMin'>,
): StudentClassification | null {
  if (score === null) return null
  if (score >= policy.excellentMin) return 'excellent'
  if (score >= policy.goodMin) return 'good'
  if (score >= policy.averageMin) return 'average'
  return 'weak'
}

/** Đậu (true) khi điểm tổng đạt ngưỡng passMin; Rớt (false) nếu dưới; null khi chưa có điểm. */
export function passed(
  score: number | null,
  policy: Pick<ClassificationPolicy, 'passMin'>,
): boolean | null {
  return score === null ? null : score >= policy.passMin
}
