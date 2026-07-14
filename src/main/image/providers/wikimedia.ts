import type { Credit } from '@shared/types'
import { httpGet } from '../../net/http'

interface WikimediaPage {
  title: string
  imageinfo?: Array<{
    url: string
    thumburl?: string
    width: number
    descriptionurl: string
    extmetadata?: { Artist?: { value: string } }
  }>
}

interface WikimediaSearchResult {
  query: {
    search: Array<{ title: string }>
  }
}

interface WikimediaImageInfo {
  query: {
    pages: Record<string, WikimediaPage>
  }
}

export async function searchWikimedia(
  query: string,
  timeoutMs: number,
  retryCount = 2
): Promise<{ url: string; credit: Credit } | null> {
  const searchParams = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `${query} filetype:bitmap`,
    srnamespace: '6',
    srlimit: '10',
    format: 'json',
    origin: '*'
  })

  const searchData = await httpGet<WikimediaSearchResult>(
    `https://commons.wikimedia.org/w/api.php?${searchParams}`,
    {},
    timeoutMs,
    retryCount
  )

  const titles = searchData.query.search.map((r) => r.title)
  if (titles.length === 0) return null

  const title = titles[Math.floor(Math.random() * titles.length)]

  const infoParams = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1920',
    format: 'json',
    origin: '*'
  })

  const infoData = await httpGet<WikimediaImageInfo>(
    `https://commons.wikimedia.org/w/api.php?${infoParams}`,
    {},
    timeoutMs,
    retryCount
  )

  const pages = Object.values(infoData.query.pages)
  const page = pages[0]
  const info = page?.imageinfo?.[0]
  if (!info || info.width < 1280) return null

  const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? 'Unknown'

  return {
    url: info.thumburl ?? info.url,
    credit: {
      provider: 'wikimedia',
      photographerName: artist,
      photographerUrl: info.descriptionurl,
      sourceUrl: info.descriptionurl
    }
  }
}
