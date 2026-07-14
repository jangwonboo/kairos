/**
 * Stage 1: Fetch and normalize ligurio/litclock CSV → data/raw-quotes.json
 *
 * Source: https://github.com/ligurio/litclock
 * File:   litclock_annotated.csv
 * Format: time|time_string|quote|title|author|sfw
 *
 * Run: npm run fetch-quotes
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { get as httpsGet } from 'https'
import { IncomingMessage } from 'http'
import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'

const CSV_URL =
  'https://raw.githubusercontent.com/ligurio/litclock/master/quotes/quotes_en.csv'
const OUT_DIR = join(process.cwd(), 'data')
const OUT_FILE = join(OUT_DIR, 'raw-quotes.json')
const TMP_CSV = join(OUT_DIR, 'quotes_en.csv')

interface RawQuote {
  id: string
  time: string
  timeString: string
  sfw: boolean
  en: { quote: string; title: string; author: string }
}

async function downloadCsv(): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  console.log('Downloading CSV from ligurio/litclock...')
  await new Promise<void>((resolve, reject) => {
    httpsGet(CSV_URL, (res: IncomingMessage) => {
      pipeline(res as unknown as NodeJS.ReadableStream, createWriteStream(TMP_CSV))
        .then(resolve)
        .catch(reject)
    }).on('error', reject)
  })
  console.log(`Saved to ${TMP_CSV}`)
}

function parseCsv(): RawQuote[] {
  const content = readFileSync(TMP_CSV, 'utf-8')

  // quotes_en.csv has NO header row — data starts on line 1
  // Columns: time|time_string|quote|title|author|sfw
  const firstLine = content.split('\n')[0]
  console.log('First data row:', firstLine.slice(0, 120))

  // quoteChar set to non-printing char to disable PapaParse's quote handling.
  // Literary quotes contain " characters that break standard CSV quote parsing.
  const result = Papa.parse<string[]>(content, {
    delimiter: '|',
    quoteChar: '\x00',
    skipEmptyLines: true
  })

  if (result.errors.length > 0) {
    console.warn('Parse warnings:', result.errors.slice(0, 5))
  }

  const rows = result.data

  // Sanity check: each row must have exactly 6 pipe-delimited fields
  const EXPECTED_COLS = 6
  const badRows = rows.filter((r) => r.length !== EXPECTED_COLS)
  if (badRows.length > 0) {
    console.warn(`${badRows.length} rows with unexpected column count (showing first 3):`)
    badRows.slice(0, 3).forEach((r) => console.warn(' ', r))
  }

  const timeCount = new Map<string, number>()
  const quotes: RawQuote[] = []

  for (const row of rows) {
    const [time, timeString, quote, title, author, sfwRaw] = row.map((c) => c.trim())
    if (!time || !quote) continue

    const count = (timeCount.get(time) ?? 0) + 1
    timeCount.set(time, count)

    const mm = time.replace(':', '')
    quotes.push({
      id: `${mm}_${String(count).padStart(2, '0')}`,
      time,
      timeString: timeString ?? '',
      sfw: sfwRaw?.toLowerCase() !== 'nsfw',
      en: {
        quote: quote,
        title: title ?? '',
        author: author ?? ''
      }
    })
  }

  return quotes
}

async function main(): Promise<void> {
  await downloadCsv()
  const quotes = parseCsv()
  console.log(`Parsed ${quotes.length} quotes`)

  const timesWithQuotes = new Set(quotes.map((q) => q.time)).size
  console.log(`Covers ${timesWithQuotes}/1440 minutes`)

  writeFileSync(OUT_FILE, JSON.stringify(quotes, null, 2), 'utf-8')
  console.log(`Written to ${OUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
