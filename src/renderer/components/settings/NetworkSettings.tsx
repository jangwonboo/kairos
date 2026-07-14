import { useState } from 'react'
import type { Settings, ProviderTestResult } from '@shared/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
}

export function NetworkSettings({ settings, onSave }: Props): JSX.Element {
  const { network } = settings
  const patch = (n: Partial<Settings['network']>): void =>
    onSave({ network: { ...network, ...n } })

  const [testResults, setTestResults] = useState<ProviderTestResult[] | null>(null)
  const [testing, setTesting] = useState(false)

  async function runTest(): Promise<void> {
    setTesting(true)
    setTestResults(null)
    try {
      const results = await window.api.testProviders()
      setTestResults(results)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="settings-section">
      <label>
        <input
          type="checkbox"
          checked={network.offlineMode}
          onChange={(e) => patch({ offlineMode: e.target.checked })}
        />
        오프라인 모드 (로컬 배경만 사용)
      </label>

      <label>
        프록시
        <select
          value={network.proxyMode}
          onChange={(e) =>
            patch({ proxyMode: e.target.value as Settings['network']['proxyMode'] })
          }
        >
          <option value="system">시스템 설정</option>
          <option value="direct">직접 연결</option>
          <option value="manual">수동</option>
          <option value="pac">PAC 스크립트</option>
        </select>
      </label>

      {network.proxyMode === 'manual' && (
        <label>
          프록시 주소
          <input
            type="text"
            placeholder="http://proxy.corp:8080"
            value={network.proxyUrl ?? ''}
            onChange={(e) => patch({ proxyUrl: e.target.value })}
          />
        </label>
      )}

      {network.proxyMode === 'pac' && (
        <label>
          PAC URL
          <input
            type="text"
            placeholder="http://proxy.corp/proxy.pac"
            value={network.pacUrl ?? ''}
            onChange={(e) => patch({ pacUrl: e.target.value })}
          />
        </label>
      )}

      <label>
        요청 시간 초과
        <select
          value={network.timeoutMs}
          onChange={(e) =>
            patch({ timeoutMs: Number(e.target.value) as Settings['network']['timeoutMs'] })
          }
        >
          {[3000, 5000, 10000, 15000].map((v) => (
            <option key={v} value={v}>{v / 1000}초</option>
          ))}
        </select>
      </label>

      <label>
        재시도 횟수
        <select
          value={network.retryCount}
          onChange={(e) =>
            patch({ retryCount: Number(e.target.value) as Settings['network']['retryCount'] })
          }
        >
          {[0, 1, 2, 3].map((v) => (
            <option key={v} value={v}>{v}회</option>
          ))}
        </select>
      </label>

      <button onClick={runTest} disabled={testing}>
        {testing ? '테스트 중…' : '연결 테스트'}
      </button>

      {testResults && (
        <ul className="test-results">
          {testResults.map((r) => (
            <li key={r.provider} className={r.ok ? 'ok' : 'fail'}>
              {r.ok ? '✅' : '❌'} {r.provider}
              {r.ok && r.latencyMs != null && ` (${r.latencyMs}ms)`}
              {!r.ok && r.error && ` — ${r.error}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
