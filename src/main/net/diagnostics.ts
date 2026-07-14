import { net } from 'electron'
import { getSettings, getDecryptedKey } from '../settings'
import type { Provider, ProviderTestResult } from '@shared/types'

const PROBE_URLS: Record<Provider, string> = {
  unsplash: 'https://api.unsplash.com/photos?per_page=1',
  pexels: 'https://api.pexels.com/v1/search?query=test&per_page=1',
  pixabay: 'https://pixabay.com/api/?q=test&per_page=3',
  wikimedia: 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*',
  local: ''
}

function classifyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err)
  if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo'))
    return 'DNS 해석 실패 — 도메인이 차단되었을 수 있습니다'
  if (msg.includes('ECONNREFUSED')) return '연결 차단 — 프록시 설정을 확인하세요'
  if (msg.includes('ETIMEDOUT') || msg.includes('abort'))
    return '연결 시간 초과 — 프록시 설정을 확인하세요'
  if (msg.includes('CERT_') || msg.includes('certificate'))
    return 'SSL 인증서 오류 — 사내 CA 인증서 등록이 필요할 수 있습니다'
  const status = (err as { status?: number })?.status
  if (status === 401 || status === 403) return 'API 키가 잘못되었습니다'
  if (status === 429) return '요청 한도 초과'
  return msg
}

async function testProvider(
  provider: Provider,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<ProviderTestResult> {
  if (provider === 'local') return { provider, ok: true }

  const url = PROBE_URLS[provider]
  const start = Date.now()
  try {
    const res = await Promise.race([
      net.fetch(url, { headers }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('ETIMEDOUT'), {})), timeoutMs)
      )
    ])
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status })
    return { provider, ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { provider, ok: false, error: classifyError(err) }
  }
}

export async function runProviderTests(): Promise<ProviderTestResult[]> {
  const settings = getSettings()
  const { timeoutMs } = settings.network

  const unsplashKey = getDecryptedKey('background.keys.unsplash') ?? ''
  const pexelsKey = getDecryptedKey('background.keys.pexels') ?? ''
  const pixabayKey = getDecryptedKey('background.keys.pixabay') ?? ''
  void pixabayKey  // key stored but test uses public endpoint

  return Promise.all([
    testProvider('unsplash', { Authorization: `Client-ID ${unsplashKey}` }, timeoutMs),
    testProvider('pexels', { Authorization: pexelsKey }, timeoutMs),
    testProvider('pixabay', {}, timeoutMs),
    testProvider('wikimedia', {}, timeoutMs),
    testProvider('local', {}, timeoutMs)
  ])
}
