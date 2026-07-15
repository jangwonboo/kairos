import type { Settings } from '@shared/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
}

export function StartupSettings({ settings, onSave }: Props): JSX.Element {
  const { startup } = settings
  const patch = (s: Partial<Settings['startup']>): void =>
    onSave({ startup: { ...startup, ...s } })

  return (
    <div className="settings-section">
      <label>
        <input
          type="checkbox"
          checked={startup.autoLaunch}
          onChange={(e) => patch({ autoLaunch: e.target.checked })}
        />
        Windows 시작 시 자동 실행
      </label>

      <label>
        <input
          type="checkbox"
          checked={startup.fullscreen}
          onChange={(e) => patch({ fullscreen: e.target.checked })}
        />
        전체화면으로 시작
      </label>

      <label>
        <input
          type="checkbox"
          checked={startup.minimizeToTray}
          onChange={(e) => patch({ minimizeToTray: e.target.checked })}
        />
        닫기 시 트레이로 최소화
      </label>
    </div>
  )
}
