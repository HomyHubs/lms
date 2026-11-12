/** Generates binary XLSX fixtures at setup time (avoids committing binaries). */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildXlsx } from './make-xlsx'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const GENERATED_DIR = path.join(HERE, '..', 'fixtures', 'generated')

const HEADER = [
  'level',
  'skill',
  'question_type',
  'difficulty',
  'question_text',
  'options',
  'correct_answer',
  'points',
  'explanation',
  'source_reference',
]

export function writeXlsxFixtures(): void {
  mkdirSync(GENERATED_DIR, { recursive: true })

  // Valid single-sheet XLSX with one data row.
  const validXlsx = buildXlsx([
    HEADER,
    ['flyer', 'writing', 'true_false', 'hard', 'E2E valid xlsx question', '', 'true', '3', 'Note', 'Workbook'],
  ])
  writeFileSync(path.join(GENERATED_DIR, 'questions-valid.xlsx'), validXlsx)

  // Rejected format: a plain-text file disguised with an .xls name. The app only
  // accepts .csv or .xlsx (checkImportFile), so .xls must be refused before parsing.
  writeFileSync(path.join(GENERATED_DIR, 'questions-legacy.xls'), 'not a real workbook', 'utf8')
}
