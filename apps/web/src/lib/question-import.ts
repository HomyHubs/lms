import { IMPORT_COLUMNS } from '@lms/shared'
import { strFromU8, unzipSync } from 'fflate'

export interface ImportIssue {
  row: number
  field: string
  message: string
}
export class ImportFileError extends Error {
  constructor(public readonly errors: ImportIssue[]) {
    super(errors.map((issue) => `Dòng ${issue.row} / ${issue.field}: ${issue.message}`).join('\n'))
    this.name = 'ImportFileError'
  }
}
export function importFailure(row: number, field: string, message: string): never {
  throw new ImportFileError([{ row, field, message }])
}

/** No duplicate overwrite, unknown columns, or silently discarded extra cells. */
export function questionRowsToRecords(rows: string[][]): Record<string, string>[] {
  const headers = rows[0]?.map((cell) => cell.trim()) ?? []
  if (headers.length === 0) return []
  if (new Set(headers).size !== headers.length) importFailure(1, 'header', 'Tên cột trùng')
  if (
    headers.length !== IMPORT_COLUMNS.length ||
    headers.some((h) => !IMPORT_COLUMNS.includes(h as (typeof IMPORT_COLUMNS)[number]))
  ) {
    importFailure(1, 'header', `Cần đúng các cột: ${IMPORT_COLUMNS.join(', ')}`)
  }
  if (rows.length > 1001) importFailure(1, 'file', 'Tối đa 1000 câu hỏi')
  return rows.slice(1).map((cells, index) => {
    if (cells.length !== headers.length)
      importFailure(index + 2, 'columns', 'Số ô không khớp header')
    return Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? '']))
  })
}

const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_EXPANDED_BYTES = 16 * 1024 * 1024

/** XLSX-only, no macros/formulas/external links; ZIP limits before XML parsing. */
export async function parseQuestionsXlsx(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  if (buffer.byteLength > MAX_FILE_BYTES) importFailure(1, 'file', 'File vượt quá 2 MiB')
  let total = 0
  let count = 0
  const entries = unzipSync(new Uint8Array(buffer), {
    filter: (entry) => {
      total += entry.originalSize
      if (++count > 128 || total > MAX_EXPANDED_BYTES || entry.originalSize > MAX_EXPANDED_BYTES) {
        importFailure(1, 'file', 'XLSX giải nén vượt giới hạn')
      }
      if (/vbaProject|externalLinks/i.test(entry.name))
        importFailure(1, 'file', 'Không hỗ trợ macro/liên kết ngoài')
      return true
    },
  })
  if (!entries['xl/workbook.xml']) importFailure(1, 'file', 'Không phải XLSX hợp lệ')
  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.endsWith('.xml')) continue
    const xml = strFromU8(bytes)
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) importFailure(1, 'file', 'XML không an toàn')
    if (name.startsWith('xl/worksheets/') && /<(?:\w+:)?f(?:\s|>)/.test(xml)) {
      importFailure(1, 'file', 'Không hỗ trợ ô công thức; chuyển thành giá trị')
    }
  }
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const sheets = await readXlsxFile(buffer)
  if (sheets.length !== 1) importFailure(1, 'file', 'Chỉ hỗ trợ một worksheet')
  const rows = sheets[0]!.data.map((row, index) =>
    row.map((cell) => {
      if (cell instanceof Date || typeof cell === 'boolean')
        importFailure(index + 1, 'cell', 'Ô phải là văn bản hoặc số')
      return cell === null ? '' : String(cell)
    }),
  )
  // Reader pads every row to the sheet width. Empty padding is not a named header;
  // retain data width so a value under an unnamed extra column is rejected at its row.
  const header = rows[0]
  while (header?.length && header.at(-1) === '') header.pop()
  const width = header?.length ?? 0
  for (const row of rows.slice(1)) while (row.length < width) row.push('')
  return questionRowsToRecords(rows)
}

export function checkImportFile(file: Pick<File, 'name' | 'size'>): 'csv' | 'xlsx' {
  if (file.size > MAX_FILE_BYTES) importFailure(1, 'file', 'File vượt quá 2 MiB')
  if (/\.csv$/i.test(file.name)) return 'csv'
  if (/\.xlsx$/i.test(file.name)) return 'xlsx'
  return importFailure(1, 'file', 'Chỉ hỗ trợ CSV hoặc XLSX')
}
