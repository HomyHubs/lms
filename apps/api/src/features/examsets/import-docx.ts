import {
  EXAM_SET_MAX_ITEMS,
  type ExamSetImportIssue,
  type ExamSetImportItem,
  type LevelCode,
  type QuestionSkill,
} from '@lms/shared'
import { normalizeAnswer } from '../exams/index.js'
import { checkImportItem, issue } from './import-item.js'
import type { ParsedImport } from './import-sheet.js'
import { attr, cleanText, decodeXml, ImportFileError, xmlPart } from './import-zip.js'

/**
 * Word (.docx) parser for exam-set import (slice-11b). `word/document.xml` is read directly; a state
 * machine splits blocks "Câu N:" / "A." options / "Đáp án:" / "Giải thích:" / "Điểm:".
 * Bold/underline is never used as the answer — the "Đáp án" line is mandatory.
 */

export interface DocLine {
  line: number
  text: string
  imageRefs: string[]
  inTable: boolean
  hasMath: boolean
}

/** Paragraph text (soft breaks split into lines) with embedded image ids, table and equation flags. */
export function readDocxLines(entries: Map<string, Buffer>): DocLine[] {
  const xml = xmlPart(entries, 'word/document.xml')
  if (!xml) throw new ImportFileError('File .docx khong hop le (thieu word/document.xml)')
  const lines: DocLine[] = []
  let tableDepth = 0
  let inText = false
  let text = ''
  let images: string[] = []
  let math = false
  const flush = () => {
    text.split('\n').forEach((part, i) => {
      lines.push({
        line: lines.length + 1,
        text: cleanText(part),
        imageRefs: i === 0 ? images : [],
        inTable: tableDepth > 0,
        hasMath: math,
      })
    })
    text = ''
    images = []
    math = false
  }
  for (const m of xml.matchAll(/<(\/?)([\w:.-]+)((?:\s[^>]*?)?)(\/?)>|([^<]+)/g)) {
    if (m[5] !== undefined) {
      if (inText) text += decodeXml(m[5])
      continue
    }
    const closing = m[1] === '/'
    const selfClosing = m[4] === '/'
    const name = m[2]!
    const attrs = m[3] ?? ''
    if (name === 'w:p') {
      if (closing) flush()
      else if (selfClosing) { text = ''; flush() }
    } else if (name === 'w:tbl') tableDepth += closing ? -1 : 1
    else if (name === 'w:t' || name === 'm:t') inText = !closing && !selfClosing
    else if (name === 'w:tab' && !closing) text += '\t'
    else if ((name === 'w:br' || name === 'w:cr') && !closing) text += '\n'
    else if (name === 'm:oMath' && !closing) math = true
    else if (name === 'a:blip' && !closing) {
      const id = attr(attrs, 'r:embed')
      if (id) images.push(id)
    } else if (name === 'v:imagedata' && !closing) {
      const id = attr(attrs, 'r:id')
      if (id) images.push(id)
    }
  }
  return lines
}

const QUESTION = /^(?:câu|cau|question)\s*(\d+)\s*[:.)]\s*(.*)$/iu
const OPTION = /^([a-z])\s*[.)]\s*(.+)$/iu
const ANSWER = /^(?:đáp án|dap an|answer)\s*:\s*(.*)$/iu
const EXPLANATION = /^(?:giải thích|giai thich|explanation)\s*:\s*(.*)$/iu
const POINTS = /^(?:điểm|diem|points?)\s*:\s*(.*)$/iu
const TRUE_WORDS = new Set(['đúng', 'dung', 'true'])
const FALSE_WORDS = new Set(['sai', 'false'])

interface Block {
  number: number
  line: number
  text: string[]
  options: { letter: string; text: string; line: number }[]
  answer?: { value: string; line: number }
  explanation?: string[]
  points?: { value: string; line: number }
  state: 'question' | 'options' | 'answer' | 'explanation'
  imageRefs: string[]
  math: boolean
  table: boolean
}

function toItem(block: Block, level: LevelCode, skill: QuestionSkill, errors: ExamSetImportIssue[]): ExamSetImportItem | null {
  const at = { block: block.number }
  const fail = (field: string, message: string) => {
    errors.push(issue(at, field, message))
    return null
  }
  const label = `Câu ${block.number}`
  if (block.text.join('').trim() === '') return fail('question_text', `${label}, dòng ${block.line}: thiếu nội dung câu hỏi`)
  const misplaced = block.options.find((o, i) => o.letter !== String.fromCharCode(97 + i))
  if (misplaced) return fail('options', `${label}, dòng ${misplaced.line}: lựa chọn phải theo thứ tự A, B, C…`)
  if (block.options.length < 2) return fail('options', `${label}, dòng ${block.line}: cần ít nhất 2 lựa chọn`)
  if (!block.answer) return fail('correct_answer', `${label}: thiếu dòng Đáp án`)
  const options = block.options.map((o) => o.text)
  const answerText = block.answer.value.trim()
  const letter = /^([a-z])\s*[.)]?$/iu.exec(answerText)?.[1]?.toLowerCase()
  const index = letter !== undefined
    ? letter.charCodeAt(0) - 97
    : options.findIndex((o) => normalizeAnswer(o) === normalizeAnswer(answerText))
  if (index < 0 || index >= options.length) {
    return fail('correct_answer', `${label}, dòng ${block.answer.line}: đáp án "${answerText}" không nằm trong các lựa chọn`)
  }
  let points: number | undefined
  if (block.points) {
    if (!/^\d+$/.test(block.points.value.trim())) return fail('points', `${label}, dòng ${block.points.line}: điểm phải là số nguyên`)
    points = Number(block.points.value.trim())
  }
  const words = options.map(normalizeAnswer)
  const trueFalse = options.length === 2 && words.some((w) => TRUE_WORDS.has(w)) && words.some((w) => FALSE_WORDS.has(w))
  const draft = {
    questionType: trueFalse ? ('true_false' as const) : ('multiple_choice' as const),
    difficulty: 'medium' as const,
    questionText: block.text.join('\n').trim(),
    options,
    correctAnswer: options[index]!,
    points,
    explanation: block.explanation?.join('\n').trim() || null,
  }
  const checked = checkImportItem(draft, level, skill)
  if (!checked.ok) return fail(checked.field, `${label}: ${checked.message}`)
  const warnings: string[] = []
  if (block.imageRefs.length > 0) warnings.push(`Có ${block.imageRefs.length} hình sẽ được gắn sau`)
  if (block.math) warnings.push('Công thức toán được giữ dạng chữ thô')
  if (block.table) warnings.push('Nội dung trong bảng được đọc như văn bản')
  return {
    order: 0,
    questionType: draft.questionType,
    difficulty: draft.difficulty,
    questionText: checked.row.question_text,
    options: checked.row.options ?? null,
    correctAnswer: checked.row.correct_answer,
    points: checked.row.points ?? 1,
    explanation: checked.row.explanation ?? null,
    warnings,
    imageRefs: block.imageRefs,
  }
}

export function parseDocx(lines: DocLine[], level: LevelCode, skill: QuestionSkill): ParsedImport {
  const errors: ExamSetImportIssue[] = []
  const blocks: Block[] = []
  let preamble = 0
  for (const line of lines) {
    const current = blocks.at(-1)
    const question = QUESTION.exec(line.text)
    if (question) {
      blocks.push({
        number: Number(question[1]), line: line.line, text: [question[2]!], options: [], state: 'question',
        imageRefs: [...line.imageRefs], math: line.hasMath, table: line.inTable,
      })
      continue
    }
    if (!current) {
      if (line.text !== '') preamble += 1
      continue
    }
    current.imageRefs.push(...line.imageRefs)
    current.math ||= line.hasMath
    current.table ||= line.inTable
    if (line.text === '') continue
    const option = OPTION.exec(line.text)
    const answer = ANSWER.exec(line.text)
    const explanation = EXPLANATION.exec(line.text)
    const points = POINTS.exec(line.text)
    if (answer) {
      if (current.answer) errors.push(issue({ block: current.number }, 'correct_answer', `Câu ${current.number}, dòng ${line.line}: có hơn một dòng Đáp án`))
      current.answer = { value: answer[1]!, line: line.line }
      current.state = 'answer'
    } else if (explanation) {
      current.explanation = [explanation[1]!]
      current.state = 'explanation'
    } else if (points) {
      current.points = { value: points[1]!, line: line.line }
    } else if (option && (current.state === 'question' || current.state === 'options')) {
      current.options.push({ letter: option[1]!.toLowerCase(), text: option[2]!.trim(), line: line.line })
      current.state = 'options'
    } else if (current.state === 'question') current.text.push(line.text)
    else if (current.state === 'options') {
      const last = current.options.at(-1)!
      last.text = `${last.text} ${line.text}`
    } else if (current.state === 'explanation') current.explanation!.push(line.text)
    else errors.push(issue({ block: current.number }, 'line', `Câu ${current.number}, dòng ${line.line}: không nhận diện được "${line.text.slice(0, 60)}"`))
  }
  if (blocks.length === 0) {
    return { items: [], errors: [issue({}, 'file', 'Không tìm thấy câu hỏi nào (mỗi câu bắt đầu bằng "Câu 1:")')], warnings: [] }
  }
  if (blocks.length > EXAM_SET_MAX_ITEMS) {
    return { items: [], errors: [issue({}, 'file', `Tối đa ${EXAM_SET_MAX_ITEMS} câu trong một bộ đề`)], warnings: [] }
  }
  const items = blocks
    .map((block) => toItem(block, level, skill, errors))
    .filter((item): item is ExamSetImportItem => item !== null)
    .map((item, index) => ({ ...item, order: index + 1 }))
  const warnings: string[] = []
  if (preamble > 0) warnings.push(`Bỏ qua ${preamble} dòng trước câu đầu tiên`)
  const images = blocks.reduce((sum, b) => sum + b.imageRefs.length, 0)
  // TODO(slice-12): attach embedded images (imageRefs) to the created questions.
  if (images > 0) warnings.push(`Có ${images} hình sẽ được gắn sau`)
  return { items, errors, warnings }
}
