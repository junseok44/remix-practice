import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import type { FileStorage } from 'remix/file-storage'
import { createFsFileStorage } from 'remix/file-storage/fs'
import { createMemoryFileStorage } from 'remix/file-storage/memory'

export const maxCoverSize = 2 * 1024 * 1024

export const coverStorage: FileStorage =
  process.env.NODE_ENV === 'test'
    ? createMemoryFileStorage()
    : createFsFileStorage(fileURLToPath(new URL('../../tmp/uploads', import.meta.url)))

export type CoverType = 'image/png' | 'image/jpeg' | 'image/webp'

const extensions: Record<CoverType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/**
 * Reads the type from the first bytes. The browser's `Content-Type` and the
 * filename are whatever the client chose to send. SVG is left out on purpose:
 * it is a document that can carry script, not just pixels.
 */
export function sniffCoverType(bytes: Uint8Array): CoverType | null {
  let startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte)

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp'
  }
  return null
}

export function coverExtension(type: string) {
  return extensions[type as CoverType] ?? 'bin'
}

export type ReadCoverResult = { ok: true; file: File | null } | { ok: false; error: string }

/** Checks the `cover` form value without storing anything. */
export async function readCover(value: FormDataEntryValue | null): Promise<ReadCoverResult> {
  // A file input left empty still sends a part, with no name and no bytes.
  if (!(value instanceof File) || value.size === 0) return { ok: true, file: null }

  if (value.size > maxCoverSize) {
    return { ok: false, error: 'Cover must be 2 MB or smaller' }
  }

  let bytes = new Uint8Array(await value.arrayBuffer())
  let type = sniffCoverType(bytes)
  if (!type) {
    return { ok: false, error: 'Cover must be a PNG, JPEG, or WebP image' }
  }

  // The original name stays only as metadata; the storage key is ours.
  return { ok: true, file: new File([bytes], value.name, { type }) }
}

export async function saveCover(file: File) {
  let key = `covers/${randomUUID()}`
  await coverStorage.set(key, file)
  return key
}

export async function removeCover(key: string | null | undefined) {
  if (key) await coverStorage.remove(key)
}

export function getCover(key: string) {
  return coverStorage.get(key)
}

export async function clearCoversForTest() {
  let { files } = await coverStorage.list({ prefix: 'covers/' })
  for (let { key } of files) await coverStorage.remove(key)
}
