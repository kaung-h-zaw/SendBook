import { NextRequest, NextResponse } from 'next/server'
import { getSessionById } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('sessionId') || ''
  const tok = req.nextUrl.searchParams.get('t') || ''

  const s = await getSessionById(sid)
  if (!s) return new NextResponse('Session not found', { status: 404 })
  if (tok !== s.senderToken) return new NextResponse('Unauthorized', { status: 401 })

  const forced = (process.env.FORCE_QR_ORIGIN || '').trim().replace(/\/+$/, '')
  const base = forced || req.nextUrl.origin
  const url = new URL('/sender', base)
  url.searchParams.set('sessionId', s.id)
  url.searchParams.set('t', tok)
  return NextResponse.redirect(url, 302)
}
