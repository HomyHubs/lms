import {
  EXAM_IMPORT_MAX_BYTES,
  type CommitExamSetImportRequest,
  type ExamImportFormat,
  type ExamSetDetail,
  type ExamSetImportIssue,
  type ExamSetImportPreview,
  type ExamSetImportPreviewQuery,
} from '@lms/shared'
import type { CreateQuestionFields } from '../questions/index.js'
import { parseDocx, readDocxLines } from './import-docx.js'
import { checkImportItem, issue } from './import-item.js'
import { parseSheet, readCsvRows, readXlsxRows, type ParsedImport } from './import-sheet.js'
import { ImportFileError, isOle2, isPdf, isZip, readZip } from './import-zip.js'
import { getExamSet, type ExamSetsStore } from './service.js'

/**
 * Import bo de 2 buoc (slice-11b). `previewImport` chi doc file (KHONG ghi DB); `commitImport` validate
 * lai tung cau roi tao bo de draft + cau hoi (source exam_set) + thu tu trong 1 transaction.
 */

const SAVE_AS_DOCX = 'Hay luu lai file dang .docx (Word) hoac .xlsx/.csv (Excel) roi tai len'

function detectFormat(fileName: string, buf: Buffer): ExamImportFormat {
  const ext = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase() ?? ''
  if (isOle2(buf) || isPdf(buf) || ext === 'doc' || ext === 'xls' || ext === 'pdf') throw new ImportFileError(SAVE_AS_DOCX)
  if (ext === 'docx' || ext === 'xlsx') {
    if (!isZip(buf)) throw new ImportFileError(`Noi dung file khong phai .${ext} that`)
    return ext
  }
  if (ext === 'csv') {
    if (isZip(buf) || buf.includes(0)) throw new ImportFileError('Noi dung file khong phai CSV van ban')
    return 'csv'
  }
  throw new ImportFileError('Chi ho tro file .docx, .xlsx hoac .csv')
}

function parseFile(format: ExamImportFormat, buf: Buffer, query: ExamSetImportPreviewQuery): ParsedImport {
  if (format === 'csv') {
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      throw new ImportFileError('CSV phai duoc ma hoa UTF-8')
    }
    return parseSheet(readCsvRows(text), query.level, query.skill)
  }
  if (format === 'xlsx') {
    const entries = readZip(buf, (name) => name.endsWith('.xml') || name.endsWith('.rels'))
    if ([...entries.keys()].some((name) => /vbaProject|externalLink/i.test(name))) {
      throw new ImportFileError('Khong ho tro file co macro hoac lien ket ngoai')
    }
    if (!entries.has('xl/workbook.xml')) throw new ImportFileError('Noi dung file khong phai .xlsx that')
    const { rows, warnings } = readXlsxRows(entries)
    const parsed = parseSheet(rows, query.level, query.skill)
    return { ...parsed, warnings: [...warnings, ...parsed.warnings] }
  }
  const entries = readZip(buf, (name) => name === 'word/document.xml' || name === '[Content_Types].xml')
  if (!entries.has('word/document.xml')) throw new ImportFileError('Noi dung file khong phai .docx that')
  return parseDocx(readDocxLines(entries), query.level, query.skill)
}

export type PreviewOutcome = { ok: true; preview: ExamSetImportPreview } | { ok: false; message: string }

export function previewImport(buf: Buffer, query: ExamSetImportPreviewQuery): PreviewOutcome {
  if (buf.length === 0) return { ok: false, message: 'File rong' }
  if (buf.length > EXAM_IMPORT_MAX_BYTES) return { ok: false, message: 'File vuot qua 10 MB' }
  try {
    const format = detectFormat(query.fileName, buf)
    const parsed = parseFile(format, buf, query)
    return {
      ok: true,
      preview: { title: query.title, level: query.level, skill: query.skill, format, ...parsed },
    }
  } catch (err) {
    if (err instanceof ImportFileError) return { ok: false, message: err.message }
    throw err
  }
}

export type CommitOutcome =
  | { ok: true; examSet: ExamSetDetail }
  | { ok: false; reason: 'level_not_found' }
  | { ok: false; reason: 'invalid_import'; errors: ExamSetImportIssue[] }

/** All-or-nothing: one invalid item rejects the whole import and nothing is written. */
export async function commitImport(
  store: ExamSetsStore, input: CommitExamSetImportRequest, createdBy: string,
): Promise<CommitOutcome> {
  const level = await store.findLevelByCode(input.level)
  if (!level) return { ok: false, reason: 'level_not_found' }
  const errors: ExamSetImportIssue[] = []
  const questions: CreateQuestionFields[] = []
  input.items.forEach((item, index) => {
    const checked = checkImportItem(item, input.level, input.skill)
    if (!checked.ok) {
      errors.push(issue({ block: index + 1 }, checked.field, `Cau ${index + 1}: ${checked.message}`))
      return
    }
    const row = checked.row
    questions.push({
      levelId: level.id,
      skill: input.skill,
      questionType: row.question_type,
      difficulty: row.difficulty,
      questionText: row.question_text,
      options: row.options ?? null,
      correctAnswer: row.correct_answer,
      points: row.points,
      explanation: row.explanation ?? null,
      sourceReference: null,
      source: 'exam_set',
    })
  })
  if (errors.length > 0) return { ok: false, reason: 'invalid_import', errors }
  const row = await store.importSet(
    { title: input.title, levelId: level.id, skill: input.skill, description: null, createdBy },
    questions,
  )
  const detail = await getExamSet(store, row.id)
  if (!detail.ok) throw new Error(`Imported exam set ${row.id} vanished`)
  return { ok: true, examSet: detail.examSet }
}
