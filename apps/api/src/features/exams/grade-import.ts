import {
  GRADE_IMPORT_FEEDBACK_HEADERS,
  GRADE_IMPORT_SCORE_HEADERS,
  GRADE_IMPORT_STUDENT_HEADERS,
  type GradeImportError,
} from '@lms/shared'
import {
  readCsvRows,
  readXlsxRows,
  type SheetRow,
} from '../examsets/import-sheet.js'
import { ImportFileError, isOle2, isPdf, isZip, readZip } from '../examsets/import-zip.js'
import type { GradeImportInputRow } from './service.js'

/**
 * Parser bang diem Speaking/Writing (slice-9a revised): doc Excel (.xlsx) hoac CSV.
 * Tai su dung parser cua exam-set import (khong them thu vien ngoai).
 * Header toi thieu: cot MA HOC VIEN + cot DIEM; cot NHAN XET tuy chon.
 */

export interface ParsedGradeImport {
  rows: GradeImportInputRow[]
  errors: GradeImportError[]
}

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/^\uFEFF/, '')
}

function matchColumn(header: string[], candidates: readonly string[]): number {
  const norm = header.map(normalizeHeader)
  for (const c of candidates) {
    const idx = norm.indexOf(c.toLowerCase())
    if (idx >= 0) return idx
  }
  return -1
}

/** Doc cac dong tho tu file (xlsx hoac csv), tra ve mang SheetRow. */
function readRows(fileName: string, buf: Buffer): SheetRow[] {
  const ext = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase()
  if (isOle2(buf) || isPdf(buf) || ext === 'xls' || ext === 'pdf' || ext === 'doc') {
    throw new ImportFileError('Hay luu lai file dang .xlsx (Excel) hoac .csv roi tai len')
  }
  if (ext === 'xlsx') {
    if (!isZip(buf)) throw new ImportFileError('Noi dung file khong phai .xlsx that')
    const entries = readZip(buf, (name) => name.startsWith('xl/') || name === '[Content_Types].xml')
    if (!entries.has('xl/workbook.xml')) throw new ImportFileError('Noi dung file khong phai .xlsx that')
    return readXlsxRows(entries).rows
  }
  if (ext === 'csv') {
    if (isZip(buf) || buf.includes(0)) throw new ImportFileError('Noi dung file khong phai CSV van ban')
    return readCsvRows(buf.toString('utf8'))
  }
  throw new ImportFileError('Chi ho tro file .xlsx hoac .csv')
}

/**
 * Parse bang diem. Loi dinh dang (thieu cot, diem khong hop le) di vao `errors` kem so dong that.
 * Dong trong bi bo qua. Khong nem loi tru khi file khong hop le (format).
 */
export function parseGradeImport(fileName: string, buf: Buffer): ParsedGradeImport {
  const sheet = readRows(fileName, buf)
  const errors: GradeImportError[] = []
  const rows: GradeImportInputRow[] = []
  if (sheet.length === 0) throw new ImportFileError('File rong')

  const headerRow = sheet[0]!
  const studentCol = matchColumn(headerRow.cells, GRADE_IMPORT_STUDENT_HEADERS)
  const scoreCol = matchColumn(headerRow.cells, GRADE_IMPORT_SCORE_HEADERS)
  const feedbackCol = matchColumn(headerRow.cells, GRADE_IMPORT_FEEDBACK_HEADERS)
  if (studentCol < 0 || scoreCol < 0) {
    throw new ImportFileError('File thieu cot bat buoc: can cot ma hoc vien va cot diem')
  }

  for (const line of sheet.slice(1)) {
    const code = (line.cells[studentCol] ?? '').trim()
    const scoreRaw = (line.cells[scoreCol] ?? '').trim()
    if (code === '' && scoreRaw === '') continue // bo qua dong trong
    if (code === '') {
      errors.push({ row: line.row, message: 'Thieu ma hoc vien' })
      continue
    }
    if (scoreRaw === '') {
      errors.push({ row: line.row, message: `Thieu diem cho ma hoc vien ${code}` })
      continue
    }
    const score = Number(scoreRaw.replace(',', '.'))
    if (!Number.isFinite(score) || score < 0) {
      errors.push({ row: line.row, message: `Diem khong hop le: "${scoreRaw}"` })
      continue
    }
    const feedbackRaw = feedbackCol >= 0 ? (line.cells[feedbackCol] ?? '').trim() : ''
    rows.push({
      row: line.row,
      studentCode: code,
      score,
      feedback: feedbackRaw === '' ? null : feedbackRaw.slice(0, 2000),
    })
  }

  return { rows, errors }
}
