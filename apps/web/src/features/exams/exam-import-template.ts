import { IMPORT_COLUMNS } from '@lms/shared'
import { XLSX_MIME, buildXlsx, downloadFile } from '@/lib/xlsx-export'

/**
 * slice-20 (4.5): Mẫu Excel import câu hỏi/đề.
 * Header khớp đúng `IMPORT_COLUMNS` của Question Import Schema (@lms/shared) để file tải về
 * có thể import ngược mà không bị lỗi "Cần đúng các cột". Kèm 1 dòng ví dụ minh hoạ định dạng.
 * Dựng hoàn toàn phía client (ADR 0006) — không cần endpoint.
 */

/** Một dòng ví dụ (options ngăn bằng `|`, đáp án đúng khớp một trong các lựa chọn). */
const SAMPLE_ROW: Record<(typeof IMPORT_COLUMNS)[number], string> = {
  level: 'starter',
  skill: 'reading',
  question_type: 'multiple_choice',
  difficulty: 'easy',
  question_text: 'What color is the sky?',
  options: 'Blue|Green|Red',
  correct_answer: 'Blue',
  points: '1',
  explanation: 'Bầu trời ban ngày có màu xanh.',
  source_reference: 'Demo',
}

/** Workbook mẫu: hàng 1 là header, hàng 2 là ví dụ. */
export function buildExamImportTemplate(): Uint8Array {
  const header = [...IMPORT_COLUMNS]
  const example = IMPORT_COLUMNS.map((column) => SAMPLE_ROW[column])
  return buildXlsx([{ name: 'questions', rows: [header, example] }])
}

export const EXAM_IMPORT_TEMPLATE_FILENAME = 'mau-import-de.xlsx'

/** Tải mẫu Excel về máy (dùng cho nút "Tải mẫu Excel"). */
export function downloadExamImportTemplate(): void {
  downloadFile(buildExamImportTemplate(), EXAM_IMPORT_TEMPLATE_FILENAME, XLSX_MIME)
}
