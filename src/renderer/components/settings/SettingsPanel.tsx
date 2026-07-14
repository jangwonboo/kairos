import { useState } from 'react'
import type { Settings } from '@shared/types'
import { NetworkSettings } from './NetworkSettings'
import { DisplaySettings } from './DisplaySettings'
import { BackgroundSettings } from './BackgroundSettings'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
  onClose: () => void
}

type Tab = 'display' | 'background' | 'network'

export function SettingsPanel({ settings, onSave, onClose }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('display')

  return (
    <div className="settings-panel">
      <div className="settings-tabs">
        {(['display', 'background', 'network'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`settings-tab ${tab === t ? 'settings-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'display' ? '표시' : t === 'background' ? '배경' : '네트워크'}
          </button>
        ))}
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>

      <div className="settings-body">
        {tab === 'display' && (
          <DisplaySettings settings={settings} onSave={onSave} />
        )}
        {tab === 'background' && (
          <BackgroundSettings settings={settings} onSave={onSave} />
        )}
        {tab === 'network' && (
          <NetworkSettings settings={settings} onSave={onSave} />
        )}
      </div>
    </div>
  )
}
