/**
 * Stage 2: LLM translation EN → KO  →  data/quotes.ko.json
 *
 * Requires: ANTHROPIC_API_KEY env var
 * Run: npm run translate-quotes
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const IN_FILE = join(process.cwd(), 'data', 'raw-quotes.json')
const OUT_FILE = join(process.cwd(), 'data', 'quotes.ko.json')
const BATCH_SIZE = 5   // small batches → fewer JSON escaping failures

interface RawQuote {
  id: string
  en: { quote: string; title: string; author: string }
}

interface KoEntry {
  quote: string
  title: string
  author: string
}

const SYSTEM_PROMPT = `You are a professional Korean literary translator.
Translate the given English literary quotes and their metadata into Korean.

Rules:
- Preserve the literary tone and style. Avoid literal word-for-word translation.
- For works with established Korean translations, use the official Korean title
  (e.g., "Mrs Dalloway" → "댈러웨이 부인", "The Great Gatsby" → "위대한 개츠비").
- Romanize author names following 국립국어원 외래어 표기법
  (e.g., "Virginia Woolf" → "버지니아 울프", "F. Scott Fitzgerald" → "F. 스콧 피츠제럴드").
- CRITICAL: In Korean text values, use 「」 for speech/dialogue and 『』 for book titles.
  NEVER use the double-quote character " inside JSON string values — it breaks JSON parsing.
- Output ONLY valid JSON. No markdown fences. No explanation.

Output schema (replace [id] with the actual id):
{
  "[id]": { "quote": "Korean translation here", "title": "Korean title", "author": "Korean author name" }
}`

function extractJson(raw: string): string {
  const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in response')
  return stripped.slice(start, end + 1)
}

async function callLLM(client: Anthropic, input: Record<string, unknown>): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(input) }]
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function translateOne(
  client: Anthropic,
  quote: RawQuote
): Promise<KoEntry | null> {
  const input = { [quote.id]: { quote: quote.en.quote, title: quote.en.title, author: quote.en.author } }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await callLLM(client, input)
      const parsed = JSON.parse(extractJson(raw)) as Record<string, KoEntry>
      const entry = parsed[quote.id]
      if (entry) return entry
    } catch {
      if (attempt < 2) await sleep(500)
    }
  }
  return null
}

async function translateBatch(
  client: Anthropic,
  batch: RawQuote[],
  existing: Record<string, KoEntry>
): Promise<Record<string, KoEntry>> {
  const toTranslate = batch.filter((q) => !existing[q.id])
  if (toTranslate.length === 0) return {}

  const input = Object.fromEntries(
    toTranslate.map((q) => [q.id, { quote: q.en.quote, title: q.en.title, author: q.en.author }])
  )

  // Try batch first
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callLLM(client, input)
      const parsed = JSON.parse(extractJson(raw)) as Record<string, KoEntry>
      // Validate all expected keys are present
      const missing = toTranslate.filter((q) => !parsed[q.id])
      if (missing.length > 0) throw new Error(`Missing keys: ${missing.map((q) => q.id).join(', ')}`)
      return parsed
    } catch (err) {
      if (attempt === 0) await sleep(500)
    }
  }

  // Batch failed twice → fall back to one-by-one
  console.warn(`  Batch failed, retrying ${toTranslate.length} items individually...`)
  const result: Record<string, KoEntry> = {}
  for (const q of toTranslate) {
    const entry = await translateOne(client, q)
    if (entry) result[q.id] = entry
    else console.warn(`  Skipped ${q.id} after 3 individual attempts`)
    await sleep(200)
  }
  return result
}

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is required')
    process.exit(1)
  }

  const quotes: RawQuote[] = JSON.parse(readFileSync(IN_FILE, 'utf-8'))
  const existing: Record<string, KoEntry> = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, 'utf-8'))
    : {}

  const client = new Anthropic({ apiKey })
  const result: Record<string, KoEntry> = { ...existing }

  const remaining = quotes.filter((q) => !result[q.id])
  console.log(`Total: ${quotes.length} | Already done: ${Object.keys(result).length} | Remaining: ${remaining.length}`)

  let processed = Object.keys(result).length

  for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
    const batch = quotes.slice(i, i + BATCH_SIZE)
    const newEntries = await translateBatch(client, batch, result)
    Object.assign(result, newEntries)
    processed += Object.keys(newEntries).length

    const batchNew = Object.keys(newEntries).length
    const batchSkipped = batch.filter((q) => !result[q.id]).length
    if (batchNew > 0 || batchSkipped > 0) {
      console.log(`${i + batch.length}/${quotes.length} (+${batchNew}${batchSkipped > 0 ? ` skip:${batchSkipped}` : ''}) total:${processed}`)
    }

    writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf-8')
    await sleep(150)
  }

  const skipped = quotes.length - Object.keys(result).length
  console.log(`Done. Translated: ${Object.keys(result).length} | Skipped: ${skipped}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
