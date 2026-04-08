import { NextRequest, NextResponse } from 'next/server'
import { getSessionById, saveSession } from '@/lib/redis'

export async function POST(req: NextRequest) {
  const { sessionId, role } = await req.json()
  const s = await getSessionById(String(sessionId))
  if (!s) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  if (s.status === 'closed') return NextResponse.json({ ok: false, error: 'closed' }, { status: 410 })

  const now = Date.now()
  if (role === 'receiver') s.lastSeenReceiver = now
  if (role === 'sender') { s.lastSeenSender = now; s.senderConnected = true }

  const ttl = Number(process.env.SESSION_TTL_SECONDS || 300)
  s.lastActivityAt = now
  if (ttl > 0) s.expiresAt = now + ttl * 1000
  await saveSession(s)

  return NextResponse.json({ ok: true, expiresAt: s.expiresAt }, { headers: { 'Cache-Control': 'no-store' } })
}