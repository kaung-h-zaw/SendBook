import { NextRequest, NextResponse } from 'next/server'
import { getSessionById, saveSession } from '@/lib/redis'
import { deleteFromBlob } from '@/lib/blob'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const s = await getSessionById(id)
  if (!s) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

  const now = Date.now()
  const ttlClosed = s.expiresAt !== null && s.expiresAt <= now
  const graceMs = Number(process.env.HEARTBEAT_GRACE_MS || 15000)
  let changed = false

  if (s.senderConnected && s.lastSeenSender > 0 && now - s.lastSeenSender > graceMs) {
    s.senderConnected = false
    changed = true
  }

  if (s.status !== 'closed' && s.lastSeenReceiver > 0 && now - s.lastSeenReceiver > graceMs) {
    s.status = 'closed'
    s.closedBy = 'receiver_gone'
    s.closedAt = now
    s.senderConnected = false
    changed = true
  }

  if (s.status !== 'closed' && ttlClosed) {
    s.status = 'closed'
    s.closedBy = 'ttl'
    s.closedAt = now
    changed = true
  }

  if (changed) {
    if (s.file?.blobUrl) {
      await deleteFromBlob(s.file.blobUrl)
      s.file = null
    }
    s.lastActivityAt = now
    await saveSession(s)
  }

  const closed = s.status === 'closed'

  return NextResponse.json({
    ok: true,
    closed,
    closedBy: s.closedBy,
    status: s.status,
    hasFile: Boolean(s.file),
    file: s.file
      ? { name: s.file.name, size: s.file.size, type: s.file.type, uploadedAt: s.file.uploadedAt }
      : null,
    expiresAt: s.expiresAt,
    secondsLeft: s.expiresAt ? Math.max(0, Math.floor((s.expiresAt - now) / 1000)) : null,
    senderConnected: s.senderConnected,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
