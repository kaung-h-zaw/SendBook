import { redirect } from 'next/navigation'

export default async function ReceiverPage({
  searchParams,
}: {
  searchParams: Promise<{ sid?: string; rt?: string }>
}) {
  const sp = await searchParams
  const sid = sp.sid || ''
  const rt = sp.rt || ''
  const qs = new URLSearchParams()
  if (sid) qs.set('sid', sid)
  if (rt) qs.set('rt', rt)
  const q = qs.toString()
  redirect(q ? `/receiver.html?${q}` : '/receiver.html')
}
