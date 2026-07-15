import type { Settings } from '@shared/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
}

export function TransitionSettings({ settings, onSave }: Props): JSX.Element {
  const { transition } = settings

  return (
    <div className="settings-section">
      <label>
        <input
          type="checkbox"
          checked={transition.reduceMotion}
          onChange={(e) => onSave({ transition: { ...transition, reduceMotion: e.target.checked } })}
        />
        모션 줄이기 (모든 전환 최소화)
      </label>
    </div>
  )
}
