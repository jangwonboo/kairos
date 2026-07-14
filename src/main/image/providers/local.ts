import { app } from 'electron'
import { join } from 'path'
import { readdirSync, existsSync } from 'fs'
import type { Credit } from '@shared/types'

let pool: string[] = []
let cursor = 0

function getPool(): string[] {
  if (pool.length > 0) return pool
  const dir = app.isPackaged
    ? join(process.resourcesPath, 'fallback-bg')
    : join(__dirname, '../../../../resources/fallback-bg')

  if (!existsSync(dir)) return []

  pool = readdirSync(dir)
    .filter((f) => /\.(webp|jpg|jpeg)$/.test(f))
    .map((f) => join(dir, f))

  return pool
}

export function getLocalFallback(): { url: string; credit: Credit } | null {
  const files = getPool()
  if (files.length === 0) return null

  const path = files[cursor % files.length]
  cursor = (cursor + 1) % files.length

  return {
    url: `asset:///${path.replace(/\\/g, '/')}`,
    credit: {
      provider: 'local',
      photographerName: '',
      photographerUrl: '',
      sourceUrl: ''
    }
  }
}
