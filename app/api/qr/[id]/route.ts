import { NextRequest, NextResponse } from 'next/server'
import { getSessionById } from '@/lib/redis'
import QRCode from 'qrcode'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params

  const sessionId = id.replace(/\.png$/i, '')

  const s = await getSessionById(sessionId)
  if (!s) return new NextResponse(null, { status: 404 })

  const forced = (process.env.FORCE_QR_ORIGIN || '').trim().replace(/\/+$/, '')
  const base = forced || req.nextUrl.origin || 'http://localhost:3000'

  const joinUrl = `${base}/api/join?sessionId=${encodeURIComponent(s.id)}&t=${encodeURIComponent(s.senderToken)}`
  
  const pngBuffer = await QRCode.toBuffer(joinUrl, {
    type: 'png',
    width: 300,
    margin: 2,
  })
  const pngBytes = new Uint8Array(pngBuffer)

  return new NextResponse(pngBytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
