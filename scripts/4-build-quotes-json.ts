/**
 * Stage 4: Merge raw + ko + keywords → resources/quotes.json
 *
 * Inputs:
 *   data/raw-quotes.json
 *   data/quotes.ko.json
 *   data/quotes.keywords.json
 *
 * Output:
 *   resources/quotes.json
 *
 * Run: npm run build-quotes-json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import type { Quote, QuotesFile, ImageKeywords } from '../src/shared/types'

const DATA_DIR = join(process.cwd(), 'data')
const OUT_FILE = join(process.cwd(), 'resources', 'quotes.json')

interface RawQuote {
  id: string
  time: string
  timeString: string
  sfw: boolean
  en: { quote: string; title: string; author: string }
}

function load<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf-8')) as T
}

function loadOptional<T>(file: string, fallback: T): T {
  if (!existsSync(file)) {
    console.log(`Optional file not found, skipping: ${file}`)
    return fallback
  }
  return load<T>(file)
}

function main(): void {
  const raw = load<RawQuote[]>(join(DATA_DIR, 'raw-quotes.json'))
  const koMap = loadOptional<Record<string, { quote: string; title: string; author: string }>>(
    join(DATA_DIR, 'quotes.ko.json'),
    {}
  )
  const kwMap = loadOptional<Record<string, ImageKeywords | null>>(
    join(DATA_DIR, 'quotes.keywords.json'),
    {}
  )

  const quotesByTime: Record<string, Quote[]> = {}
  let missingKo = 0
  let missingKw = 0

  for (const r of raw) {
    const ko = koMap[r.id]
    if (!ko) {
      missingKo++
      // fallback: use EN
    }
    const kw = kwMap[r.id] ?? null
    if (kw === undefined) missingKw++

    const quote: Quote = {
      id: r.id,
      time: r.time,
      timeString: r.timeString,
      sfw: r.sfw,
      en: r.en,
      ko: ko ?? r.en,
      keywords: kw
    }

    if (!quotesByTime[r.time]) quotesByTime[r.time] = []
    quotesByTime[r.time].push(quote)
  }

  const total = raw.length
  const covered = Object.keys(quotesByTime).length

  console.log(`Total quotes: ${total}`)
  console.log(`Minutes covered: ${covered}/1440`)
  console.log(`Missing KO translations: ${missingKo}`)
  console.log(`Missing keywords: ${missingKw}`)

  const outDir = join(process.cwd(), 'resources')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const output: QuotesFile = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    quotes: quotesByTime
  }

  writeFileSync(OUT_FILE, JSON.stringify(output), 'utf-8')
  console.log(`Written ${OUT_FILE} (${(JSON.stringify(output).length / 1024 / 1024).toFixed(1)} MB)`)
}

main()
