import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import crypto from 'crypto'
import { saveSession, getSessionByCode } from '@/lib/redis'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genCode = customAlphabet(CODE_ALPHABET, 4)

export async function GET() {
  const ttl = Number(process.env.SESSION_TTL_SECONDS || 300)
  const now = Date.now()
  const id = crypto.randomUUID()

  let code = genCode()
  while (await getSessionByCode(code)) code = genCode()

  const s = {
    id,
    code,
    receiverToken: crypto.randomUUID(),
    senderToken: crypto.randomUUID(),
    status: 'waiting' as const,
    closedBy: null,
    closedAt: null,
    file: null,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: ttl > 0 ? now + ttl * 1000 : null,
    lastSeenReceiver: now,
    lastSeenSender: 0,
    senderConnected: false,
  }

  await saveSession(s)

  const base = (process.env.FORCE_QR_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const joinUrl = `${base}/api/join?sessionId=${encodeURIComponent(s.id)}&t=${encodeURIComponent(s.senderToken)}`

  return NextResponse.json({
    ok: true,
    sessionId: s.id,
    code: s.code,
    receiverToken: s.receiverToken,
    joinUrl,
    expiresAt: s.expiresAt,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
