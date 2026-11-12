import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

/** Blob storage behind media assets; keys are sha256 hex, so a key never maps to two contents. */
export interface MediaStorage {
  put: (key: string, data: Buffer) => Promise<void>
  get: (key: string) => Promise<Buffer | undefined>
}

const KEY = /^[0-9a-f]{64}$/

function assertKey(key: string): void {
  if (!KEY.test(key)) throw new Error('Invalid media storage key')
}

/** Local disk driver (`MEDIA_DIR`); an S3-compatible driver is deferred (ADR 0013). */
export function makeLocalMediaStorage(dir: string): MediaStorage {
  const pathOf = (key: string) => join(dir, key.slice(0, 2), key)
  return {
    async put(key, data) {
      assertKey(key)
      const target = pathOf(key)
      await mkdir(join(dir, key.slice(0, 2)), { recursive: true })
      const temp = `${target}.${randomUUID()}.tmp`
      await writeFile(temp, data)
      await rename(temp, target)
    },
    async get(key) {
      assertKey(key)
      try {
        return await readFile(pathOf(key))
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
        throw err
      }
    },
  }
}

export function makeMemoryMediaStorage(): MediaStorage {
  const blobs = new Map<string, Buffer>()
  return {
    async put(key, data) {
      assertKey(key)
      blobs.set(key, Buffer.from(data))
    },
    async get(key) {
      return blobs.get(key)
    },
  }
}
