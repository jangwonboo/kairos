import type { Credit } from '@shared/types'
import { httpGet } from '../../net/http'
import { passesAvoidFilter } from '../query-builder'

interface PixabayHit {
  id: number
  imageWidth: number
  webformatURL: string
  largeImageURL: string
  tags: string
  user: string
  pageURL: string
}

interface PixabaySearchResult {
  hits: PixabayHit[]
}

export async function searchPixabay(
  query: string,
  apiKey: string,
  avoid: string[] | undefined,
  timeoutMs: number,
  retryCount = 2
): Promise<{ url: string; credit: Credit } | null> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    orientation: 'horizontal',
    min_width: '1920',
    per_page: '15',
    image_type: 'photo',
    safesearch: 'true'
  })

  const data = await httpGet<PixabaySearchResult>(
    `https://pixabay.com/api/?${params}`,
    {},
    timeoutMs,
    retryCount
  )

  const candidates = data.hits.filter((h) => passesAvoidFilter(h.tags, avoid))
  if (candidates.length === 0) return null

  const hit = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    url: hit.largeImageURL,
    credit: {
      provider: 'pixabay',
      photographerName: hit.user,
      photographerUrl: `https://pixabay.com/users/${hit.user}/`,
      sourceUrl: hit.pageURL
    }
  }
}
