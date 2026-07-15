// ─── Provider ────────────────────────────────────────────────────────────────

export type Provider = 'unsplash' | 'pexels' | 'pixabay' | 'wikimedia' | 'local'

// ─── Quote data ───────────────────────────────────────────────────────────────

export type ImageKeywords = {
  mood: string[]
  subject: string[]
  setting: 'interior' | 'exterior' | 'abstract'
  timeOfDay: 'dawn' | 'morning' | 'day' | 'dusk' | 'night' | 'any'
  palette: string[]
  query: string
  avoid?: string[]
}

export type Quote = {
  id: string            // "0723_01"
  time: string          // "07:23"
  timeString: string    // text in quote that names the time — for highlight
  sfw: boolean
  en: { quote: string; title: string; author: string }
  ko: { quote: string; title: string; author: string }
  keywords: ImageKeywords | null
}

export type QuotesFile = {
  version: string
  generatedAt: string
  quotes: Record<string, Quote[]>   // key: "HH:MM"
}

// ─── Image credit ─────────────────────────────────────────────────────────────

export type Credit = {
  provider: Provider
  photographerName: string
  photographerUrl: string    // photographer profile URL
  sourceUrl: string          // image source URL (with utm params for Unsplash)
}

// ─── Network diagnostics ──────────────────────────────────────────────────────

export type ProviderTestResult = {
  provider: Provider
  ok: boolean
  latencyMs?: number
  error?: string    // human-readable Korean error from diagnostics.ts
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  display: {
    language: 'en' | 'ko' | 'both'
    sfwOnly: boolean
    fontScale: number
    quoteFallbackWindowMin: number
    showCredit: boolean
  }
  background: {
    enabled: boolean
    providerOrder: Provider[]
    keys: { unsplash?: string; pexels?: string; pixabay?: string }
    useQuoteKeywords: boolean
    defaultQuery: string
    changeMode: 'per-quote' | 'interval' | 'fixed'
    intervalMin: 1 | 5 | 10 | 30 | 60
    cacheMaxItems: number
    cacheMaxMB: number
  }
  transition: {
    image: {
      effect: 'dim-crossfade' | 'pure-fade' | 'blur-morph' | 'slide' | 'none'
      durationMult: 0.5 | 1 | 1.5 | 2
      kenBurns: boolean
      overlayOpacity: number
    }
    text: {
      effect: 'blur-lift' | 'fade' | 'typewriter' | 'mask' | 'slide-up' | 'none'
      durationMult: 0.5 | 1 | 1.5 | 2
      stagger: boolean
    }
    reduceMotion: boolean
  }
  network: {
    proxyMode: 'system' | 'manual' | 'pac' | 'direct'
    proxyUrl?: string
    proxyBypass?: string
    proxyAuth?: { user: string; pass: string }
    pacUrl?: string
    customCaPath?: string
    ignoreCertErrors: boolean
    timeoutMs: 3000 | 5000 | 10000 | 15000
    retryCount: 0 | 1 | 2 | 3
    offlineMode: boolean
  }
  startup: {
    autoLaunch: boolean
    fullscreen: boolean
    minimizeToTray: boolean
  }
}

// ─── IPC payloads ─────────────────────────────────────────────────────────────

export type TickPayload = { time: string; quote: Quote | null }
export type BgNextPayload = { localPath: string; credit: Credit | null }
export type BgErrorPayload = { reason: string }

// Utility
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T
