import { NextRequest, NextResponse } from 'next/server'
import { getSessionByCode, getSessionById, saveSession } from '@/lib/redis'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, sessionId } = body || {}
  const normalizedCode = code ? String(code).toUpperCase().trim() : ''

  let s = normalizedCode ? await getSessionByCode(normalizedCode) : null
  if (!s && sessionId) s = await getSessionById(String(sessionId))
  if (!s) return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 })

  if (s.status === 'closed' || (s.expiresAt && s.expiresAt <= Date.now())) {
    return NextResponse.json({ ok: false, error: 'Expired/closed' }, { status: 410 })
  }

  s.senderConnected = true
  s.lastSeenSender = Date.now()
  s.status = 'connected'
  s.lastActivityAt = Date.now()
  await saveSession(s)

  return NextResponse.json({
    ok: true,
    sessionId: s.id,
    senderToken: s.senderToken,
    expiresAt: s.expiresAt,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
