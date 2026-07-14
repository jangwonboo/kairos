import { BrowserWindow } from 'electron'
import { createHash } from 'crypto'
import type { Quote, Credit, Provider } from '@shared/types'
import { getSettings, getDecryptedKey } from '../settings'
import { buildQuery } from './query-builder'
import { ImageCache } from './image-cache'
import { searchUnsplash } from './providers/unsplash'
import { searchPexels } from './providers/pexels'
import { searchPixabay } from './providers/pixabay'
import { searchWikimedia } from './providers/wikimedia'
import { getLocalFallback } from './providers/local'
import { log } from '../logger'

const cache = new ImageCache()

export async function fetchAndSendBackground(win: BrowserWindow, quote: Quote): Promise<void> {
  const settings = getSettings()
  const { network, background } = settings

  log('image', 'fetchAndSendBackground start', { quoteId: quote.id, enabled: background.enabled, offline: network.offlineMode })

  if (!background.enabled || network.offlineMode) {
    log('image', 'disabled or offline → local fallback')
    sendLocalFallback(win)
    return
  }

  const avoid = quote.keywords?.avoid
  const { query, fallbackChain } = buildQuery(
    background.useQuoteKeywords ? quote.keywords : null,
    background.defaultQuery
  )
  log('image', 'query built', { query, fallbackChain })

  for (const q of [query, ...fallbackChain]) {
    if (!q) continue
    log('image', 'trying providers with query', { q, order: background.providerOrder })
    const result = await tryProviders(q, avoid, background.providerOrder, network.timeoutMs, network.retryCount)
    if (result) {
      try {
        let localPath: string
        if (result.url.startsWith('asset:///')) {
          localPath = result.url
        } else {
          const m = result.url.match(/\.(png|webp)(\?|$)/)
          const ext = m ? m[1] : 'jpg'
          const filename = createHash('md5').update(result.url).digest('hex') + '.' + ext
          const diskPath = await cache.download(result.url, filename)
          localPath = `asset:///${diskPath.replace(/\\/g, '/')}`
        }
        log('image', 'bg:next sent', { localPath: localPath.slice(0, 80) })
        cache.markUsed(localPath)
        win.webContents.send('bg:next', { localPath, credit: result.credit })
        return
      } catch (err) {
        log('image', 'download failed', { error: String(err) })
      }
    }
  }

  log('image', 'all providers/queries failed → local fallback')
  sendLocalFallback(win)
}

async function tryProviders(
  query: string,
  avoid: string[] | undefined,
  order: Provider[],
  timeoutMs: number,
  retryCount: number
): Promise<{ url: string; credit: Credit } | null> {
  for (const provider of order) {
    try {
      let result: { url: string; credit: Credit } | null = null

      switch (provider) {
        case 'unsplash': {
          const key = getDecryptedKey('background.keys.unsplash')
          if (key) result = await searchUnsplash(query, key, avoid, timeoutMs, retryCount)
          break
        }
        case 'pexels': {
          const key = getDecryptedKey('background.keys.pexels')
          if (key) result = await searchPexels(query, key, avoid, timeoutMs, retryCount)
          break
        }
        case 'pixabay': {
          const key = getDecryptedKey('background.keys.pixabay')
          if (key) result = await searchPixabay(query, key, avoid, timeoutMs, retryCount)
          break
        }
        case 'wikimedia':
          result = await searchWikimedia(query, timeoutMs, retryCount)
          break
        case 'local':
          result = getLocalFallback()
          break
      }

      if (result) {
        log('image', `provider ${provider} returned result`, { url: result.url.slice(0, 80) })
        return result
      }
      log('image', `provider ${provider} returned null (no results)`)
    } catch (err) {
      log('image', `provider ${provider} threw`, { error: String(err) })
    }
  }
  return null
}

function sendLocalFallback(win: BrowserWindow): void {
  const result = getLocalFallback()
  if (result) {
    win.webContents.send('bg:next', { localPath: result.url, credit: null })
  } else {
    win.webContents.send('bg:error', { reason: '로컬 배경 이미지를 찾을 수 없습니다' })
  }
}
