import { afterEach, describe, expect, it, vi } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { IMPORT_COLUMNS, QuestionImportRow } from '@lms/shared'
import { ApiError, importQuestions, parseQuestionsCsv } from './api'
import { checkImportFile, parseQuestionsXlsx } from './question-import'

const cells = [
  'starter',
  'reading',
  'fill_blank',
  'easy',
  'Hello, world',
  '',
  'hello',
  '1',
  'explanation',
  'source',
]
const csv = (row = cells) =>
  `${IMPORT_COLUMNS.join(',')}\r\n${row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')}`

/** Real ZIP/XML XLSX fixture, parsed by the installed reader (not mocked). */
function workbook(row = cells, formula = false): ArrayBuffer {
  const xmlRow = (values: readonly string[], r: number) =>
    `<row r="${r}">${values.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${r}" t="inlineStr">${formula && i === 4 && r === 2 ? '<f>1+1</f>' : ''}<is><t>${v.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</t></is></c>`).join('')}</row>`
  const files = {
    '[Content_Types].xml':
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    'xl/workbook.xml':
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Questions" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRow(IMPORT_COLUMNS, 1)}${xmlRow(row, 2)}</sheetData></worksheet>`,
  }
  const bytes = zipSync(
    Object.fromEntries(Object.entries(files).map(([name, xml]) => [name, strToU8(xml)])),
  )
  return Uint8Array.from(bytes).buffer
}

afterEach(() => vi.unstubAllGlobals())
describe('strict question imports', () => {
  it('parses BOM, CRLF, quoted comma, escaped quotes and multiline text without data loss', () => {
    const row = [...cells]
    row[4] = 'Hello, "world"\nnext line'
    const parsed = parseQuestionsCsv('\uFEFF' + csv(row))
    expect(parsed[0]?.question_text).toBe(row[4])
    expect(QuestionImportRow.safeParse(parsed[0]).success).toBe(true)
  })
  it('rejects duplicate headers before overwrite', () => {
    expect(() => parseQuestionsCsv(csv().replace('source_reference', 'explanation'))).toThrow(
      'trùng',
    )
  })
  it('rejects unknown headers', () =>
    expect(() => parseQuestionsCsv(csv().replace('source_reference', 'unknown'))).toThrow('cột'))
  it('rejects extra cells rather than swallowing them', () =>
    expect(() => parseQuestionsCsv(csv() + ',hidden')).toThrow('Số ô'))
  it('rejects missing cells', () =>
    expect(() => parseQuestionsCsv(csv(cells.slice(0, 9)))).toThrow('Số ô'))
  it.each(['"unclosed', 'a"b', '"closed"junk'])('rejects malformed CSV quoting: %s', (value) => {
    expect(() => parseQuestionsCsv(IMPORT_COLUMNS.join(',') + '\n' + value)).toThrow()
  })
  it('preserves empty cells and empty files', () => {
    expect(parseQuestionsCsv(csv())[0]?.options).toBe('')
    expect(parseQuestionsCsv('')).toEqual([])
  })
  it('rejects oversized and unsupported files', () => {
    expect(() => checkImportFile({ name: 'bad.xlsm', size: 100 })).toThrow('CSV hoặc XLSX')
    expect(() => checkImportFile({ name: 'big.xlsx', size: 3 * 1024 * 1024 })).toThrow('2 MiB')
  })
  it('reads a real XLSX through the same strict header mapping', async () => {
    expect(await parseQuestionsXlsx(workbook())).toEqual(parseQuestionsCsv(csv()))
  })
  it('rejects extra XLSX cells', async () => {
    await expect(parseQuestionsXlsx(workbook([...cells, 'hidden']))).rejects.toThrow('Số ô')
  })
  it('rejects formulas before reading cached values', async () => {
    await expect(parseQuestionsXlsx(workbook(cells, true))).rejects.toThrow('công thức')
  })
  it('retains API row/field errors for the UI', async () => {
    const errors = [{ row: 2, field: 'points', message: 'Invalid points' }]
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'Invalid import', errors }), { status: 400 }),
      ),
    )
    try {
      await importQuestions([])
      throw new Error('expected failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).errors).toEqual(errors)
    }
  })
})
