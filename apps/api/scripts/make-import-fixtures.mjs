// slice-11b: generates the exam-import test fixtures (apps/api/test/fixtures) and the downloadable
// templates (apps/web/public/templates). Real OOXML packages written with node:zlib only.
// Usage (from apps/api): node scripts/make-import-fixtures.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateRawSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const fixtures = join(here, '..', 'test', 'fixtures')
const templates = join(here, '..', '..', 'web', 'public', 'templates')

function zip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8')
    const packed = deflateRawSync(data)
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(packed.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBuf, packed)
    centrals.push(central, nameBuf)
    offset += local.length + nameBuf.length + packed.length
  }
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBuf, end])
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

// ---- Word ----
const para = (text) => `<w:p><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
const imagePara = (rid) => `<w:p><w:r><w:drawing><wp:inline><wp:extent cx="952500" cy="952500"/><wp:docPr id="1" name="Picture 1"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="image1.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/></pic:blipFill><pic:spPr/></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
const mathPara = (before, formula) => `<w:p><w:r><w:t xml:space="preserve">${esc(before)}</w:t></w:r><m:oMath><m:r><m:t>${esc(formula)}</m:t></m:r></m:oMath></w:p>`
const table = (rows) => `<w:tbl>${rows.map((r) => `<w:tr><w:tc>${para(r)}</w:tc></w:tr>`).join('')}</w:tbl>`
// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

function docx(body, { image = false } = {}) {
  const files = {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/document.xml': `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${REL}" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr/></w:body></w:document>`,
  }
  if (image) {
    files['word/_rels/document.xml.rels'] = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Type="${REL}/image" Target="media/image1.png"/></Relationships>`
    files['word/media/image1.png'] = PNG
  }
  return zip(files)
}

const WORDS = ['cat', 'dog', 'bird', 'fish', 'lion', 'duck', 'frog', 'bear', 'goat', 'cow']

/** 20 sample questions: multiple choice, true/false, both label styles, explanation and points. */
function sampleQuestions(count = 20) {
  const out = [para('BỘ ĐỀ MẪU — READING STARTER')]
  for (let n = 1; n <= count; n += 1) {
    if (n % 5 === 0) {
      out.push(para(`Câu ${n}: A ${WORDS[n % 10]} is an animal.`), para('A. Đúng'), para('B. Sai'), para('Đáp án: A'))
      continue
    }
    const head = n % 3 === 0 ? `Question ${n}. Which word is "${WORDS[n % 10]}"?` : `Câu ${n}: Chọn từ đúng cho hình số ${n}.`
    const label = (l) => (n % 3 === 0 ? `${l.toLowerCase()})` : `${l}.`)
    out.push(para(head))
    ;['A', 'B', 'C', 'D'].forEach((l, i) => out.push(para(`${label(l)} ${WORDS[(n + i) % 10]}`)))
    out.push(para(n % 3 === 0 ? 'Answer: B' : 'Đáp án: B'))
    if (n % 4 === 0) out.push(para(`Giải thích: Đáp án là ${WORDS[(n + 1) % 10]}.`))
    if (n % 7 === 0) out.push(para('Điểm: 2'))
  }
  return out.join('')
}

function simpleBlocks(count, mutate) {
  const out = []
  for (let n = 1; n <= count; n += 1) {
    const lines = [`Câu ${n}: Question number ${n}?`, 'A. one', 'B. two', 'C. three', 'D. four', 'Đáp án: C']
    out.push(...(mutate(n, lines) ?? lines).map(para))
  }
  return out.join('')
}

// ---- Excel ----
const colName = (i) => String.fromCharCode(65 + i)
function xlsx(rows, { formulaAt } = {}) {
  const sheetRows = rows.map((cells, r) => `<row r="${r + 1}">${cells.map((v, c) => {
    const ref = `${colName(c)}${r + 1}`
    if (formulaAt === ref) return `<c r="${ref}"><f>1+1</f><v>2</v></c>`
    if (v === '' || v === null || v === undefined) return ''
    if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
  }).join('')}</row>`).join('')
  return zip({
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><sheets><sheet name="Questions" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  })
}

const HEADER = ['order', 'level', 'skill', 'question_type', 'difficulty', 'question_text', 'options', 'correct_answer', 'points', 'explanation', 'source_reference']
function sheetSample(count = 20) {
  const rows = [HEADER]
  for (let n = 1; n <= count; n += 1) {
    if (n % 5 === 0) rows.push([n, 'starter', 'reading', 'true_false', 'easy', `A ${WORDS[n % 10]} is an animal.`, 'True|False', 'True', 1, '', ''])
    else rows.push([n, n % 2 ? 'starter' : '', n % 2 ? 'reading' : '', 'multiple_choice', 'medium', `Choose the word for picture ${n}.`,
      [0, 1, 2, 3].map((i) => WORDS[(n + i) % 10]).join('|'), 'b', n % 7 === 0 ? 2 : '', n % 4 === 0 ? 'Look at the picture.' : '', ''])
  }
  return rows
}

// slice-11c: teacher-friendly multiple-choice template; "Hinh" takes Google Drive links (left blank here).
const FRIENDLY_HEADER = ['STT', 'Hình (link Google Drive)', 'Câu hỏi', 'A', 'B', 'C', 'D', 'Đáp án', 'Điểm', 'Giải thích']
function friendlySample(count = 10) {
  const rows = [FRIENDLY_HEADER]
  for (let n = 1; n <= count; n += 1) {
    if (n % 5 === 0) rows.push([n, '', `A ${WORDS[n % 10]} is an animal.`, 'Đúng', 'Sai', '', '', 'A', 1, ''])
    else rows.push([n, '', `Choose the word for picture ${n}.`, ...[0, 1, 2, 3].map((i) => WORDS[(n + i) % 10]), 'B',
      n % 7 === 0 ? 2 : 1, n % 4 === 0 ? 'Look at the picture.' : ''])
  }
  return rows
}

const csv = (rows) => '\uFEFF' + rows.map((r) => r.map((v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}).join(',')).join('\r\n') + '\r\n'

mkdirSync(fixtures, { recursive: true })
mkdirSync(templates, { recursive: true })
const write = (dir, name, data) => writeFileSync(join(dir, name), data)

write(fixtures, 'ok-20.docx', docx(sampleQuestions(20)))
write(fixtures, 'missing-answer.docx', docx(simpleBlocks(8, (n, lines) => (n === 7 ? lines.slice(0, 5) : lines))))
write(fixtures, 'bad-letter.docx', docx(simpleBlocks(3, (n, lines) => (n === 2 ? [...lines.slice(0, 5), 'Đáp án: E'] : lines))))
write(fixtures, 'with-image-table.docx', docx(
  [para('Câu 1: Look at the picture. What is it?'), imagePara('rId5'), para('A. cat'), para('B. dog'), para('Đáp án: A'),
    mathPara('Câu 2: Compute ', 'x+1'), para('A. 1'), para('B. 2'), para('Đáp án: B'),
    table(['Câu 3: Which one is a fruit?', 'A. apple', 'B. chair', 'Đáp án: A'])].join(''),
  { image: true },
))
write(fixtures, 'ok.xlsx', xlsx([HEADER, ...sheetSample(5).slice(1).reverse()]))
write(fixtures, 'missing-column.xlsx', xlsx([HEADER.filter((h) => h !== 'correct_answer'), ['1', 'starter', 'reading', 'multiple_choice', 'easy', 'Q?', 'a|b', '', '', '']]))
write(fixtures, 'formula.xlsx', xlsx(sheetSample(2), { formulaAt: 'I2' }))

write(templates, 'mau-bo-de.docx', docx(sampleQuestions(20)))
write(templates, 'mau-bo-de.xlsx', xlsx(sheetSample(20)))
write(templates, 'mau-bo-de.csv', csv(sheetSample(20)))
write(templates, 'mau-trac-nghiem.xlsx', xlsx(friendlySample(10)))
console.log('fixtures + templates written')
