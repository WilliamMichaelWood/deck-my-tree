import { useEffect, useRef, useState, useMemo } from 'react'
import './SplashSVG.css'

// ─── Speed: 1.0 = normal, 2/3 = 1.5× faster on repeat within 24h ─
function getSplashSpeed() {
  try {
    const data = JSON.parse(localStorage.getItem('splashSeen') || '{}')
    if (data.ts && Date.now() - data.ts < 86_400_000) return 2 / 3
  } catch {}
  return 1
}

// ─── 30 falling particles ─────────────────────────────────────────
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id:    i,
  left:  ((i * 33.7 + 11)   % 100).toFixed(1),
  delay: -((i * 0.47 + 0.3) % 9).toFixed(2),
  dur:   (6  + (i * 0.31)   % 4.5).toFixed(1),
  size:  (2  + (i * 0.19)   % 2.2).toFixed(1),
}))

// ─── 12 burst sparkles radiating from star center (SVG coords) ────
const BURST_SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30) * Math.PI / 180
  return { id: i, dx: (Math.cos(a) * 36).toFixed(1), dy: (Math.sin(a) * 36).toFixed(1) }
})

// ─── Tree clip path tiers (SVG viewBox 0 0 200 235) ──────────────
const TIERS = [
  '100,10 142,72 58,72',
  '100,46 170,130 30,130',
  '100,88 188,192 12,192',
]

// ─── Wake trail dots (timed to band sweep: 500ms start, 1500ms dur)
// Band travels from y=235 to y=-22 (total 257 units) over 1500ms.
// Dot at y fires when band passes: delay = 500 + (235-y)/257 * 1500
const WAKE_DOTS = Array.from({ length: 10 }, (_, i) => {
  const y       = 182 - i * 18
  const delayMs = 500 + ((235 - y) / 257) * 1500
  const xOff    = [0, 6, -5, 4, -6, 3, -4, 5, -3, 1][i]
  return { id: i, x: 100 + xOff, y, delayMs }
})

// ─── 5-pointed star (outer R=22, inner R=8.5, center 100,8) ──────
const STAR_PTS = '100,-14 105,1.1 120.9,1.2 108.1,10.6 112.9,25.8 100,16.5 87.1,25.8 91.9,10.6 79.1,1.2 95,1.1'

// ─────────────────────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const sm            = useMemo(getSplashSpeed, [])
  const [phase, setPhase] = useState(0)
  const audioRef      = useRef(null)
  const audioUnlocked = useRef(false)
  const done          = useRef(false)

  // ── Phase schedule (5s total at normal speed) ─────────────────
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),     // dark tree fades in
      setTimeout(() => setPhase(2), T(500)),    // gold band sweeps up, color reveals
      setTimeout(() => setPhase(3), T(2000)),   // star bursts + sparkle sound
      setTimeout(() => setPhase(4), T(2500)),   // title rises
      setTimeout(() => setPhase(5), T(4500)),   // fade out
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(5000)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play sparkle chime at phase 3 ────────────────────────────
  useEffect(() => {
    if (phase === 3 && audioRef.current) {
      audioRef.current.volume = 0.4
      audioRef.current.play().catch(() => {})
    }
  }, [phase])

  // ── First touch: unlock audio before phase 3 fires ───────────
  const handlePointerDown = () => {
    if (audioUnlocked.current || !audioRef.current) return
    audioUnlocked.current = true
    audioRef.current.play().then(() => {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }).catch(() => {})
  }

  const skip = () => {
    if (done.current) return
    done.current = true
    onFinish()
  }

  // ── SMIL timing helpers ───────────────────────────────────────
  const S = (ms) => `${(ms * sm / 1000).toFixed(3)}s`

  return (
    <div
      className={`splash splash-p${phase}`}
      style={{ '--sm': sm }}
      onPointerDown={handlePointerDown}
      onClick={skip}
      role="presentation"
    >
      <audio ref={audioRef} src="/sounds/sparkle.mp3" preload="auto" />

      {/* ── Falling gold particles ───────────────────────────── */}
      <div className="splash-particles" aria-hidden="true">
        {PARTICLES.map(p => (
          <div key={p.id} className="splash-ptcl" style={{
            left:              `${p.left}%`,
            width:             `${p.size}px`,
            height:            `${p.size}px`,
            animationDelay:    `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }} />
        ))}
      </div>

      {/* ── Stage ────────────────────────────────────────────── */}
      <div className="splash-stage">

        {/* Tree wrap: color layer + dark layer + SVG overlay */}
        <div className={`splash-tree-wrap splash-tree-body`}>

          {/* Layer 1: full-color emoji (always on, bottom) */}
          <div className="splash-emoji-color" aria-hidden="true">🎄</div>

          {/* Layer 2: dark/purple emoji, clips away bottom→top as band sweeps */}
          <div
            className={`splash-emoji-dark${phase >= 2 ? ' revealing' : ''}${phase >= 3 ? ' revealed' : ''}`}
            aria-hidden="true"
          >🎄</div>

          {/* Layer 3: SVG animation overlay */}
          <svg
            className="splash-tree-svg"
            viewBox="0 0 200 235"
            overflow="visible"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="sp-tree-clip">
                {TIERS.map((pts, i) => <polygon key={i} points={pts} />)}
                <rect x="88" y="192" width="24" height="30" />
              </clipPath>

              <linearGradient id="sp-sweep-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="transparent" />
                <stop offset="25%"  stopColor="#c9a84c" stopOpacity="0.9" />
                <stop offset="50%"  stopColor="#e8c96a" />
                <stop offset="75%"  stopColor="#c9a84c" stopOpacity="0.9" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              <filter id="sp-band-glow" x="-80%" y="-400%" width="260%" height="900%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="sp-star-glow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5"  result="b1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b2" />
                <feMerge>
                  <feMergeNode in="b2" />
                  <feMergeNode in="b1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Gold sweep band — clipped to tree silhouette */}
            <g clipPath="url(#sp-tree-clip)" filter="url(#sp-band-glow)">
              <rect x="-10" y="0" width="220" height="22" fill="url(#sp-sweep-grad)">
                <animate
                  attributeName="y"
                  from="235" to="-22"
                  dur={S(1500)}
                  begin={S(500)}
                  fill="freeze"
                />
              </rect>
            </g>

            {/* Wake trail sparkles */}
            {WAKE_DOTS.map(d => (
              <circle key={d.id} cx={d.x} cy={d.y} r={1.8} fill="#fff8e1" opacity={0}>
                <animate
                  attributeName="opacity"
                  values="0;1;0.7;0"
                  keyTimes="0;0.15;0.55;1"
                  dur={S(600)}
                  begin={S(d.delayMs)}
                />
                <animate
                  attributeName="r"
                  values="0.5;2.2;1.5"
                  keyTimes="0;0.15;1"
                  dur={S(600)}
                  begin={S(d.delayMs)}
                />
              </circle>
            ))}

            {/* Star glow bloom */}
            <circle
              cx={100} cy={8} r={36}
              fill="rgba(232,201,106,0.45)"
              className={`splash-glow-ring${phase >= 3 ? ' splash-glow-ring-on' : ''}`}
            />

            {/* 5-pointed star */}
            <polygon
              points={STAR_PTS}
              fill="#e8c96a"
              filter="url(#sp-star-glow)"
              className={`splash-star${phase >= 3 ? ' splash-star-burst' : ''}`}
            />

            {/* 12 burst sparkles */}
            {phase >= 3 && BURST_SPARKS.map(s => (
              <circle key={s.id} cx={100} cy={8} r={2.2} fill="#fff8e1" opacity={1}>
                <animate
                  attributeName="opacity"
                  values="1;1;0" keyTimes="0;0.55;1"
                  dur={S(800)} begin={S(s.id * 45)} fill="freeze"
                />
                <animateTransform
                  attributeName="transform" type="translate"
                  from="0 0" to={`${s.dx} ${s.dy}`}
                  dur={S(800)} begin={S(s.id * 45)} additive="sum"
                />
              </circle>
            ))}
          </svg>
        </div>{/* end splash-tree-wrap */}

        {/* Title */}
        <p className={`splash-title${phase >= 4 ? ' splash-title-rise' : ''}`}>
          Deck My Tree
        </p>
      </div>
    </div>
  )
}
