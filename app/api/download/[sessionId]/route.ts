import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionById, saveSession } from '@/lib/redis'
import { deleteFromBlob } from '@/lib/blob'

const DOWNLOAD_NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const s = await getSessionById(sessionId)
  if (!s) return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 })

  const token = req.nextUrl.searchParams.get('receiverToken') || ''
  if (token !== s.receiverToken) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  if (!s.file?.blobUrl) return NextResponse.json({ ok: false, error: 'No file' }, { status: 404 })

  const { blobUrl, name, type } = s.file
  const ascii = name.replace(/[^\x20-\x7E]+/g, '_')
  const disposition = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`

  const finalizeDownload = async () => {
    const now = Date.now()
    s.file = null
    s.status = s.senderConnected ? 'connected' : 'waiting'
    s.closedBy = null
    s.closedAt = null
    s.lastActivityAt = now
    await saveSession(s)
    await deleteFromBlob(blobUrl)
  }

  if (blobUrl.startsWith('local://')) {
    const filePath = blobUrl.replace('local://', '')
    const fileBuffer = await fs.readFile(filePath)

    await finalizeDownload()

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': type || 'application/octet-stream',
        'Content-Disposition': disposition,
        ...DOWNLOAD_NO_CACHE_HEADERS,
      },
    })
  }

  const fileRes = await fetch(blobUrl)
  if (!fileRes.ok) return NextResponse.json({ ok: false, error: 'File fetch failed' }, { status: 502 })
  const fileBuffer = Buffer.from(await fileRes.arrayBuffer())

  await finalizeDownload()

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': type || 'application/octet-stream',
      'Content-Disposition': disposition,
      ...DOWNLOAD_NO_CACHE_HEADERS,
    },
  })
}
