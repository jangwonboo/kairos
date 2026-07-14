import { readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Quote, QuotesFile } from '@shared/types'

let quoteMap: Map<string, Quote[]> | null = null

function load(): Map<string, Quote[]> {
  const filePath = app.isPackaged
    ? join(process.resourcesPath, 'quotes.json')
    : join(__dirname, '../../resources/quotes.json')

  const raw: QuotesFile = JSON.parse(readFileSync(filePath, 'utf-8'))
  const map = new Map<string, Quote[]>()
  for (const [time, quotes] of Object.entries(raw.quotes)) {
    map.set(time, quotes)
  }
  return map
}

function getMap(): Map<string, Quote[]> {
  if (!quoteMap) quoteMap = load()
  return quoteMap
}

export function getQuote(time: string, sfwOnly: boolean, fallbackWindowMin: number): Quote | null {
  const map = getMap()

  // exact match
  const exact = map.get(time)
  if (exact) return pickRandom(exact, sfwOnly)

  // ±fallbackWindowMin
  const [hh, mm] = time.split(':').map(Number)
  const base = hh * 60 + mm
  let best: Quote[] | null = null
  let bestDist = Infinity

  for (let delta = 1; delta <= fallbackWindowMin; delta++) {
    for (const sign of [-1, 1]) {
      const candidate = ((base + sign * delta) % 1440 + 1440) % 1440
      const key = `${String(Math.floor(candidate / 60)).padStart(2, '0')}:${String(candidate % 60).padStart(2, '0')}`
      const quotes = map.get(key)
      if (quotes && delta < bestDist) {
        best = quotes
        bestDist = delta
      }
    }
  }

  return best ? pickRandom(best, sfwOnly) : null
}

function pickRandom(quotes: Quote[], sfwOnly: boolean): Quote | null {
  const pool = sfwOnly ? quotes.filter((q) => q.sfw) : quotes
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
