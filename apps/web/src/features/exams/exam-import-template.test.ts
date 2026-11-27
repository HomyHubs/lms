import { IMPORT_COLUMNS } from '@lms/shared'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildExamImportTemplate } from './exam-import-template'

describe('buildExamImportTemplate', () => {
  it('tra ve workbook xlsx khong rong', () => {
    const bytes = buildExamImportTemplate()
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.byteLength).toBeGreaterThan(0)
    // Chu ky ZIP (PK\x03\x04) — xlsx la mot file zip.
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
  })

  it('header khop dung IMPORT_COLUMNS de import nguoc duoc', () => {
    const entries = unzipSync(buildExamImportTemplate())
    const sheet = strFromU8(entries['xl/worksheets/sheet1.xml']!)
    for (const column of IMPORT_COLUMNS) {
      expect(sheet).toContain(column)
    }
  })
})
