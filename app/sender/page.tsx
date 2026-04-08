import { redirect } from 'next/navigation'

export default async function SenderPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; t?: string }>
}) {
  const sp = await searchParams
  const sid = sp.sessionId || ''
  const t = sp.t || ''
  const qs = new URLSearchParams()
  if (sid) qs.set('sessionId', sid)
  if (t) qs.set('t', t)
  const q = qs.toString()
  redirect(q ? `/sender.html?${q}` : '/sender.html')
}
