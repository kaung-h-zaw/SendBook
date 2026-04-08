import { redirect } from 'next/navigation'

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const raw = await searchParams
  const params = new URLSearchParams()

  Object.keys(raw).forEach((key) => {
    const value = raw[key]
    if (typeof value === 'string') {
      params.set(key, value)
      return
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        params.append(key, value[i])
      }
    }
  })

  const qs = params.toString()
  redirect(qs ? `/index.html?${qs}` : '/index.html')
}
