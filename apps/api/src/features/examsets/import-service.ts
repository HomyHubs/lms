import {
  EXAM_IMPORT_MAX_BYTES,
  MEDIA_MAX_BYTES,
  MEDIA_MAX_DIMENSION,
  QUESTION_MEDIA_MAX,
  type CommitExamSetImportRequest,
  type ExamImportFormat,
  type ExamSetDetail,
  type ExamSetImportIssue,
  type ExamSetImportPreview,
  type ExamSetImportPreviewQuery,
} from '@lms/shared'
import { uploadMedia, type MediaStorage, type MediaStore } from '../media/index.js'
import { parseDocx, readDocxImages, readDocxLines } from './import-docx.js'
import { makeImageDownloader, type DownloadOutcome, type ImageDownloader } from './import-image-url.js'
import { checkImportItem, issue } from './import-item.js'
import { parseSheet, readCsvRows, readXlsxRows, type ParsedImport } from './import-sheet.js'
import { ImportFileError, isOle2, isPdf, isZip, readZip } from './import-zip.js'
import { getExamSet, type ExamSetRow, type ExamSetsStore, type ImportQuestionFields } from './service.js'

/**
 * Import bo de 2 buoc (slice-11b). `previewImport` chi doc file; `attachImportImages` luu hinh nhung Word
 * thanh media asset (slice-12.2, chua gan vao cau nao); `commitImport` validate lai tung cau roi tao bo de
 * draft + cau hoi (source exam_set) + thu tu + hinh de bai trong 1 transaction.
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

type ParsedFile = ParsedImport & { images: Map<string, Buffer> }

function parseFile(format: ExamImportFormat, buf: Buffer, query: ExamSetImportPreviewQuery): ParsedFile {
  if (format === 'csv') {
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      throw new ImportFileError('CSV phai duoc ma hoa UTF-8')
    }
    return { ...parseSheet(readCsvRows(text), query.level, query.skill), images: new Map() }
  }
  if (format === 'xlsx') {
    const entries = readZip(buf, (name) => name.endsWith('.xml') || name.endsWith('.rels'))
    if ([...entries.keys()].some((name) => /vbaProject|externalLink/i.test(name))) {
      throw new ImportFileError('Khong ho tro file co macro hoac lien ket ngoai')
    }
    if (!entries.has('xl/workbook.xml')) throw new ImportFileError('Noi dung file khong phai .xlsx that')
    const { rows, warnings } = readXlsxRows(entries)
    const parsed = parseSheet(rows, query.level, query.skill)
    return { ...parsed, warnings: [...warnings, ...parsed.warnings], images: new Map() }
  }
  const entries = readZip(buf, (name) => name === 'word/document.xml' || name === 'word/_rels/document.xml.rels'
    || name.startsWith('word/media/'))
  if (!entries.has('word/document.xml')) throw new ImportFileError('Noi dung file khong phai .docx that')
  return { ...parseDocx(readDocxLines(entries), query.level, query.skill), images: readDocxImages(entries) }
}

export type PreviewOutcome =
  | { ok: true; preview: ExamSetImportPreview; images: Map<string, Buffer> }
  | { ok: false; message: string }

export function previewImport(buf: Buffer, query: ExamSetImportPreviewQuery): PreviewOutcome {
  if (buf.length === 0) return { ok: false, message: 'File rong' }
  if (buf.length > EXAM_IMPORT_MAX_BYTES) return { ok: false, message: 'File vuot qua 10 MB' }
  try {
    const format = detectFormat(query.fileName, buf)
    const { images, ...parsed } = parseFile(format, buf, query)
    return {
      ok: true,
      preview: { title: query.title, level: query.level, skill: query.skill, format, ...parsed },
      images,
    }
  } catch (err) {
    if (err instanceof ImportFileError) return { ok: false, message: err.message }
    throw err
  }
}

export interface ImportMedia {
  store: MediaStore
  storage: MediaStorage
  /** Fetches image links from the Excel/CSV "Hinh" column; defaults to the Google-only downloader. */
  download?: ImageDownloader
}

const defaultDownloader = makeImageDownloader()
const LINK_CONCURRENCY = 4

const LINK_FAILED: Record<Exclude<DownloadOutcome, { ok: true }>['reason'], string> = {
  not_google: 'Bỏ qua link hình không phải Google Drive/Google Photos (https)',
  not_public: 'Không tải được hình: hãy chia sẻ link ở chế độ "Bất kỳ ai có đường liên kết"',
  too_large: `Bỏ qua 1 hình lớn hơn ${MEDIA_MAX_BYTES / 1024 / 1024} MB`,
  failed: 'Không tải được hình từ link, thử lại sau',
}

const SKIPPED_IMAGE = {
  empty: 'Bỏ qua 1 hình không đọc được trong file',
  unsupported_type: 'Bỏ qua 1 hình không phải PNG/JPEG/WebP/GIF',
  too_large: `Bỏ qua 1 hình lớn hơn ${MEDIA_MAX_BYTES / 1024 / 1024} MB`,
  too_many_pixels: `Bỏ qua 1 hình quá ${MEDIA_MAX_DIMENSION}×${MEDIA_MAX_DIMENSION} px`,
} as const

type ImportItem = ExamSetImportPreview['items'][number]

/**
 * Uploads each item's images (same checks as POST /media) and lists them in `mediaIds`. A ref is a Word
 * relationship id found in `images`, or an image link from a spreadsheet, downloaded here.
 */
export async function attachImportImages(
  preview: ExamSetImportPreview, images: Map<string, Buffer>, media: ImportMedia, userId: string,
): Promise<ExamSetImportPreview> {
  const download = media.download ?? defaultDownloader
  const attach = async (item: ImportItem): Promise<ImportItem> => {
    const mediaIds: string[] = []
    const warnings = [...item.warnings]
    for (const ref of item.imageRefs) {
      let body = images.get(ref)
      if (!body && /^https?:\/\//i.test(ref)) {
        const fetched = await download(ref)
        if (!fetched.ok) { warnings.push(LINK_FAILED[fetched.reason]); continue }
        body = fetched.data
      }
      const outcome = await uploadMedia(media.store, media.storage, body ?? Buffer.alloc(0), userId)
      if (!outcome.ok) warnings.push(SKIPPED_IMAGE[outcome.reason])
      else if (!mediaIds.includes(outcome.media.id)) mediaIds.push(outcome.media.id)
    }
    if (mediaIds.length > QUESTION_MEDIA_MAX) warnings.push(`Chỉ gắn ${QUESTION_MEDIA_MAX} hình đầu tiên`)
    return { ...item, warnings, mediaIds: mediaIds.slice(0, QUESTION_MEDIA_MAX) }
  }
  const items: ImportItem[] = new Array(preview.items.length)
  let next = 0
  const worker = async () => {
    while (next < preview.items.length) {
      const index = next++
      items[index] = await attach(preview.items[index]!)
    }
  }
  await Promise.all(Array.from({ length: LINK_CONCURRENCY }, worker))
  return { ...preview, items }
}

export type CommitOutcome =
  | { ok: true; examSet: ExamSetDetail }
  | { ok: false; reason: 'level_not_found' | 'media_not_found' }
  | { ok: false; reason: 'invalid_import'; errors: ExamSetImportIssue[] }

/** All-or-nothing: one invalid item rejects the whole import and nothing is written. */
export async function commitImport(
  store: ExamSetsStore, input: CommitExamSetImportRequest, createdBy: string,
): Promise<CommitOutcome> {
  const level = await store.findLevelByCode(input.level)
  if (!level) return { ok: false, reason: 'level_not_found' }
  const errors: ExamSetImportIssue[] = []
  const questions: ImportQuestionFields[] = []
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
      stemMediaIds: item.mediaIds ?? [],
    })
  })
  if (errors.length > 0) return { ok: false, reason: 'invalid_import', errors }
  let row: ExamSetRow
  try {
    row = await store.importSet(
      { title: input.title, levelId: level.id, skill: input.skill, description: null, createdBy },
      questions,
    )
  } catch (err) {
    if ((err as { code?: unknown } | null)?.code === '23503') return { ok: false, reason: 'media_not_found' }
    throw err
  }
  const detail = await getExamSet(store, row.id)
  if (!detail.ok) throw new Error(`Imported exam set ${row.id} vanished`)
  return { ok: true, examSet: detail.examSet }
}
