import { useEffect, useState } from 'react'

type Phase = 'idle' | 'in' | 'peek' | 'out'

const POSES: React.CSSProperties[] = [
  { bottom: '0px', left: '50%',  transform: 'translateX(-50%)' },
  { bottom: '0px', left: '16%' },
  { bottom: '0px', right: '16%' },
  { top: '42%', left:  '0px', transform: 'translateY(-50%) rotate(90deg)' },
  { top: '38%', right: '0px', transform: 'translateY(-50%) rotate(-90deg)' },
]

export function CatPeek(): JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle')
  const [poseIdx, setPoseIdx] = useState(0)

  useEffect(() => {
    let mounted = true

    const run = (): void => {
      if (!mounted) return
      setPoseIdx(Math.floor(Math.random() * POSES.length))
      setPhase('in')
      setTimeout(() => mounted && setPhase('peek'), 900)
      setTimeout(() => mounted && setPhase('out'),  5900)
      setTimeout(() => {
        if (!mounted) return
        setPhase('idle')
        setTimeout(run, (Math.random() * 5 + 3) * 60_000)
      }, 7200)
    }

    const t = setTimeout(run, 20_000)
    return () => { mounted = false; clearTimeout(t) }
  }, [])

  if (phase === 'idle') return <></>

  return (
    <div
      aria-hidden
      className={`cat-wrap cat-phase-${phase}`}
      style={{ ...POSES[poseIdx], position: 'absolute', zIndex: 50, width: 200, height: 190, pointerEvents: 'none' }}
    >
      <CatFace rolling={phase === 'peek'} />
    </div>
  )
}

function CatFace({ rolling }: { rolling: boolean }): JSX.Element {
  const rollCls = rolling ? ' cat-pupil--roll' : ''
  return (
    <svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" width="200" height="190">
      <defs>
        <filter id="cat-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="-6" stdDeviation="9" floodColor="rgba(0,0,0,0.65)" />
        </filter>
      </defs>

      {/* torn paper hole */}
      <path
        d="M22,188 L10,162 L20,142 L8,118 L16,96 L4,70 L18,50 L30,32 L50,20
           L72,26 L90,14 L112,20 L134,12 L156,22 L172,16 L188,32 L196,54
           L188,78 L198,100 L190,124 L198,148 L186,168 L174,182 L152,190
           L130,184 L108,192 L86,186 L64,194 L42,186 L24,194 Z"
        fill="rgba(245,235,215,0.97)"
        stroke="rgba(175,150,120,0.35)"
        strokeWidth="1"
        filter="url(#cat-glow)"
      />

      {/* ears */}
      <polygon points="52,80 35,35 79,65"  fill="#dda870" />
      <polygon points="55,76 44,50 72,66"  fill="#f4a0b5" />
      <polygon points="148,80 165,35 121,65" fill="#dda870" />
      <polygon points="145,76 156,50 128,66" fill="#f4a0b5" />

      {/* head */}
      <ellipse cx="100" cy="112" rx="71" ry="67" fill="#f5deb3" />

      {/* eye whites */}
      <ellipse cx="74"  cy="100" rx="18" ry="20" fill="white" />
      <ellipse cx="126" cy="100" rx="18" ry="20" fill="white" />

      {/* pupils — animated */}
      <circle cx="74"  cy="100" r="11" fill="#18182a"
        className={`cat-pupil${rollCls}`} />
      <circle cx="126" cy="100" r="11" fill="#18182a"
        className={`cat-pupil cat-pupil--rev${rollCls}`}
        style={{ animationDelay: '260ms' }} />

      {/* eye shines */}
      <circle cx="68"  cy="93" r="4.5" fill="white" opacity="0.9" />
      <circle cx="120" cy="93" r="4.5" fill="white" opacity="0.9" />

      {/* nose */}
      <polygon points="100,118 92,128 108,128" fill="#e87090" />

      {/* mouth */}
      <path d="M92,128 Q100,138 108,128"
        fill="none" stroke="#c06070" strokeWidth="2.2" strokeLinecap="round" />

      {/* whiskers */}
      <line x1="22" y1="116" x2="84" y2="119" stroke="#bbb" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="22" y1="124" x2="84" y2="124" stroke="#bbb" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="22" y1="132" x2="84" y2="129" stroke="#bbb" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="178" y1="116" x2="116" y2="119" stroke="#bbb" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="178" y1="124" x2="116" y2="124" stroke="#bbb" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="178" y1="132" x2="116" y2="129" stroke="#bbb" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
