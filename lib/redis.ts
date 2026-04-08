import { Redis } from '@upstash/redis'

export const redis = Redis.fromEnv()

export type Session = {
  id: string
  code: string
  receiverToken: string
  senderToken: string
  status: 'waiting' | 'connected' | 'closed'
  closedBy: string | null
  closedAt: number | null
  file?: { name: string; size: number; type: string; blobUrl: string; uploadedAt: number } | null
  createdAt: number
  lastActivityAt: number
  expiresAt: number | null
  lastSeenReceiver: number
  lastSeenSender: number
  senderConnected: boolean
}

const TTL = () => Number(process.env.SESSION_TTL_SECONDS || 300)

export async function saveSession(s: Session) {
  const ttl = TTL()
  await redis.set(`session:id:${s.id}`, s, { ex: ttl + 120 })
  await redis.set(`session:code:${s.code}`, s.id, { ex: ttl + 120 })
}

export async function getSessionById(id: string): Promise<Session | null> {
  return redis.get<Session>(`session:id:${id}`)
}

export async function getSessionByCode(code: string): Promise<Session | null> {
  const id = await redis.get<string>(`session:code:${code}`)
  if (!id) return null
  return getSessionById(id)
}

export async function deleteSession(s: Session) {
  await redis.del(`session:id:${s.id}`)
  await redis.del(`session:code:${s.code}`)
}