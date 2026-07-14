import { useEffect, useReducer, useRef } from 'react'
import type { Settings } from '@shared/types'

type Effect = Settings['transition']['image']['effect']

interface Props {
  path: string | null
  effect: Effect
  overlayOpacity: number
}

type BGState = {
  layers: [string | null, string | null]
  active: 0 | 1
}

function bgReducer(state: BGState, path: string): BGState {
  const next = (state.active === 0 ? 1 : 0) as 0 | 1
  const newLayers: [string | null, string | null] = [...state.layers] as [string | null, string | null]
  newLayers[next] = path
  return { layers: newLayers, active: next }
}

export function BackgroundStage({ path, effect, overlayOpacity }: Props): JSX.Element {
  const [state, dispatch] = useReducer(bgReducer, { layers: [null, null], active: 0 })
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!path || path === prevPathRef.current) return
    prevPathRef.current = path
    dispatch(path)
  }, [path])

  return (
    <div className="bg-stage">
      {state.layers.map((src, i) => (
        <div
          key={i}
          className={`bg-layer bg-layer--${effectClass(effect)} ${state.active === i ? 'bg-layer--active' : 'bg-layer--inactive'}`}
          style={src ? { backgroundImage: `url("${src}")` } : undefined}
        />
      ))}
      <div className="bg-overlay" style={{ opacity: overlayOpacity }} />
    </div>
  )
}

function effectClass(e: Effect): string {
  return e === 'dim-crossfade' ? 'dim-crossfade' : e
}
