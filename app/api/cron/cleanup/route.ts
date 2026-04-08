import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import type { Session } from '@/lib/redis'
import { deleteFromBlob } from '@/lib/blob'

export async function GET() {
  let deleted = 0
  let cursor = 0
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: 'session:id:*',
      count: 100,
    })
    cursor = Number(nextCursor)

    for (const key of keys) {
      const s = await redis.get<Session>(key)
      if (!s) continue

      const now = Date.now()
      const expired = s.expiresAt !== null && s.expiresAt <= now
      const isClosed = s.status === 'closed'

      if (expired || isClosed) {
        if (s.file?.blobUrl) await deleteFromBlob(s.file.blobUrl)

        await redis.del(`session:id:${s.id}`)
        await redis.del(`session:code:${s.code}`)
        deleted++
      }
    }
  } while (cursor !== 0)

  return NextResponse.json({ ok: true, deleted })
}