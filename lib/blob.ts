import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { del, put } from '@vercel/blob'

const TMP = path.join(os.tmpdir(), 'sendbook-local')
const useVercelBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export const MAX_BYTES = Number(process.env.MAX_FILE_MB || 100) * 1024 * 1024

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_')
}

export async function uploadToBlob(sessionId: string, file: File): Promise<string> {
  if (useVercelBlob) {
    const key = `sessions/${sessionId}/${Date.now()}-${sanitizeFilename(file.name)}`
    const { url } = await put(key, file, {
      access: 'public',
      addRandomSuffix: false,
    })
    return url
  }

  const dir = path.join(TMP, sessionId)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, sanitizeFilename(file.name))
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)
  return `local://${filePath}`
}

export async function deleteFromBlob(url: string) {
  try {
    if (url.startsWith('local://')) {
      const filePath = url.replace('local://', '')
      await fs.unlink(filePath)
      return
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await del(url)
    }
  } catch {}
}
