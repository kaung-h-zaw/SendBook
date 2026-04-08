import { NextRequest, NextResponse } from 'next/server'
import { getSessionById, saveSession } from '@/lib/redis'
import { uploadToBlob, deleteFromBlob, MAX_BYTES } from '@/lib/blob'
import path from 'path'

const ALLOWED = new Set(['.epub', '.mobi', '.azw', '.azw3', '.pdf', '.txt'])

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sessionId = searchParams.get('sessionId') || ''
  const senderToken = searchParams.get('senderToken') || ''

  const s = await getSessionById(sessionId)
  if (!s) return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 })
  if (senderToken !== s.senderToken) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (s.status === 'closed' || (s.expiresAt && s.expiresAt <= Date.now())) {
    return NextResponse.json({ ok: false, error: 'Expired/closed session' }, { status: 410 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 })

  const ext = (path.extname(file.name) || '').toLowerCase()
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ ok: false, error: 'Only .epub .mobi .azw .azw3 .pdf .txt are allowed' }, { status: 415 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: `Max ${process.env.MAX_FILE_MB}MB` }, { status: 413 })
  }

  if (s.file?.blobUrl) await deleteFromBlob(s.file.blobUrl)

  let blobUrl = ''
  try {
    blobUrl = await uploadToBlob(sessionId, file)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'blob_upload_failed'
    const isAccessDenied = /access denied|valid token/i.test(msg)
    return NextResponse.json(
      {
        ok: false,
        error: isAccessDenied
          ? 'Blob token invalid or not authorized for this store'
          : 'Upload storage error',
      },
      { status: isAccessDenied ? 503 : 500 }
    )
  }

  s.file = { name: file.name, size: file.size, type: file.type, blobUrl, uploadedAt: Date.now() }
  s.lastActivityAt = Date.now()
  await saveSession(s)

  return NextResponse.json({
    ok: true,
    file: { name: file.name, size: file.size, type: file.type },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
