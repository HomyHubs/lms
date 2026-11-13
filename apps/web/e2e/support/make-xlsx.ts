/**
 * Minimal, self-contained OOXML (.xlsx) writer for the Questions E2E fixtures.
 * Produces a single-sheet workbook with inline-string cells — exactly what the
 * app's XLSX parser (apps/web/src/lib/question-import.ts) accepts. No formulas,
 * no macros, no external links. Built with node:zlib only (same technique as
 * apps/api/scripts/make-import-fixtures.mjs), so no new runtime dependency.
 */
import { crc32, deflateRawSync } from 'node:zlib'

function zip(files: Record<string, Buffer | string>): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
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

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const SSML = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const OFF_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** rows[0] is the header row; every cell is written as an inline string. */
export function buildXlsx(rows: string[][]): Buffer {
  const sheetRows = rows
    .map((cells, r) => {
      const rowNum = r + 1
      const cols = cells
        .map((value, c) => {
          const ref = `${colLetter(c)}${rowNum}`
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`
        })
        .join('')
      return `<row r="${rowNum}">${cols}</row>`
    })
    .join('')

  return zip({
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${OFF_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="${SSML}" xmlns:r="${OFF_REL}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${OFF_REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `${XML}<worksheet xmlns="${SSML}"><sheetData>${sheetRows}</sheetData></worksheet>`,
  })
}

function colLetter(index: number): string {
  let n = index
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}
