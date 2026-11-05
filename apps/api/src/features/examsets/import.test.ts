import { readFileSync } from 'node:fs'
import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { ExamSetImportPreview, ExamSetImportPreviewQuery } from '@lms/shared'
import { makeRbac } from '../access/index.js'
import { SESSION_COOKIE, type AuthStore, type UserRecord } from '../auth/index.js'
import { makeMemoryMediaStorage, type MediaAssetRow, type MediaStore } from '../media/index.js'
import type { QuestionRow } from '../questions/index.js'
import { googleImageUrl, makeImageDownloader, type ImageDownloader } from './import-image-url.js'
import { previewImport } from './import-service.js'
import { examSetsRoutes } from './routes.js'
import type { ExamSetRow, ExamSetsStore, ImportQuestionFields } from './service.js'

const fixture = (name: string) => readFileSync(new URL(`../../../test/fixtures/${name}`, import.meta.url))
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const query = (fileName: string): ExamSetImportPreviewQuery => ({ title: 'Bo de', level: 'starter', skill: 'reading', fileName })

function preview(name: string, buf = fixture(name)): ExamSetImportPreview {
  const outcome = previewImport(buf, query(name))
  if (!outcome.ok) throw new Error(outcome.message)
  return outcome.preview
}

function rejection(name: string, buf: Buffer): string {
  const outcome = previewImport(buf, query(name))
  if (outcome.ok) throw new Error('expected the file to be refused')
  return outcome.message
}

describe('exam-set import — Word (.docx)', () => {
  it('reads the 20-question sample in order with answers, true/false, points and explanation', () => {
    const p = preview('ok-20.docx')
    expect(p.errors).toEqual([])
    expect(p.format).toBe('docx')
    expect(p.items).toHaveLength(20)
    expect(p.items.map((i) => i.order)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    expect(p.items[0]).toMatchObject({ questionType: 'multiple_choice', questionText: 'Chọn từ đúng cho hình số 1.', options: ['dog', 'bird', 'fish', 'lion'], correctAnswer: 'bird', points: 1 })
    // "Question 3." + "a)" labels + "Answer:" are accepted too.
    expect(p.items[2]).toMatchObject({ questionText: 'Which word is "fish"?', options: ['fish', 'lion', 'duck', 'frog'], correctAnswer: 'lion' })
    expect(p.items[4]).toMatchObject({ questionType: 'true_false', options: ['Đúng', 'Sai'], correctAnswer: 'Đúng' })
    expect(p.items[3]?.explanation).toBe('Đáp án là duck.')
    expect(p.items[6]?.points).toBe(2)
    expect(p.warnings).toContain('Bỏ qua 1 dòng trước câu đầu tiên')
  })

  it('reports a block without "Đáp án" by question number', () => {
    const p = preview('missing-answer.docx')
    expect(p.errors).toEqual([{ block: 7, row: null, field: 'correct_answer', message: 'Câu 7: thiếu dòng Đáp án' }])
    expect(p.items).toHaveLength(7)
  })

  it('rejects an answer letter outside the options with question and line', () => {
    const p = preview('bad-letter.docx')
    expect(p.errors).toHaveLength(1)
    expect(p.errors[0]?.message).toMatch(/^Câu 2, dòng 12: đáp án "E" không nằm trong các lựa chọn$/)
  })

  it('keeps embedded image refs, equations as raw text and table content, with warnings', () => {
    const p = preview('with-image-table.docx')
    expect(p.errors).toEqual([])
    expect(p.items).toHaveLength(3)
    expect(p.items[0]).toMatchObject({ imageRefs: ['rId5'], mediaIds: [], warnings: [] })
    expect(p.items[1]?.questionText).toBe('Compute x+1')
    expect(p.items[1]?.warnings).toEqual(['Công thức toán được giữ dạng chữ thô'])
    expect(p.items[2]).toMatchObject({ questionText: 'Which one is a fruit?', correctAnswer: 'apple' })
    expect(p.items[2]?.warnings).toEqual(['Nội dung trong bảng được đọc như văn bản'])
  })
})

describe('exam-set import — Excel / CSV', () => {
  it('reads the first sheet, applies form defaults and sorts by the order column', () => {
    const p = preview('ok.xlsx')
    expect(p.errors).toEqual([])
    expect(p.items.map((i) => i.questionText)).toEqual([
      'Choose the word for picture 1.', 'Choose the word for picture 2.', 'Choose the word for picture 3.',
      'Choose the word for picture 4.', 'A duck is an animal.',
    ])
    expect(p.items[1]).toMatchObject({ correctAnswer: 'b', options: ['bird', 'fish', 'lion', 'duck'] })
    expect(p.items[3]?.explanation).toBe('Look at the picture.')
    expect(p.items[4]).toMatchObject({ questionType: 'true_false', options: ['True', 'False'] })
  })

  it('names the missing column', () => {
    expect(preview('missing-column.xlsx').errors).toEqual([
      { block: null, row: 1, field: 'header', message: 'Thieu cot bat buoc: correct_answer' },
    ])
  })

  it('refuses formula cells', () => {
    expect(rejection('formula.xlsx', fixture('formula.xlsx'))).toMatch(/O I2 chua cong thuc/)
  })

  it('CSV: quoted multi-line cell, enum and level errors carry the row number', () => {
    const csv = [
      'question_type,question_text,options,correct_answer,level',
      'multiple_choice,"Line one\nline two",cat|dog,dog,',
      'essay,Q2,,x,',
      'multiple_choice,Q3,cat|dog,cat,flyer',
      'multiple_choice,Q4,cat|dog,bird,',
    ].join('\r\n')
    const p = preview('de.csv', Buffer.from(csv, 'utf8'))
    expect(p.items).toHaveLength(1)
    expect(p.items[0]?.questionText).toBe('Line one\nline two')
    expect(p.errors.map((e) => [e.row, e.field])).toEqual([[3, 'question_type'], [4, 'level'], [5, 'correct_answer']])
  })

  it('limits a set to 200 questions', () => {
    const rows = ['question_type,question_text,options,correct_answer']
    for (let i = 0; i < 201; i += 1) rows.push(`multiple_choice,Q${i},a|b,a`)
    expect(preview('big.csv', Buffer.from(rows.join('\n'))).errors[0]?.message).toBe('Toi da 200 cau trong mot bo de')
  })

  it('friendly sheet: Vietnamese headers, A-D options, letter answer, Đúng/Sai and Google image links', () => {
    const link = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing'
    const csv = [
      'STT,Hình (link Google),Câu hỏi,A,B,C,D,Đáp án,Điểm,Giải thích,Độ khó',
      `2,${link},Con gì kêu meo meo?,dog,cat,fish,,b,2,Mèo kêu meo meo,dễ`,
      '1,,Mặt trời mọc ở hướng đông.,Đúng,Sai,,,A,,,',
      '3,http://example.com/x.png,Q3,a,b,,,a,,,',
      '4,,Q4,a,,c,,a,,,',
    ].join('\n')
    const p = preview('de.csv', Buffer.from(csv, 'utf8'))
    expect(p.items).toHaveLength(2)
    expect(p.items[0]).toMatchObject({ questionType: 'true_false', options: ['Đúng', 'Sai'], correctAnswer: 'Đúng', imageRefs: [] })
    expect(p.items[1]).toMatchObject({
      questionType: 'multiple_choice', questionText: 'Con gì kêu meo meo?', options: ['dog', 'cat', 'fish'], correctAnswer: 'cat',
      points: 2, explanation: 'Mèo kêu meo meo', difficulty: 'easy', imageRefs: [link],
    })
    expect(p.errors.map((e) => [e.row, e.field])).toEqual([[4, 'image'], [5, 'options']])
  })
})

describe('exam-set import — Google image links', () => {
  it('rewrites Drive share links and refuses other hosts or plain http', () => {
    expect(googleImageUrl('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing')?.href)
      .toBe('https://drive.usercontent.google.com/download?id=1AbCdEfGhIjKlMnOp&export=download')
    expect(googleImageUrl('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp')?.hostname).toBe('drive.usercontent.google.com')
    expect(googleImageUrl('https://lh3.googleusercontent.com/abc')).not.toBeNull()
    expect(googleImageUrl('http://drive.google.com/file/d/1AbCdEfGhIjKlMnOp')).toBeNull()
    expect(googleImageUrl('https://drive.google.com.evil.example/file/d/1AbCdEfGhIjKlMnOp')).toBeNull()
  })

  it('downloader follows Google redirects only and treats a sign-in page as not shared', async () => {
    const download = makeImageDownloader(async (input) => {
      const url = String(input)
      if (url.includes('1redirectToEvil')) return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } })
      if (url.includes('1privateFile00')) return new Response('<html>', { headers: { 'content-type': 'text/html' } })
      if (url.includes('1publicFile000')) return new Response(null, { status: 303, headers: { location: 'https://lh3.googleusercontent.com/img' } })
      return new Response(PNG_1X1, { headers: { 'content-type': 'image/png' } })
    })
    expect(await download('https://drive.google.com/file/d/1redirectToEvil/view')).toEqual({ ok: false, reason: 'not_public' })
    expect(await download('https://drive.google.com/file/d/1privateFile00/view')).toEqual({ ok: false, reason: 'not_public' })
    expect(await download('https://example.com/a.png')).toEqual({ ok: false, reason: 'not_google' })
    expect(await download('https://drive.google.com/file/d/1publicFile000/view')).toEqual({ ok: true, data: PNG_1X1 })
  })
})

describe('exam-set import — file checks (magic bytes)', () => {
  it('asks to save old Word / PDF as .docx', () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
    expect(rejection('de.doc', ole)).toMatch(/\.docx/)
    expect(rejection('de.docx', ole)).toMatch(/\.docx/)
    expect(rejection('de.pdf', Buffer.from('%PDF-1.7 ...'))).toMatch(/\.docx/)
  })

  it('refuses content that does not match the extension', () => {
    expect(rejection('de.docx', Buffer.from('question_type,question_text'))).toBe('Noi dung file khong phai .docx that')
    expect(rejection('de.docx', fixture('ok.xlsx'))).toBe('Noi dung file khong phai .docx that')
    expect(rejection('de.csv', fixture('ok.xlsx'))).toBe('Noi dung file khong phai CSV van ban')
    expect(rejection('de.png', Buffer.from('x'))).toBe('Chi ho tro file .docx, .xlsx hoac .csv')
  })

  it('refuses a corrupt archive and an empty file', () => {
    expect(rejection('de.xlsx', Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(40)]))).toMatch(/hong/)
    expect(rejection('de.csv', Buffer.alloc(0))).toBe('File rong')
  })
})

const TEACHER: UserRecord = { id: 'teacher-1', phone_number: '0900000002', password_hash: 'x', role: 'teacher' }
const STUDENT: UserRecord = { id: 'student-1', phone_number: '0900000003', password_hash: 'x', role: 'student' }
const COOKIE = `${SESSION_COOKIE}=any-token`

function authStore(user: UserRecord): AuthStore {
  return {
    async findUserByPhone() { return undefined },
    async findUserById(id) { return id === user.id ? user : undefined },
    async createSession() {},
    async findSession() { return { userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) } },
    async deleteSession() {},
  }
}

/** In-memory store: records what the import writes. */
function importStore() {
  const imported: ImportQuestionFields[][] = []
  let set: ExamSetRow | undefined
  const store = {
    async findLevelByCode(code: string) { return code === 'starter' ? { id: 'lvl-starter', code } : undefined },
    async findSet() { return set },
    async listItems(): Promise<QuestionRow[]> {
      return (imported[0] ?? []).map((q, i) => ({
        id: `q-${i + 1}`, level_id: q.levelId, level_code: 'starter', skill: q.skill, question_type: q.questionType,
        difficulty: q.difficulty, question_text: q.questionText, options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correctAnswer, points: q.points ?? 1, explanation: q.explanation, source_reference: null,
        source: q.source, created_at: '2026-11-14T00:00:00.000Z',
      }))
    },
    async importSet(input: { title: string; levelId: string; skill: string; createdBy: string }, questions: ImportQuestionFields[]) {
      imported.push(questions)
      set = {
        id: '00000000-0000-4000-8000-0000000000a1', title: input.title, level_id: input.levelId, level_code: 'starter',
        skill: input.skill, description: null, status: 'draft', item_count: questions.length, created_by: input.createdBy,
        created_at: '2026-11-14T00:00:00.000Z', updated_at: '2026-11-14T00:00:00.000Z', published_at: null,
      }
      return set
    },
  }
  return { store: store as unknown as ExamSetsStore, imported }
}

/** In-memory media assets, deduplicated by content hash like the real store. */
function mediaStore(): MediaStore {
  const rows: MediaAssetRow[] = []
  return {
    async findAssetBySha(sha) { return rows.find((r) => r.sha256 === sha) },
    async insertAsset({ created_by: _by, ...fields }) {
      const row = { id: `00000000-0000-4000-8000-${String(rows.length + 1).padStart(12, '0')}`, ...fields }
      rows.push(row)
      return row
    },
    async findAssetById(id) { return rows.find((r) => r.id === id) },
    async countAssets(ids) { return rows.filter((r) => ids.includes(r.id)).length },
    async isInStudentAttempt() { return false },
    async findQuestionOptions() { return undefined },
    async listQuestionMedia() { return [] },
    async replaceQuestionMedia() {},
  }
}

describe('exam-set import routes', () => {
  let app: FastifyInstance | undefined
  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  async function build(user: UserRecord, store: ExamSetsStore, download?: ImageDownloader): Promise<FastifyInstance> {
    const instance = Fastify({ logger: false })
    await instance.register(cookie)
    await examSetsRoutes(instance, {
      rbac: makeRbac(authStore(user)), examSetsStore: store,
      media: { store: mediaStore(), storage: makeMemoryMediaStorage(), ...(download ? { download } : {}) },
    })
    return instance
  }
  const previewUrl = '/exam-sets/import/preview?title=De%20mau&level=starter&skill=reading&fileName=de.docx'
  const upload = (body: Buffer) => ({
    method: 'POST' as const, url: previewUrl, payload: body,
    headers: { cookie: COOKIE, 'content-type': 'application/octet-stream' },
  })

  it('preview returns the parsed items and writes nothing; commit creates the draft in preview order', async () => {
    const { store, imported } = importStore()
    app = await build(TEACHER, store)
    const res = await app.inject(upload(fixture('ok-20.docx')))
    expect(res.statusCode).toBe(200)
    const body = res.json<ExamSetImportPreview>()
    expect(body.items).toHaveLength(20)
    expect(imported).toHaveLength(0)

    const commit = await app.inject({
      method: 'POST', url: '/exam-sets/import/commit', headers: { cookie: COOKIE },
      payload: { title: 'De mau', level: 'starter', skill: 'reading', items: body.items },
    })
    expect(commit.statusCode).toBe(201)
    expect(imported[0]?.map((q) => q.questionText)).toEqual(body.items.map((i) => i.questionText))
    expect(imported[0]?.every((q) => q.source === 'exam_set' && q.levelId === 'lvl-starter')).toBe(true)
    expect(commit.json<{ examSet: { status: string; items: unknown[] } }>().examSet).toMatchObject({ status: 'draft' })
  })

  it('preview stores Word-embedded images and commit links them to the question stem', async () => {
    const { store, imported } = importStore()
    app = await build(TEACHER, store)
    const res = await app.inject(upload(fixture('with-image-table.docx')))
    expect(res.statusCode).toBe(200)
    const body = res.json<ExamSetImportPreview>()
    expect(body.items[0]?.mediaIds).toHaveLength(1)
    expect(body.items[1]?.mediaIds).toEqual([])

    const commit = await app.inject({
      method: 'POST', url: '/exam-sets/import/commit', headers: { cookie: COOKIE },
      payload: { title: 'De mau', level: 'starter', skill: 'reading', items: body.items },
    })
    expect(commit.statusCode).toBe(201)
    expect(imported[0]?.map((q) => q.stemMediaIds)).toEqual([body.items[0]?.mediaIds, [], []])
  })

  it('preview downloads Google image links of a friendly sheet and warns when a link is not shared', async () => {
    const { store } = importStore()
    const links: string[] = []
    app = await build(TEACHER, store, async (link) => {
      links.push(link)
      return link.includes('private') ? { ok: false, reason: 'not_public' } : { ok: true, data: PNG_1X1 }
    })
    const csv = [
      'Hình,Câu hỏi,A,B,Đáp án',
      'https://drive.google.com/file/d/1publicFile000/view,Q1,a,b,a',
      'https://drive.google.com/file/d/1privateFile00/view,Q2,a,b,b',
    ].join('\n')
    const res = await app.inject({ ...upload(Buffer.from(csv)), url: previewUrl.replace('de.docx', 'de.csv') })
    expect(res.statusCode).toBe(200)
    const body = res.json<ExamSetImportPreview>()
    expect(links).toHaveLength(2)
    expect(body.items[0]?.mediaIds).toHaveLength(1)
    expect(body.items[1]).toMatchObject({
      mediaIds: [], warnings: ['Không tải được hình: hãy chia sẻ link ở chế độ "Bất kỳ ai có đường liên kết"'],
    })
  })

  it('commit re-validates every item and writes nothing when one is invalid', async () => {
    const { store, imported } = importStore()
    app = await build(TEACHER, store)
    const res = await app.inject({
      method: 'POST', url: '/exam-sets/import/commit', headers: { cookie: COOKIE },
      payload: { title: 'De', level: 'starter', skill: 'reading', items: [
        { questionType: 'multiple_choice', questionText: 'Q1', options: ['a', 'b'], correctAnswer: 'a' },
        { questionType: 'multiple_choice', questionText: 'Q2', options: ['a', 'b'], correctAnswer: 'z' },
      ] },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ errors: unknown[] }>().errors).toEqual([
      { row: 2, field: 'correct_answer', message: 'Cau 2: Dap an dung phai khop mot lua chon' },
    ])
    expect(imported).toHaveLength(0)
  })

  it('students are refused; a bad file is 400, a non-binary body 415, an oversized one 413', async () => {
    const { store } = importStore()
    app = await build(STUDENT, store)
    expect((await app.inject(upload(fixture('ok-20.docx')))).statusCode).toBe(403)
    await app.close()
    app = await build(TEACHER, store)
    const bad = await app.inject(upload(Buffer.from('not a docx')))
    expect(bad.statusCode).toBe(400)
    expect(bad.json()).toMatchObject({ code: 'invalid_file' })
    expect((await app.inject({ method: 'POST', url: previewUrl, headers: { cookie: COOKIE }, payload: { a: 1 } })).statusCode).toBe(415)
    expect((await app.inject(upload(Buffer.alloc(10 * 1024 * 1024 + 1)))).statusCode).toBe(413)
  })
})
