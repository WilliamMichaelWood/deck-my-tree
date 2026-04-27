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

// ─── 30 ambient falling particles ────────────────────────────────
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id:    i,
  left:  ((i * 33.7 + 11)   % 100).toFixed(1),
  delay: -((i * 0.47 + 0.3) % 9).toFixed(2),
  dur:   (7  + (i * 0.31)   % 5).toFixed(1),
  size:  (2  + (i * 0.19)   % 2.2).toFixed(1),
}))

// ─── 12 burst sparkles — HTML divs (CSS animation starts on mount) ─
// dx/dy in CSS pixels, radiating from emoji star position
const BURST_SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30) * Math.PI / 180
  return {
    id: i,
    dx: Math.round(Math.cos(a) * 70),
    dy: Math.round(Math.sin(a) * 70),
  }
})

// ─── Tree clip path (SVG viewBox 0 0 200 235) ────────────────────
const TIERS = [
  '100,10 142,72 58,72',
  '100,46 170,130 30,130',
  '100,88 188,192 12,192',
]

// ─── 30 pixie-dust wake particles ────────────────────────────────
// Band sweeps y=235→y=-32 (267 units) over 2200ms starting at 800ms.
// Three columns (left/center/right), 10 rows, with drift + variety.
const WAKE_DOTS = Array.from({ length: 30 }, (_, i) => {
  const row = Math.floor(i / 3)
  const col = i % 3  // 0=left, 1=center, 2=right

  // y: 10 rows spaced 17px apart, slight offset per column for scatter
  const yBase = 178 - row * 17
  const y = yBase + [-3, 0, 4][col]

  // When does the band center reach this y?
  const delayMs = 800 + ((235 - y) / 267) * 2200 + col * 70

  // x: spread within tree width at this y (tree narrows toward top)
  const halfW = Math.max(4, (192 - Math.min(y, 192)) / 182 * 68)
  const xFracs = [-0.58, 0.04, 0.62]
  const jitter = [4, -2, 3, -5, 1, -3, 5, -1, 2, -4][row]
  const x = 100 + xFracs[col] * halfW + jitter

  // Drift direction: outward + upward
  const driftX = col === 0 ? -(3 + row % 4) : col === 2 ? (3 + row % 4) : (row % 2 ? -1.5 : 1.5)
  const driftY = -(2.5 + (i * 7 % 5))

  // Visual variety
  const radii  = [1.3, 2.1, 1.6, 2.6, 1.9, 1.4, 2.3, 1.7, 2.0, 1.5]
  const colors = ['#fff8e1', '#e8c96a', '#ffd700']
  const durs   = [550, 750, 600, 820, 620, 680, 500, 740, 580, 640]

  return {
    id: i, x, y, delayMs,
    r: radii[i % 10],
    color: colors[i % 3],
    dur: durs[i % 10],
    driftX, driftY,
  }
})

// ─────────────────────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const sm            = useMemo(getSplashSpeed, [])
  const [phase, setPhase] = useState(0)
  const audioRef      = useRef(null)
  const audioUnlocked = useRef(false)
  const done          = useRef(false)

  // ── Phase schedule (7s total at normal speed) ─────────────────
  // Band sweeps 800ms→3000ms (2200ms). Star bursts 100ms after band ends.
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),     // dark tree fades in
      setTimeout(() => setPhase(2), T(800)),    // band sweeps, dark→color wipe
      setTimeout(() => setPhase(3), T(3100)),   // star burst + sound
      setTimeout(() => setPhase(4), T(3500)),   // title rises (1s to animate)
      setTimeout(() => setPhase(5), T(7000)),   // hold full scene, then fade
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(7800)),
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

  // SMIL timing (seconds string, scaled by speed)
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

      {/* ── Ambient falling particles ────────────────────────── */}
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
        <div className="splash-tree-wrap splash-tree-body">

          {/* Layer 1: full-color emoji (the revealed state) */}
          <div className="splash-emoji-color" aria-hidden="true">🎄</div>

          {/* Layer 2: dark/purple emoji — clips away bottom→top in sync with band */}
          <div
            className={`splash-emoji-dark${phase >= 2 ? ' revealing' : ''}${phase >= 3 ? ' revealed' : ''}`}
            aria-hidden="true"
          >🎄</div>

          {/* Layer 3: SVG — band, pixie-dust trail, glow (no star polygon) */}
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

              {/* Band outer gradient: transparent → gold → white-hot → gold → transparent */}
              <linearGradient id="sp-sweep-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="transparent" />
                <stop offset="18%"  stopColor="#c9a84c" stopOpacity="0.7" />
                <stop offset="38%"  stopColor="#e8c96a" stopOpacity="0.95" />
                <stop offset="50%"  stopColor="#fffde7" />
                <stop offset="62%"  stopColor="#e8c96a" stopOpacity="0.95" />
                <stop offset="82%"  stopColor="#c9a84c" stopOpacity="0.7" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              {/* Band glow — stronger blur for magic feel */}
              <filter id="sp-band-glow" x="-100%" y="-500%" width="300%" height="1100%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ── Main sweep band (wide, white-hot core, clipped to tree) ── */}
            <g clipPath="url(#sp-tree-clip)" filter="url(#sp-band-glow)">
              {/* Outer band — y="235" hides it below viewBox until animation starts */}
              <rect x="-10" y="235" width="220" height="32" fill="url(#sp-sweep-grad)">
                <animate attributeName="y" from="235" to="-32" dur={S(2200)} begin={S(800)} fill="freeze" />
              </rect>
              {/* Bright center line */}
              <rect x="-10" y="248" width="220" height="5" fill="rgba(255,253,231,0.95)">
                <animate attributeName="y" from="248" to="-5" dur={S(2200)} begin={S(800)} fill="freeze" />
              </rect>
            </g>

            {/* ── Pixie-dust wake trail ─────────────────────────── */}
            {WAKE_DOTS.map(d => (
              <circle key={d.id} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={0}>
                <animate
                  attributeName="opacity"
                  values="0;1;0.85;0"
                  keyTimes="0;0.12;0.5;1"
                  dur={S(d.dur)}
                  begin={S(d.delayMs)}
                />
                {/* Drift upward + outward as they fade */}
                <animateTransform
                  attributeName="transform" type="translate"
                  from="0 0" to={`${d.driftX} ${d.driftY}`}
                  dur={S(d.dur)}
                  begin={S(d.delayMs)}
                  additive="sum"
                />
              </circle>
            ))}
          </svg>

          {/* ── Star glow burst (HTML div — CSS animation starts on mount) ── */}
          {phase >= 3 && (
            <div className="splash-star-glow" aria-hidden="true" />
          )}

          {/* ── 12 burst sparkles radiating from emoji star (HTML + CSS) ── */}
          {phase >= 3 && BURST_SPARKS.map(s => (
            <div
              key={s.id}
              className="splash-burst-ptcl"
              aria-hidden="true"
              style={{
                '--dx': `${s.dx}px`,
                '--dy': `${s.dy}px`,
                '--bd': `${s.id * 45}ms`,
              }}
            />
          ))}

        </div>{/* end splash-tree-wrap */}

        <p className={`splash-title${phase >= 4 ? ' splash-title-rise' : ''}`}>
          Deck My Tree
        </p>
      </div>
    </div>
  )
}
