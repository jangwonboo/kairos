import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Settings } from '@shared/types'
import { log } from './logger'

// Load .env in dev (no-op if file missing or already set)
try {
  const envPath = join(process.cwd(), '.env')
  if (existsSync(envPath)) (process as NodeJS.Process & { loadEnvFile?: (p: string) => void }).loadEnvFile?.(envPath)
} catch { /* ignore */ }

const DEFAULTS: Settings = {
  display: {
    language: 'both',
    sfwOnly: true,
    fontScale: 1.0,
    theme: 'auto',
    quoteFallbackWindowMin: 3,
    showCredit: true
  },
  background: {
    enabled: true,
    providerOrder: ['unsplash', 'pexels', 'pixabay', 'wikimedia', 'local'],
    keys: {},
    useQuoteKeywords: true,
    defaultQuery: 'minimal, moody, atmospheric',
    changeMode: 'interval',
    intervalMin: 10,
    cacheMaxItems: 60,
    cacheMaxMB: 250
  },
  transition: {
    image: {
      effect: 'dim-crossfade',
      durationMult: 1,
      kenBurns: false,
      overlayOpacity: 0.35
    },
    text: {
      effect: 'blur-lift',
      durationMult: 1,
      stagger: true
    },
    reduceMotion: false
  },
  network: {
    proxyMode: 'system',
    ignoreCertErrors: false,
    timeoutMs: 5000,
    retryCount: 2,
    offlineMode: false
  },
  startup: {
    autoLaunch: false,
    fullscreen: false,
    minimizeToTray: true
  }
}

function getSettingsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = deepMerge(base[key] as object, val as object) as T[keyof T]
    } else if (val !== undefined) {
      result[key] = val as T[keyof T]
    }
  }
  return result
}

let cache: Settings | null = null

export function getSettings(): Settings {
  if (cache) return cache
  const path = getSettingsPath()
  if (!existsSync(path)) {
    cache = DEFAULTS
    return cache
  }
  try {
    const saved = JSON.parse(readFileSync(path, 'utf-8')) as Partial<Settings>
    cache = deepMerge(DEFAULTS, saved)
  } catch {
    cache = DEFAULTS
  }
  return cache
}

export function patchSettings(patch: Partial<Settings>): Settings {
  const current = getSettings()
  cache = deepMerge(current, patch)
  writeFileSync(getSettingsPath(), JSON.stringify(cache, null, 2), 'utf-8')
  return cache
}

// safeStorage helpers
export function setEncryptedKey(path: string, value: string): void {
  const settings = getSettings()
  const encPath = getSettingsPath().replace('settings.json', `enc_${path.replace(/\./g, '_')}.bin`)
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(encPath, safeStorage.encryptString(value))
  } else {
    // fallback: store in settings (not ideal, but works without OS keychain)
    patchSettings({ background: { ...settings.background, keys: { ...settings.background.keys, [path.split('.').pop()!]: value } } })
  }
}

const ENV_VAR_MAP: Record<string, string> = {
  'background.keys.unsplash': 'UNSPLASH_API_KEY',
  'background.keys.pexels':   'PEXELS_API_KEY',
  'background.keys.pixabay':  'PIXABAY_API_KEY',
}

export function getDecryptedKey(dotPath: string): string | undefined {
  // 1. safeStorage encrypted file
  const encPath = getSettingsPath().replace('settings.json', `enc_${dotPath.replace(/\./g, '_')}.bin`)
  if (existsSync(encPath) && safeStorage.isEncryptionAvailable()) {
    try {
      const val = safeStorage.decryptString(readFileSync(encPath))
      log('settings', `key ${dotPath} found via safeStorage`)
      return val
    } catch { /* fall through */ }
  }

  // 2. settings.json keys object (entered via settings UI)
  const keys = getSettings().background.keys
  const leaf = dotPath.split('.').pop() as keyof typeof keys
  const fromSettings = keys[leaf]
  if (fromSettings) {
    log('settings', `key ${dotPath} found via settings.json`)
    return fromSettings
  }

  // 3. environment variable (.env / system env)
  const envVar = ENV_VAR_MAP[dotPath]
  const fromEnv = envVar ? process.env[envVar]?.trim() : undefined
  log('settings', `key ${dotPath} env var ${envVar}=${fromEnv ? '(set)' : '(empty)'}`)
  return fromEnv || undefined
}
