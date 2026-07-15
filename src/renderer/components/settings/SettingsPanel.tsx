import { useState } from 'react'
import type { Settings } from '@shared/types'
import { DisplaySettings } from './DisplaySettings'
import { TransitionSettings } from './TransitionSettings'
import { StartupSettings } from './StartupSettings'
import { NetworkSettings } from './NetworkSettings'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
  onClose: () => void
}

type Tab = 'display' | 'transition' | 'startup' | 'network'

const TABS: { id: Tab; label: string }[] = [
  { id: 'display',    label: '표시' },
  { id: 'transition', label: '전환' },
  { id: 'startup',    label: '시작' },
  { id: 'network',    label: '네트워크' },
]

export function SettingsPanel({ settings, onSave, onClose }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('display')

  return (
    <div className="settings-panel">
      <div className="settings-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`settings-tab ${tab === id ? 'settings-tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>

      <div className="settings-body">
        {tab === 'display'    && <DisplaySettings    settings={settings} onSave={onSave} />}
        {tab === 'transition' && <TransitionSettings settings={settings} onSave={onSave} />}
        {tab === 'startup'    && <StartupSettings    settings={settings} onSave={onSave} />}
        {tab === 'network'    && <NetworkSettings    settings={settings} onSave={onSave} />}
      </div>
    </div>
  )
}
