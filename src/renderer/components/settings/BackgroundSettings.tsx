import type { Settings } from '@shared/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
}

export function BackgroundSettings({ settings, onSave }: Props): JSX.Element {
  const { background } = settings
  const patch = (b: Partial<Settings['background']>): void =>
    onSave({ background: { ...background, ...b } })

  return (
    <div className="settings-section">
      <label>
        <input
          type="checkbox"
          checked={background.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        배경 이미지 사용
      </label>

      <label>
        배경 전환
        <select
          value={background.changeMode}
          onChange={(e) =>
            patch({ changeMode: e.target.value as Settings['background']['changeMode'] })
          }
        >
          <option value="per-quote">인용문마다</option>
          <option value="interval">N분마다</option>
          <option value="fixed">고정</option>
        </select>
      </label>

      {background.changeMode === 'interval' && (
        <label>
          간격
          <select
            value={background.intervalMin}
            onChange={(e) =>
              patch({ intervalMin: Number(e.target.value) as Settings['background']['intervalMin'] })
            }
          >
            {[1, 5, 10, 30, 60].map((v) => (
              <option key={v} value={v}>{v}분</option>
            ))}
          </select>
        </label>
      )}

      <label>
        <input
          type="checkbox"
          checked={background.useQuoteKeywords}
          onChange={(e) => patch({ useQuoteKeywords: e.target.checked })}
        />
        인용문 키워드로 이미지 검색
      </label>


    </div>
  )
}
