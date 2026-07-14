import type { Credit } from '@shared/types'
import { httpGet } from '../../net/http'
import { passesAvoidFilter } from '../query-builder'

interface PexelsPhoto {
  id: number
  width: number
  height: number
  src: { original: string; large2x: string }
  alt: string
  photographer: string
  photographer_url: string
  url: string
}

interface PexelsSearchResult {
  photos: PexelsPhoto[]
}

export async function searchPexels(
  query: string,
  apiKey: string,
  avoid: string[] | undefined,
  timeoutMs: number,
  retryCount = 2
): Promise<{ url: string; credit: Credit } | null> {
  const params = new URLSearchParams({
    query,
    orientation: 'landscape',
    size: 'large',
    per_page: '15'
  })

  const data = await httpGet<PexelsSearchResult>(
    `https://api.pexels.com/v1/search?${params}`,
    { Authorization: apiKey },
    timeoutMs,
    retryCount
  )

  const candidates = data.photos.filter(
    (p) => p.width >= 1920 && passesAvoidFilter(p.alt, avoid)
  )

  if (candidates.length === 0) return null

  const photo = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    url: photo.src.large2x,
    credit: {
      provider: 'pexels',
      photographerName: photo.photographer,
      photographerUrl: photo.photographer_url,
      sourceUrl: photo.url
    }
  }
}
