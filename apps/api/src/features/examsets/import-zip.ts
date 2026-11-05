import { inflateRawSync } from 'node:zlib'

/**
 * Minimal ZIP + XML helpers for .docx/.xlsx import (slice-11b). No third-party parser: the central
 * directory is read directly, every declared size is checked before inflating (zip-bomb guard) and XML
 * with DOCTYPE/ENTITY declarations is refused (XXE guard).
 */

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportFileError'
  }
}

const EOCD = 0x06054b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50
const MAX_ENTRIES = 2000
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024

export function isZip(buf: Buffer): boolean {
  return buf.length >= 4 && buf.readUInt32LE(0) === LOCAL
}

/** OLE2 compound file (.doc/.xls of Office 97-2003). */
export function isOle2(buf: Buffer): boolean {
  return buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
}

export function isPdf(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString('latin1') === '%PDF-'
}

function corrupt(): never {
  throw new ImportFileError('File bi hong hoac khong phai dinh dang Office hop le')
}

/** Entry names of the archive mapped to their bytes; only entries accepted by `want` are inflated. */
export function readZip(buf: Buffer, want: (name: string) => boolean): Map<string, Buffer> {
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i -= 1) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) corrupt()
  const count = buf.readUInt16LE(eocd + 10)
  if (count > MAX_ENTRIES) throw new ImportFileError('File co qua nhieu thanh phan')
  let offset = buf.readUInt32LE(eocd + 16)
  let total = 0
  const entries = new Map<string, Buffer>()
  for (let n = 0; n < count; n += 1) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CENTRAL) corrupt()
    const flags = buf.readUInt16LE(offset + 8)
    const method = buf.readUInt16LE(offset + 10)
    const compressed = buf.readUInt32LE(offset + 20)
    const size = buf.readUInt32LE(offset + 24)
    const nameLength = buf.readUInt16LE(offset + 28)
    const local = buf.readUInt32LE(offset + 42)
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength)
    offset += 46 + nameLength + buf.readUInt16LE(offset + 30) + buf.readUInt16LE(offset + 32)
    if ((flags & 1) !== 0) throw new ImportFileError('File dang duoc dat mat khau')
    total += size
    if (total > MAX_EXPANDED_BYTES) throw new ImportFileError('File giai nen vuot gioi han')
    if (name.endsWith('/') || !want(name)) continue
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== LOCAL) corrupt()
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const raw = buf.subarray(start, start + compressed)
    if (raw.length !== compressed) corrupt()
    let data: Buffer
    if (method === 0) data = Buffer.from(raw)
    else if (method === 8) {
      try {
        data = inflateRawSync(raw, { maxOutputLength: Math.max(size, 1) })
      } catch {
        corrupt()
      }
    } else throw new ImportFileError('Kieu nen file khong ho tro')
    if (data.length !== size) corrupt()
    entries.set(name, data)
  }
  return entries
}

/** UTF-8 XML part; DOCTYPE/ENTITY are refused. */
export function xmlPart(entries: Map<string, Buffer>, name: string): string | undefined {
  const bytes = entries.get(name)
  if (!bytes) return undefined
  const xml = bytes.toString('utf8')
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new ImportFileError('XML khong an toan trong file')
  return xml
}

const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

export function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (whole, ref: string) => {
    if (ref[0] !== '#') return NAMED[ref.toLowerCase()] ?? whole
    const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10)
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })
}

export function attr(attrs: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return match ? decodeXml(match[1]!) : undefined
}

/** NFC, non-breaking spaces to spaces, collapsed whitespace. */
export function cleanText(text: string): string {
  return text.normalize('NFC').replace(/[\u00a0\t ]+/g, ' ').trim()
}
