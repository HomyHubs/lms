import {
  EXAM_SET_MAX_ITEMS,
  IMPORT_COLUMNS,
  QuestionDifficulty,
  QuestionType,
  type ExamSetImportIssue,
  type ExamSetImportItem,
  type LevelCode,
  type QuestionSkill,
} from '@lms/shared'
import { checkImportItem, issue } from './import-item.js'
import { attr, decodeXml, ImportFileError, xmlPart } from './import-zip.js'

/**
 * Excel (.xlsx, first sheet only) / CSV parser for exam-set import (slice-11b). Header = IMPORT_COLUMNS
 * (slice-3) + optional `order`; blank `level`/`skill`/`difficulty` cells take the form defaults.
 * Errors carry the real spreadsheet row number.
 */

export interface SheetRow {
  row: number
  cells: string[]
}

export interface ParsedImport {
  items: ExamSetImportItem[]
  errors: ExamSetImportIssue[]
  warnings: string[]
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? ''
  let index = 0
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64)
  return index - 1
}

function runText(xml: string): string {
  const withoutPhonetic = xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '')
  let text = ''
  for (const m of withoutPhonetic.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)) text += decodeXml(m[1]!)
  return text
}

function sheetPath(entries: Map<string, Buffer>): { path: string; sheetCount: number } {
  const workbook = xmlPart(entries, 'xl/workbook.xml')
  if (!workbook) throw new ImportFileError('File .xlsx khong hop le (thieu workbook)')
  const sheets = [...workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*?)\/?>/g)]
  const rid = sheets[0] ? attr(sheets[0][1]!, 'r:id') : undefined
  if (!rid) throw new ImportFileError('File Excel khong co sheet nao')
  const rels = xmlPart(entries, 'xl/_rels/workbook.xml.rels') ?? ''
  for (const m of rels.matchAll(/<(?:\w+:)?Relationship\b([^>]*?)\/?>/g)) {
    if (attr(m[1]!, 'Id') !== rid) continue
    const target = (attr(m[1]!, 'Target') ?? '').replace(/^\.\//, '')
    return { path: target.startsWith('/') ? target.slice(1) : `xl/${target}`, sheetCount: sheets.length }
  }
  throw new ImportFileError('File Excel khong tim thay sheet dau tien')
}

/** Rows of the first worksheet; formula cells are refused (values only). */
export function readXlsxRows(entries: Map<string, Buffer>): { rows: SheetRow[]; warnings: string[] } {
  const { path, sheetCount } = sheetPath(entries)
  const sheet = xmlPart(entries, path)
  if (!sheet) throw new ImportFileError('File Excel thieu noi dung sheet')
  const sharedXml = xmlPart(entries, 'xl/sharedStrings.xml') ?? ''
  const shared = [...sharedXml.matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => runText(m[1]!))
  const rows: SheetRow[] = []
  let previous = 0
  for (const rowMatch of sheet.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const rowNumber = Number(attr(rowMatch[1]!, 'r')) || previous + 1
    previous = rowNumber
    const cells: string[] = []
    let next = 0
    for (const cell of (rowMatch[2] ?? '').matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const ref = attr(cell[1]!, 'r')
      const index = ref ? columnIndex(ref) : next
      next = index + 1
      const inner = cell[2] ?? ''
      if (/<(?:\w+:)?f[\s>/]/.test(inner)) {
        throw new ImportFileError(`O ${ref ?? `dong ${rowNumber}`} chua cong thuc; hay chuyen thanh gia tri`)
      }
      const type = attr(cell[1]!, 't')
      const raw = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner)?.[1]
      let value = ''
      if (type === 's') value = shared[Number(raw)] ?? ''
      else if (type === 'inlineStr') value = runText(inner)
      else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE'
      else if (raw !== undefined) value = decodeXml(raw)
      while (cells.length < index) cells.push('')
      cells[index] = value
    }
    rows.push({ row: rowNumber, cells })
  }
  return { rows, warnings: sheetCount > 1 ? ['File co nhieu sheet: chi doc sheet dau tien'] : [] }
}

/** RFC 4180 CSV (comma, or semicolon when the header has no comma); row = record number. */
export function readCsvRows(text: string): SheetRow[] {
  const source = text.replace(/^\uFEFF/, '')
  const firstLine = source.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = !firstLine.includes(',') && firstLine.includes(';') ? ';' : ','
  const rows: SheetRow[] = []
  let cells: string[] = []
  let cell = ''
  let quoted = false
  const endRecord = () => {
    cells.push(cell)
    rows.push({ row: rows.length + 1, cells })
    cells = []
    cell = ''
  }
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]!
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === delimiter) { cells.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1
      endRecord()
    } else cell += ch
  }
  if (quoted) throw new ImportFileError('CSV thieu dau ngoac kep dong')
  if (cell !== '' || cells.length > 0) endRecord()
  return rows
}

const OPTIONAL_COLUMNS = new Set<string>(['level', 'skill', 'difficulty', 'options', 'points', 'explanation', 'source_reference', 'order'])
const ALLOWED_COLUMNS = new Set<string>([...IMPORT_COLUMNS, 'order'])
const REQUIRED_COLUMNS = IMPORT_COLUMNS.filter((c) => !OPTIONAL_COLUMNS.has(c))

const isBlank = (row: SheetRow) => row.cells.every((c) => c.trim() === '')

export function parseSheet(rows: SheetRow[], level: LevelCode, skill: QuestionSkill): ParsedImport {
  const errors: ExamSetImportIssue[] = []
  const filled = rows.filter((r) => !isBlank(r))
  const header = filled[0]
  if (!header) return { items: [], errors: [issue({}, 'file', 'File khong co du lieu')], warnings: [] }
  const headers = header.cells.map((c) => c.trim().toLowerCase())
  while (headers.length > 0 && headers.at(-1) === '') headers.pop()
  const at = { row: header.row }
  if (new Set(headers).size !== headers.length) errors.push(issue(at, 'header', 'Ten cot bi trung'))
  for (const h of headers) if (!ALLOWED_COLUMNS.has(h)) errors.push(issue(at, 'header', `Cot khong ho tro: "${h}"`))
  for (const c of REQUIRED_COLUMNS) if (!headers.includes(c)) errors.push(issue(at, 'header', `Thieu cot bat buoc: ${c}`))
  if (errors.length > 0) return { items: [], errors, warnings: [] }

  const data = filled.slice(1)
  if (data.length > EXAM_SET_MAX_ITEMS) {
    return { items: [], errors: [issue({}, 'file', `Toi da ${EXAM_SET_MAX_ITEMS} cau trong mot bo de`)], warnings: [] }
  }
  const ordered: { order: number; seq: number; item: ExamSetImportItem }[] = []
  const usedOrders = new Map<number, number>()
  data.forEach((sheetRow, seq) => {
    const where = { row: sheetRow.row }
    if (sheetRow.cells.slice(headers.length).some((c) => c.trim() !== '')) {
      errors.push(issue(where, 'columns', 'Co du lieu nam ngoai cac cot tieu de'))
      return
    }
    const cell = (name: string) => (sheetRow.cells[headers.indexOf(name)] ?? '').trim()
    const rowLevel = cell('level').toLowerCase() || level
    const rowSkill = cell('skill').toLowerCase() || skill
    if (rowLevel !== level) { errors.push(issue(where, 'level', `Cap do "${rowLevel}" khac cap do cua bo de (${level})`)); return }
    if (rowSkill !== skill) { errors.push(issue(where, 'skill', `Ky nang "${rowSkill}" khac ky nang cua bo de (${skill})`)); return }
    const type = QuestionType.safeParse(cell('question_type'))
    if (!type.success) { errors.push(issue(where, 'question_type', `Loai cau khong hop le: "${cell('question_type')}"`)); return }
    const difficulty = QuestionDifficulty.safeParse(cell('difficulty') || 'medium')
    if (!difficulty.success) { errors.push(issue(where, 'difficulty', `Do kho khong hop le: "${cell('difficulty')}"`)); return }
    const pointsCell = cell('points')
    if (pointsCell !== '' && !/^\d+$/.test(pointsCell)) { errors.push(issue(where, 'points', 'Diem phai la so nguyen')); return }
    const orderCell = cell('order')
    let order = Number.POSITIVE_INFINITY
    if (orderCell !== '') {
      if (!/^\d+$/.test(orderCell) || Number(orderCell) < 1) { errors.push(issue(where, 'order', 'Thu tu phai la so nguyen duong')); return }
      order = Number(orderCell)
      const clash = usedOrders.get(order)
      if (clash !== undefined) { errors.push(issue(where, 'order', `Thu tu ${order} trung voi dong ${clash}`)); return }
      usedOrders.set(order, sheetRow.row)
    }
    const options = cell('options').split('|').map((o) => o.trim()).filter((o) => o !== '')
    const draft = {
      questionType: type.data,
      difficulty: difficulty.data,
      questionText: cell('question_text'),
      options: options.length > 0 ? options : null,
      correctAnswer: cell('correct_answer'),
      points: pointsCell === '' ? undefined : Number(pointsCell),
      explanation: cell('explanation') || null,
    }
    const checked = checkImportItem(draft, level, skill)
    if (!checked.ok) { errors.push(issue(where, checked.field, checked.message)); return }
    ordered.push({
      order,
      seq,
      item: {
        order: 0,
        questionType: checked.row.question_type,
        difficulty: checked.row.difficulty,
        questionText: checked.row.question_text,
        options: checked.row.options ?? null,
        correctAnswer: checked.row.correct_answer,
        points: checked.row.points ?? 1,
        explanation: checked.row.explanation ?? null,
        warnings: [],
        imageRefs: [],
        mediaIds: [],
      },
    })
  })
  ordered.sort((a, b) => a.order - b.order || a.seq - b.seq)
  const items = ordered.map((entry, index) => ({ ...entry.item, order: index + 1 }))
  if (items.length === 0 && errors.length === 0) errors.push(issue({}, 'file', 'File khong co cau hoi nao'))
  return { items, errors, warnings: [] }
}
