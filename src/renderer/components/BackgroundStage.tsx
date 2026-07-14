import { useEffect, useRef, useState } from 'react'
import type { Settings } from '@shared/types'

type Effect = Settings['transition']['image']['effect']

interface Props {
  path: string | null
  effect: Effect
  overlayOpacity: number
}

export function BackgroundStage({ path, effect, overlayOpacity }: Props): JSX.Element {
  const [layers, setLayers] = useState<[string | null, string | null]>([null, null])
  const [active, setActive] = useState<0 | 1>(0)

  useEffect(() => {
    if (!path) return
    setLayers((prev) => {
      const next: [string | null, string | null] = [...prev] as [string | null, string | null]
      next[active === 0 ? 1 : 0] = path
      return next
    })
    setActive((a) => (a === 0 ? 1 : 0))
  }, [path])

  return (
    <div className="bg-stage">
      {layers.map((src, i) => (
        <div
          key={i}
          className={`bg-layer bg-layer--${effectClass(effect)} ${active === i ? 'bg-layer--active' : 'bg-layer--inactive'}`}
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
