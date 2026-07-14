import type { ImageKeywords } from '@shared/types'

export function buildQuery(
  keywords: ImageKeywords | null,
  defaultQuery: string
): { query: string; fallbackChain: string[] } {
  if (!keywords) {
    return { query: defaultQuery, fallbackChain: [] }
  }

  const full = keywords.query
  const mid = `${keywords.subject[0] ?? ''} ${keywords.mood[0] ?? ''}`.trim()
  const minimal = `${keywords.mood[0] ?? ''} ${keywords.setting}`.trim()

  return {
    query: full,
    fallbackChain: [mid, minimal, defaultQuery]
  }
}

export function passesAvoidFilter(
  description: string | null | undefined,
  avoid: string[] | undefined
): boolean {
  if (!avoid || avoid.length === 0) return true
  if (!description) return true
  const lower = description.toLowerCase()
  return !avoid.some((word) => lower.includes(word.toLowerCase()))
}
