import { useEffect, useReducer, useState, useCallback } from 'react'
import { BackgroundStage } from './components/BackgroundStage'
import { QuoteCard } from './components/QuoteCard'
import { CreditBadge } from './components/CreditBadge'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { CatPeek } from './components/CatPeek'
import type { TickPayload, BgNextPayload, Credit, Quote, Settings, DeepPartial } from '@shared/types'

type State = {
  time: string
  quote: Quote | null
  bgPath: string | null
  credit: Credit | null
  settings: Settings | null
}

type Action =
  | { type: 'TICK'; payload: TickPayload }
  | { type: 'BG'; payload: BgNextPayload }
  | { type: 'SETTINGS'; settings: Settings }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TICK':
      return { ...state, time: action.payload.time, quote: action.payload.quote }
    case 'BG':
      return { ...state, bgPath: action.payload.localPath, credit: action.payload.credit }
    case 'SETTINGS':
      return { ...state, settings: action.settings }
    default:
      return state
  }
}

const initial: State = { time: '', quote: null, bgPath: null, credit: null, settings: null }

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initial)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!window.api) return

    window.api.getSettings().then((s) => dispatch({ type: 'SETTINGS', settings: s }))

    const offTick = window.api.onTick((p) => dispatch({ type: 'TICK', payload: p }))
    const offBg = window.api.onBgNext((p) => dispatch({ type: 'BG', payload: p }))
    const offErr = window.api.onBgError(() => {/* silent */})

    return () => { offTick(); offBg(); offErr() }
  }, [])

  // Esc to close settings
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setShowSettings(false)
      if ((e.ctrlKey || e.metaKey) && e.key === ',') setShowSettings((v) => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSave = useCallback(async (patch: Partial<Settings>) => {
    if (!window.api) return
    const updated = await window.api.setSettings(patch as DeepPartial<Settings>)
    dispatch({ type: 'SETTINGS', settings: updated })
  }, [])

  return (
    <div className="app">
      {state.time && (
        <div className="top-clock">{state.time}</div>
      )}

      <BackgroundStage
        path={state.bgPath}
        effect={state.settings?.transition.image.effect ?? 'dim-crossfade'}
        overlayOpacity={state.settings?.transition.image.overlayOpacity ?? 0.35}
      />

      {state.quote ? (
        <QuoteCard
          quote={state.quote}
          time={state.time}
          language={state.settings?.display.language ?? 'both'}
          effect={state.settings?.transition.text.effect ?? 'blur-lift'}
        />
      ) : state.time ? (
        <div className="clock-fallback">{state.time}</div>
      ) : null}

      {state.credit && state.settings?.display.showCredit && (
        <CreditBadge credit={state.credit} />
      )}

      {/* Settings trigger — top-left */}
      <button
        className="settings-trigger"
        onClick={() => setShowSettings((v) => !v)}
        title="설정 (Ctrl+,)"
        aria-label="설정 열기"
      >
        ⚙
      </button>

      {/* Close button — top-right */}
      <button
        className="close-btn"
        onClick={() => window.api?.closeApp()}
        title="닫기"
        aria-label="앱 닫기"
      >
        ✕
      </button>

      {showSettings && state.settings && (
        <SettingsPanel
          settings={state.settings}
          onSave={handleSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      <CatPeek />
    </div>
  )
}
