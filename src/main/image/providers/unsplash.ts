import type { Credit } from '@shared/types'
import { httpGet } from '../../net/http'
import { passesAvoidFilter } from '../query-builder'

interface UnsplashPhoto {
  id: string
  urls: { full: string; regular: string }
  width: number
  height: number
  alt_description: string | null
  user: { name: string; links: { html: string } }
  links: { html: string }
}

interface UnsplashSearchResult {
  results: UnsplashPhoto[]
}

export async function searchUnsplash(
  query: string,
  apiKey: string,
  avoid: string[] | undefined,
  timeoutMs: number,
  retryCount = 2
): Promise<{ url: string; credit: Credit } | null> {
  const params = new URLSearchParams({
    query,
    orientation: 'landscape',
    per_page: '15'
  })

  const data = await httpGet<UnsplashSearchResult>(
    `https://api.unsplash.com/search/photos?${params}`,
    { Authorization: `Client-ID ${apiKey}` },
    timeoutMs,
    retryCount
  )

  const candidates = data.results.filter(
    (p) =>
      p.width >= 1920 &&
      passesAvoidFilter(p.alt_description, avoid)
  )

  if (candidates.length === 0) return null

  const photo = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    url: photo.urls.regular,
    credit: {
      provider: 'unsplash',
      photographerName: photo.user.name,
      photographerUrl: `${photo.user.links.html}?utm_source=kairos&utm_medium=referral`,
      sourceUrl: `${photo.links.html}?utm_source=kairos&utm_medium=referral`
    }
  }
}
