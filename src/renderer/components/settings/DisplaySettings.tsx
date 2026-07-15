import type { Settings } from '@shared/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
}

export function DisplaySettings({ settings, onSave }: Props): JSX.Element {
  const { display } = settings
  const patch = (d: Partial<Settings['display']>): void =>
    onSave({ display: { ...display, ...d } })

  return (
    <div className="settings-section">
      <label>
        언어
        <select
          value={display.language}
          onChange={(e) => patch({ language: e.target.value as Settings['display']['language'] })}
        >
          <option value="both">한국어 + English</option>
          <option value="en">English only</option>
          <option value="ko">한국어만</option>
        </select>
      </label>

      <label>
        글자 크기: {display.fontScale.toFixed(1)}×
        <input
          type="range"
          min={0.8} max={1.6} step={0.1}
          value={display.fontScale}
          onChange={(e) => patch({ fontScale: Number(e.target.value) })}
        />
      </label>

    </div>
  )
}
