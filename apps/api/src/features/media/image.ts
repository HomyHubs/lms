import type { MediaMime } from '@lms/shared'

/**
 * Image sniffing from magic bytes + header dimensions, without an image library (ADR 0013).
 * The declared file name / Content-Type is never trusted.
 */
export interface ImageInfo {
  mime: MediaMime
  width: number
  height: number
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function ascii(buf: Buffer, start: number, length: number): string {
  return buf.toString('latin1', start, start + length)
}

function pngInfo(buf: Buffer): ImageInfo | null {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE) || ascii(buf, 12, 4) !== 'IHDR') return null
  return { mime: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function gifInfo(buf: Buffer): ImageInfo | null {
  const signature = ascii(buf, 0, 6)
  if (buf.length < 10 || (signature !== 'GIF87a' && signature !== 'GIF89a')) return null
  return { mime: 'image/gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
}

function webpInfo(buf: Buffer): ImageInfo | null {
  if (buf.length < 30 || ascii(buf, 0, 4) !== 'RIFF' || ascii(buf, 8, 4) !== 'WEBP') return null
  const chunk = ascii(buf, 12, 4)
  if (chunk === 'VP8 ' && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
    return { mime: 'image/webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L' && buf[20] === 0x2f) {
    const bits = buf.readUInt32LE(21)
    return { mime: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    return { mime: 'image/webp', width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 }
  }
  return null
}

/** SOF0..SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size. */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
}

interface JpegSegment {
  marker: number
  start: number
  end: number
}

/** Header segments up to (excluding) start-of-scan; null when the structure is broken. */
function jpegSegments(buf: Buffer): { segments: JpegSegment[]; scanStart: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  const segments: JpegSegment[] = []
  let offset = 2
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) return null
    const marker = buf[offset + 1]!
    if (marker === 0xff) { offset += 1; continue }
    if (marker === 0xda) return { segments, scanStart: offset }
    const end = offset + 2 + buf.readUInt16BE(offset + 2)
    if (end > buf.length) return null
    segments.push({ marker, start: offset, end })
    offset = end
  }
  return null
}

function jpegInfo(buf: Buffer): ImageInfo | null {
  const parsed = jpegSegments(buf)
  const frame = parsed?.segments.find((s) => isStartOfFrame(s.marker) && s.end - s.start >= 9)
  if (!frame) return null
  return { mime: 'image/jpeg', width: buf.readUInt16BE(frame.start + 7), height: buf.readUInt16BE(frame.start + 5) }
}

export function sniffImage(buf: Buffer): ImageInfo | null {
  return pngInfo(buf) ?? jpegInfo(buf) ?? gifInfo(buf) ?? webpInfo(buf)
}

const PNG_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'])
const JPEG_APP1 = 0xe1

function stripPng(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 8)]
  let offset = 8
  while (offset + 12 <= buf.length) {
    const end = offset + 12 + buf.readUInt32BE(offset)
    if (end > buf.length) return buf
    if (!PNG_METADATA_CHUNKS.has(ascii(buf, offset + 4, 4))) parts.push(buf.subarray(offset, end))
    offset = end
  }
  return Buffer.concat([...parts, buf.subarray(offset)])
}

/** Drops APP1 (EXIF/XMP: GPS, camera, owner) segments; pixel data is copied untouched. */
function stripJpeg(buf: Buffer): Buffer {
  const parsed = jpegSegments(buf)
  if (!parsed) return buf
  const kept = parsed.segments.filter((s) => s.marker !== JPEG_APP1).map((s) => buf.subarray(s.start, s.end))
  return Buffer.concat([buf.subarray(0, 2), ...kept, buf.subarray(parsed.scanStart)])
}

/** Removes privacy metadata where the container allows it without re-encoding (WebP/GIF kept as-is). */
export function stripMetadata(buf: Buffer, mime: MediaMime): Buffer {
  if (mime === 'image/png') return stripPng(buf)
  if (mime === 'image/jpeg') return stripJpeg(buf)
  return buf
}
