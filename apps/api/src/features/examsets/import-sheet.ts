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
import { googleImageUrl } from './import-image-url.js'
import { checkImportItem, issue, type ItemCheck } from './import-item.js'
import { attr, decodeXml, ImportFileError, xmlPart } from './import-zip.js'

/**
 * Excel (.xlsx, first sheet only) / CSV parser for exam-set import (slice-11b). Header = IMPORT_COLUMNS
 * (slice-3) + optional `order`; blank `level`/`skill`/`difficulty` cells take the form defaults.
 * A header with "Cau hoi" switches to the teacher-friendly multiple-choice layout (slice-11c, parseFriendly).
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
  const names = headers.map(plainText)
  if (names.includes('cau hoi')) return parseFriendly(filled, names, level, skill)
  const at = { row: header.row }
  if (new Set(headers).size !== headers.length) errors.push(issue(at, 'header', 'Ten cot bi trung'))
  for (const h of headers) if (!ALLOWED_COLUMNS.has(h)) errors.push(issue(at, 'header', `Cot khong ho tro: "${h}"`))
  for (const c of REQUIRED_COLUMNS) if (!headers.includes(c)) errors.push(issue(at, 'header', `Thieu cot bat buoc: ${c}`))
  if (errors.length > 0) return { items: [], errors, warnings: [] }

  const data = filled.slice(1)
  if (data.length > EXAM_SET_MAX_ITEMS) {
    return { items: [], errors: [issue({}, 'file', `Toi da ${EXAM_SET_MAX_ITEMS} cau trong mot bo de`)], warnings: [] }
  }
  const ordered: Ordered[] = []
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
    const order = rowOrder(cell('order'), where, usedOrders)
    if (typeof order !== 'number') { errors.push(order); return }
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
    ordered.push({ order, seq, item: toItem(checked.row, []) })
  })
  return finish(ordered, errors)
}

type Ordered = { order: number; seq: number; item: ExamSetImportItem }

function rowOrder(value: string, where: { row: number }, used: Map<number, number>): number | ExamSetImportIssue {
  if (value === '') return Number.POSITIVE_INFINITY
  if (!/^\d+$/.test(value) || Number(value) < 1) return issue(where, 'order', 'Thu tu phai la so nguyen duong')
  const order = Number(value)
  const clash = used.get(order)
  if (clash !== undefined) return issue(where, 'order', `Thu tu ${order} trung voi dong ${clash}`)
  used.set(order, where.row)
  return order
}

function toItem(row: Extract<ItemCheck, { ok: true }>['row'], imageRefs: string[]): ExamSetImportItem {
  return {
    order: 0,
    questionType: row.question_type,
    difficulty: row.difficulty,
    questionText: row.question_text,
    options: row.options ?? null,
    correctAnswer: row.correct_answer,
    points: row.points ?? 1,
    explanation: row.explanation ?? null,
    warnings: [],
    imageRefs,
    mediaIds: [],
  }
}

function finish(ordered: Ordered[], errors: ExamSetImportIssue[]): ParsedImport {
  ordered.sort((a, b) => a.order - b.order || a.seq - b.seq)
  const items = ordered.map((entry, index) => ({ ...entry.item, order: index + 1 }))
  if (items.length === 0 && errors.length === 0) errors.push(issue({}, 'file', 'File khong co cau hoi nao'))
  return { items, errors, warnings: [] }
}

/** Lowercase, no Vietnamese accents, no "(...)" notes: "Hinh (link Google)" -> "hinh". */
function plainText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const FRIENDLY_COLUMNS = new Map<string, string>([
  ['stt', 'order'], ['thu tu', 'order'],
  ['hinh', 'image'], ['hinh anh', 'image'], ['link hinh', 'image'], ['anh', 'image'],
  ['cau hoi', 'question'], ['dap an', 'answer'], ['dap an dung', 'answer'],
  ['diem', 'points'], ['giai thich', 'explanation'], ['do kho', 'difficulty'],
  ['a', 'a'], ['b', 'b'], ['c', 'c'], ['d', 'd'], ['e', 'e'], ['f', 'f'],
])
const FRIENDLY_REQUIRED: [key: string, label: string][] = [['question', 'Cau hoi'], ['a', 'A'], ['b', 'B'], ['answer', 'Dap an']]
const OPTION_KEYS = ['a', 'b', 'c', 'd', 'e', 'f']
const DIFFICULTY_WORDS = new Map([['de', 'easy'], ['trung binh', 'medium'], ['kho', 'hard']])

/**
 * Teacher-friendly multiple-choice sheet (slice-11c): STT | Hinh | Cau hoi | A..F | Dap an | Diem | Giai thich |
 * Do kho. Options Dung/Sai (or True/False) make a true_false item, a letter answer maps to its option, and the
 * "Hinh" cell holds Google image links (space, new line or | separated) that the service downloads.
 */
function parseFriendly(filled: SheetRow[], names: string[], level: LevelCode, skill: QuestionSkill): ParsedImport {
  const header = filled[0]!
  const at = { row: header.row }
  const errors: ExamSetImportIssue[] = []
  const keys = names.map((name, i) => {
    const key = FRIENDLY_COLUMNS.get(name)
    if (!key) errors.push(issue(at, 'header', `Cot khong ho tro: "${(header.cells[i] ?? '').trim()}"`))
    return key ?? ''
  })
  const known = keys.filter((k) => k !== '')
  if (new Set(known).size !== known.length) errors.push(issue(at, 'header', 'Ten cot bi trung'))
  for (const [key, label] of FRIENDLY_REQUIRED) if (!keys.includes(key)) errors.push(issue(at, 'header', `Thieu cot bat buoc: ${label}`))
  if (errors.length > 0) return { items: [], errors, warnings: [] }

  const data = filled.slice(1)
  if (data.length > EXAM_SET_MAX_ITEMS) {
    return { items: [], errors: [issue({}, 'file', `Toi da ${EXAM_SET_MAX_ITEMS} cau trong mot bo de`)], warnings: [] }
  }
  const ordered: Ordered[] = []
  const usedOrders = new Map<number, number>()
  data.forEach((sheetRow, seq) => {
    const where = { row: sheetRow.row }
    if (sheetRow.cells.slice(keys.length).some((c) => c.trim() !== '')) {
      errors.push(issue(where, 'columns', 'Co du lieu nam ngoai cac cot tieu de'))
      return
    }
    const cell = (key: string) => {
      const index = keys.indexOf(key)
      return index < 0 ? '' : (sheetRow.cells[index] ?? '').trim()
    }
    const order = rowOrder(cell('order'), where, usedOrders)
    if (typeof order !== 'number') { errors.push(order); return }
    const options = OPTION_KEYS.map(cell)
    while (options.length > 0 && options.at(-1) === '') options.pop()
    if (options.includes('')) { errors.push(issue(where, 'options', 'Lua chon bi bo trong o giua (A, B, C...)')); return }
    const plainOptions = options.map(plainText).join('|')
    const trueFalse = plainOptions === 'dung|sai' || plainOptions === 'true|false'
    const answer = cell('answer')
    const letter = /^[a-f]$/i.test(answer) ? OPTION_KEYS.indexOf(answer.toLowerCase()) : -1
    const difficultyCell = cell('difficulty')
    const difficulty = QuestionDifficulty.safeParse(DIFFICULTY_WORDS.get(plainText(difficultyCell)) ?? (difficultyCell.toLowerCase() || 'medium'))
    if (!difficulty.success) { errors.push(issue(where, 'difficulty', `Do kho khong hop le: "${difficultyCell}" (de / trung binh / kho)`)); return }
    const pointsCell = cell('points')
    if (pointsCell !== '' && !/^\d+$/.test(pointsCell)) { errors.push(issue(where, 'points', 'Diem phai la so nguyen')); return }
    const links = cell('image').split(/[\s|]+/).filter((l) => l !== '')
    const badLink = links.find((l) => googleImageUrl(l) === null)
    if (badLink !== undefined) {
      errors.push(issue(where, 'image', `Link hinh phai la link Google Drive (https), nhan duoc: "${badLink}"`))
      return
    }
    const checked = checkImportItem({
      questionType: trueFalse ? 'true_false' : 'multiple_choice',
      difficulty: difficulty.data,
      questionText: cell('question'),
      options,
      correctAnswer: letter >= 0 && letter < options.length ? options[letter]! : answer,
      points: pointsCell === '' ? undefined : Number(pointsCell),
      explanation: cell('explanation') || null,
    }, level, skill)
    if (!checked.ok) { errors.push(issue(where, checked.field, checked.message)); return }
    ordered.push({ order, seq, item: toItem(checked.row, links) })
  })
  return finish(ordered, errors)
}
