/**
 * Stage 3: LLM keyword extraction → data/quotes.keywords.json
 *
 * Requires: ANTHROPIC_API_KEY env var
 * Run: npm run extract-keywords
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const IN_FILE = join(process.cwd(), 'data', 'raw-quotes.json')
const OUT_FILE = join(process.cwd(), 'data', 'quotes.keywords.json')
const BATCH_SIZE = 50

const MOOD_ENUM = [
  'melancholic', 'tense', 'serene', 'joyful', 'mysterious', 'nostalgic',
  'ominous', 'romantic', 'absurd', 'contemplative', 'urgent', 'desolate'
] as const

interface RawQuote {
  id: string
  en: { quote: string; title: string; author: string }
}

interface ImageKeywords {
  mood: string[]
  subject: string[]
  setting: 'interior' | 'exterior' | 'abstract'
  timeOfDay: 'dawn' | 'morning' | 'day' | 'dusk' | 'night' | 'any'
  palette: string[]
  query: string
  avoid?: string[]
}

const SYSTEM_PROMPT = `You are an art director choosing background images for literary quotes displayed on a clock app.

Given literary quotes, produce image search keywords that capture the emotional atmosphere.

Rules:
- Output ONLY valid JSON. No prose.
- Prefer atmospheric, non-literal imagery. Avoid depicting people's faces.
- Keywords must be searchable on Unsplash/Pexels stock photo sites.
- Avoid proper nouns, character names, and brand names.
- If the quote is dark/violent, choose a somber but safe-for-work visual metaphor.

mood enum: ${MOOD_ENUM.join(' | ')}

Output schema (one entry per input id):
{
  "[id]": {
    "mood": ["melancholic", "quiet"],
    "subject": ["empty train platform", "rain on window"],
    "setting": "interior",
    "timeOfDay": "dusk",
    "palette": ["muted blue", "warm amber"],
    "query": "empty train platform at dusk, muted blue, melancholic",
    "avoid": ["crowd", "bright neon"]
  },
  ...
}`

async function extractBatch(
  client: Anthropic,
  batch: RawQuote[],
  existing: Record<string, ImageKeywords | null>
): Promise<Record<string, ImageKeywords | null>> {
  const toProcess = batch.filter((q) => !(q.id in existing))
  if (toProcess.length === 0) return {}

  const input = Object.fromEntries(
    toProcess.map((q) => [
      q.id,
      { quote: q.en.quote, title: q.en.title, author: q.en.author }
    ])
  )

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(input, null, 2) }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text) as Record<string, ImageKeywords>

    // Fill null for any missing
    const result: Record<string, ImageKeywords | null> = {}
    for (const q of toProcess) {
      result[q.id] = parsed[q.id] ?? null
    }
    return result
  } catch (err) {
    console.warn('Batch failed, marking as null:', err)
    return Object.fromEntries(toProcess.map((q) => [q.id, null]))
  }
}

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is required')
    process.exit(1)
  }

  const quotes: RawQuote[] = JSON.parse(readFileSync(IN_FILE, 'utf-8'))
  const existing: Record<string, ImageKeywords | null> = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, 'utf-8'))
    : {}

  const client = new Anthropic({ apiKey })
  const result: Record<string, ImageKeywords | null> = { ...existing }

  let processed = 0
  const total = quotes.length

  for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
    const batch = quotes.slice(i, i + BATCH_SIZE)
    const newEntries = await extractBatch(client, batch, result)
    Object.assign(result, newEntries)
    processed += batch.length

    const newCount = Object.keys(newEntries).length
    const nullCount = Object.values(newEntries).filter((v) => v === null).length
    console.log(`${processed}/${total} (+${newCount} new, ${nullCount} failed)`)

    writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf-8')

    if (i + BATCH_SIZE < quotes.length) await sleep(300)
  }

  const nullTotal = Object.values(result).filter((v) => v === null).length
  console.log(`Done. Total: ${Object.keys(result).length}, null: ${nullTotal}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
