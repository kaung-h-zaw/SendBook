import { NextRequest, NextResponse } from 'next/server'
import { getSessionById, saveSession } from '@/lib/redis'
import { deleteFromBlob as blobDelete } from '@/lib/blob'

export async function POST(req: NextRequest) {
  const { sessionId, by = 'sender' } = await req.json()
  const s = await getSessionById(String(sessionId))
  if (!s) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })

  if (s.file?.blobUrl) await blobDelete(s.file.blobUrl)

  const now = Date.now()
  s.file = null
  s.status = 'closed'
  s.closedBy = by
  s.closedAt = now
  s.senderConnected = false
  s.lastActivityAt = now
  await saveSession(s)

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
