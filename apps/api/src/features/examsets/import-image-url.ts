import { MEDIA_MAX_BYTES } from '@lms/shared'

/**
 * Image links in the Excel/CSV "Hinh" column (slice-11c). Only https Google hosts are fetched, and every
 * redirect hop is checked again, so the server never requests an arbitrary or internal address.
 */

const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com'])
const DIRECT_HOSTS = new Set(['drive.usercontent.google.com', 'lh3.google.com'])
const MAX_REDIRECTS = 5
const TIMEOUT_MS = 10_000

function isAllowedHost(host: string): boolean {
  return DRIVE_HOSTS.has(host) || DIRECT_HOSTS.has(host) || host.endsWith('.googleusercontent.com')
}

/** Direct https URL for a Google image link (Drive share links become their download URL), else null. */
export function googleImageUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
  const host = url.hostname.toLowerCase()
  if (!isAllowedHost(host)) return null
  if (!DRIVE_HOSTS.has(host)) return url
  const id = /\/d\/([\w-]{10,})/.exec(url.pathname)?.[1] ?? url.searchParams.get('id')
  if (!id || !/^[\w-]{10,}$/.test(id)) return null
  return new URL(`https://drive.usercontent.google.com/download?id=${id}&export=download`)
}

export type DownloadOutcome =
  | { ok: true; data: Buffer }
  | { ok: false; reason: 'not_google' | 'not_public' | 'too_large' | 'failed' }

export type ImageDownloader = (link: string) => Promise<DownloadOutcome>

async function readCapped(res: Response): Promise<Buffer | null> {
  if (!res.body) return Buffer.alloc(0)
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of res.body) {
    size += chunk.length
    if (size > MEDIA_MAX_BYTES) return null
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export function makeImageDownloader(fetchImpl: typeof fetch = fetch): ImageDownloader {
  return async (link) => {
    const first = googleImageUrl(link)
    if (!first) return { ok: false, reason: 'not_google' }
    let url: URL = first
    try {
      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const res = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (res.status >= 300 && res.status < 400) {
          const next = res.headers.get('location')
          const target: URL | null = next ? new URL(next, url) : null
          if (!target || target.protocol !== 'https:' || !isAllowedHost(target.hostname.toLowerCase())) {
            return { ok: false, reason: 'not_public' }
          }
          url = target
          continue
        }
        if (!res.ok) return { ok: false, reason: res.status === 403 || res.status === 404 ? 'not_public' : 'failed' }
        // Drive answers a private file with an HTML sign-in page instead of the image.
        if ((res.headers.get('content-type') ?? '').startsWith('text/html')) return { ok: false, reason: 'not_public' }
        if (Number(res.headers.get('content-length') ?? 0) > MEDIA_MAX_BYTES) return { ok: false, reason: 'too_large' }
        const data = await readCapped(res)
        return data ? { ok: true, data } : { ok: false, reason: 'too_large' }
      }
      return { ok: false, reason: 'failed' }
    } catch {
      return { ok: false, reason: 'failed' }
    }
  }
}
