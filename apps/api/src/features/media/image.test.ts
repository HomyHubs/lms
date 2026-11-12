import { describe, expect, it } from 'vitest'
import { MEDIA_MAX_BYTES } from '@lms/shared'
import { sniffImage, stripMetadata } from './image.js'
import { uploadMedia, type MediaAssetRow, type MediaStore } from './service.js'
import { makeMemoryMediaStorage, type MediaStorage } from './storage.js'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)])
}

function png(width: number, height: number, extra: Buffer[] = []): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', header), ...extra,
    pngChunk('IDAT', Buffer.from([1, 2, 3])), pngChunk('IEND', Buffer.alloc(0))])
}

function jpegSegment(marker: number, data: Buffer): Buffer {
  const head = Buffer.from([0xff, marker, 0, 0])
  head.writeUInt16BE(data.length + 2, 2)
  return Buffer.concat([head, data])
}

function jpeg(width: number, height: number, exif: boolean): Buffer {
  const frame = Buffer.alloc(15)
  frame[0] = 8
  frame.writeUInt16BE(height, 1)
  frame.writeUInt16BE(width, 3)
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    jpegSegment(0xe0, Buffer.from('JFIF\0', 'latin1')),
    ...(exif ? [jpegSegment(0xe1, Buffer.from('Exif\0\0GPS-SECRET', 'latin1'))] : []),
    jpegSegment(0xc0, frame),
    jpegSegment(0xda, Buffer.from([1, 1, 0, 0x3f, 0])),
    Buffer.from([0x12, 0x34, 0xff, 0xd9]),
  ])
}

function gif(width: number, height: number): Buffer {
  const buf = Buffer.alloc(16)
  buf.write('GIF89a', 0, 'latin1')
  buf.writeUInt16LE(width, 6)
  buf.writeUInt16LE(height, 8)
  return buf
}

function webpExtended(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30)
  buf.write('RIFF', 0, 'latin1')
  buf.writeUInt32LE(22, 4)
  buf.write('WEBPVP8X', 8, 'latin1')
  buf.writeUInt32LE(10, 16)
  buf.writeUIntLE(width - 1, 24, 3)
  buf.writeUIntLE(height - 1, 27, 3)
  return buf
}

const EXE_RENAMED_PNG = Buffer.concat([Buffer.from('MZ', 'latin1'), Buffer.alloc(64, 0x90)])

describe('sniffImage', () => {
  it('reads type and size from the header of each allowed format', () => {
    expect(sniffImage(png(640, 480))).toEqual({ mime: 'image/png', width: 640, height: 480 })
    expect(sniffImage(jpeg(800, 600, true))).toEqual({ mime: 'image/jpeg', width: 800, height: 600 })
    expect(sniffImage(gif(32, 16))).toEqual({ mime: 'image/gif', width: 32, height: 16 })
    expect(sniffImage(webpExtended(1200, 900))).toEqual({ mime: 'image/webp', width: 1200, height: 900 })
  })

  it('rejects an executable renamed to .png, SVG and truncated headers', () => {
    expect(sniffImage(EXE_RENAMED_PNG)).toBeNull()
    expect(sniffImage(png(10, 10).subarray(0, 20))).toBeNull()
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
  })
})

describe('stripMetadata', () => {
  it('drops JPEG EXIF (APP1) and keeps the frame', () => {
    const clean = stripMetadata(jpeg(800, 600, true), 'image/jpeg')
    expect(clean.includes(Buffer.from('GPS-SECRET'))).toBe(false)
    expect(clean.equals(jpeg(800, 600, false))).toBe(true)
    expect(sniffImage(clean)).toEqual({ mime: 'image/jpeg', width: 800, height: 600 })
  })

  it('drops PNG text/EXIF chunks', () => {
    const tagged = png(5, 5, [pngChunk('tEXt', Buffer.from('Author\0Secret')), pngChunk('eXIf', Buffer.from('GPS'))])
    expect(stripMetadata(tagged, 'image/png').equals(png(5, 5))).toBe(true)
  })
})

function memoryStore(): MediaStore & { assets: MediaAssetRow[] } {
  const assets: MediaAssetRow[] = []
  const unused = async (): Promise<never> => { throw new Error('not used') }
  return {
    assets,
    async findAssetBySha(sha256) { return assets.find((a) => a.sha256 === sha256) },
    async insertAsset(fields) {
      const row = { ...fields, id: `00000000-0000-4000-8000-${String(assets.length + 1).padStart(12, '0')}` }
      assets.push(row)
      return row
    },
    async findAssetById(id) { return assets.find((a) => a.id === id) },
    countAssets: unused,
    isInStudentAttempt: unused,
    findQuestionOptions: unused,
    listQuestionMedia: unused,
    replaceQuestionMedia: unused,
  }
}

describe('uploadMedia', () => {
  const USER = '11111111-1111-4111-8111-111111111111'

  function countingStorage(): MediaStorage & { puts: number } {
    const inner = makeMemoryMediaStorage()
    const storage: MediaStorage & { puts: number } = { puts: 0, get: inner.get, put: async (key: string, data: Buffer) => { storage.puts += 1; await inner.put(key, data) } }
    return storage
  }

  it('rejects oversize bytes, oversize dimensions and non-images', async () => {
    const store = memoryStore()
    const storage = countingStorage()
    const big = Buffer.concat([png(10, 10), Buffer.alloc(MEDIA_MAX_BYTES)])
    expect(await uploadMedia(store, storage, big, USER)).toEqual({ ok: false, reason: 'too_large' })
    expect(await uploadMedia(store, storage, png(4001, 10), USER)).toEqual({ ok: false, reason: 'too_many_pixels' })
    expect(await uploadMedia(store, storage, EXE_RENAMED_PNG, USER)).toEqual({ ok: false, reason: 'unsupported_type' })
    expect(store.assets).toHaveLength(0)
    expect(storage.puts).toBe(0)
  })

  it('stores the stripped bytes once per content (sha256 dedupe)', async () => {
    const store = memoryStore()
    const storage = countingStorage()
    const first = await uploadMedia(store, storage, jpeg(40, 30, true), USER)
    const again = await uploadMedia(store, storage, jpeg(40, 30, false), USER)
    if (!first.ok || !again.ok) throw new Error('upload failed')
    expect(again.media.id).toBe(first.media.id)
    expect(first.media).toMatchObject({ mime: 'image/jpeg', width: 40, height: 30, url: `/api/media/${first.media.id}` })
    expect(storage.puts).toBe(1)
    expect((await storage.get(store.assets[0]!.storage_key))!.includes(Buffer.from('GPS-SECRET'))).toBe(false)
  })
})
