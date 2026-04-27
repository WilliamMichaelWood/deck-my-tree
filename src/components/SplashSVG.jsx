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

// ─── Full-screen glitter wake trail ──────────────────────────────
// SVG viewBox 0 0 100 100 stretched full-screen (preserveAspectRatio=none).
// Each dot appears when the wave center (y: 100→0) passes its y position.
const SWEEP_DUR_MS = 1500
const WAKE_DOTS = Array.from({ length: 55 }, (_, i) => {
  // Spread across full screen width, clustered slightly toward center-x
  const xBase = (i * 19.7 + 3.2) % 100
  const x = xBase
  const y = (i * 7.3  + 5.1) % 100
  const delayMs = Math.max(0, ((100 - y) / 100) * SWEEP_DUR_MS - 30)

  const RADII  = [0.7, 1.4, 0.9, 1.8, 0.5, 1.2, 1.0, 2.0, 0.6, 1.5,
                  1.1, 0.8, 1.7, 0.9, 1.3, 0.6, 1.9, 1.0, 1.4, 0.7]
  const COLORS = ['#fff8e1', '#e8c96a', '#ffd700', '#fffde7', '#f5e07a']
  const DURS   = [380, 560, 420, 680, 480, 520, 360, 620, 460, 510,
                  580, 400, 660, 440, 540, 370, 600, 450, 530, 410]

  const ang    = i * 2.399 // golden angle in radians
  const drift  = 1.8 + (i % 5) * 0.4

  return {
    id: i,
    x: x.toFixed(1),
    y: y.toFixed(1),
    r: RADII[i % RADII.length],
    color: COLORS[i % COLORS.length],
    delayMs,
    dur: DURS[i % DURS.length],
    driftX: (Math.cos(ang) * drift).toFixed(1),
    driftY: (-0.8 - (i % 4) * 0.35).toFixed(1),
  }
})

// ─────────────────────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const sm            = useMemo(getSplashSpeed, [])
  const [phase, setPhase] = useState(0)
  const audioRef      = useRef(null)
  const audioUnlocked = useRef(false)
  const done          = useRef(false)

  // ── Phase schedule ────────────────────────────────────────────
  // Phase 1  (50ms):    particles fall, logo hidden under navy overlay
  // Phase 2 (300ms):    wave sweeps full screen bottom→top (1.5s); chime
  // Phase 3 (1800ms):   logo fully revealed — gold glow blooms
  // Phase 4 (2200ms):   hold with soft glow
  // Phase 5 (2800ms):   fade to app
  // Done    (3200ms):   unmount
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),
      setTimeout(() => setPhase(2), T(300)),
      setTimeout(() => setPhase(3), T(1800)),
      setTimeout(() => setPhase(4), T(2200)),
      setTimeout(() => setPhase(5), T(2800)),
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(3200)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chime fires as wave begins ───────────────────────────────
  useEffect(() => {
    if (phase === 2 && audioRef.current) {
      audioRef.current.volume = 0.45
      audioRef.current.play().catch(() => {})
    }
  }, [phase])

  // ── First touch: unlock audio ────────────────────────────────
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

  // SMIL timing helper (seconds, speed-scaled)
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

      {/* ── Ambient falling particles (always on top) ─────────── */}
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

      {/* ── Logo — z-index 1, always full color, centered ────── */}
      <div className={`splash-logo-wrap splash-lp${phase}`} aria-hidden="true">
        <img src="/logo.png" alt="" className="splash-logo" />
      </div>

      {/* ── Dark overlay — z-index 2, sweeps away to reveal logo ─ */}
      <div
        className={`splash-overlay${phase >= 2 ? ' sweeping' : ''}${phase >= 3 ? ' swept' : ''}`}
        aria-hidden="true"
      />

      {/* ── Gold wave SVG — z-index 3, full-screen sweep ─────── */}
      {phase >= 2 && (
        <svg
          className="splash-wave-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          overflow="visible"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Band gradient: transparent → gold → white-hot core → gold → transparent */}
            <linearGradient id="sp-wave-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="transparent" />
              <stop offset="15%"  stopColor="#c9a84c" stopOpacity="0.5" />
              <stop offset="38%"  stopColor="#e8c96a" stopOpacity="0.95" />
              <stop offset="50%"  stopColor="#fffde7" />
              <stop offset="62%"  stopColor="#e8c96a" stopOpacity="0.95" />
              <stop offset="85%"  stopColor="#c9a84c" stopOpacity="0.5" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Heavy glow — tall filter region for maximum bleed */}
            <filter id="sp-wave-glow" x="-20%" y="-600%" width="140%" height="1300%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Wave band + bright core — filter applied outside so glow bleeds */}
          <g filter="url(#sp-wave-glow)">
            {/* Band h=8: center 100→0 → top 96→-4 */}
            <rect x="0" y="96" width="100" height="8" fill="url(#sp-wave-grad)">
              <animate attributeName="y" from="96" to="-4"
                dur={S(SWEEP_DUR_MS)} begin="0s" fill="freeze" />
            </rect>
            {/* Bright core h=2: top 99→-1 */}
            <rect x="0" y="99" width="100" height="2" fill="rgba(255,253,231,0.95)">
              <animate attributeName="y" from="99" to="-1"
                dur={S(SWEEP_DUR_MS)} begin="0s" fill="freeze" />
            </rect>
          </g>

          {/* Glitter wake trail — no glow filter (keeps it crisp sparkles) */}
          {WAKE_DOTS.map(d => (
            <circle key={d.id} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={0}>
              <animate
                attributeName="opacity"
                values="0;1;0.9;0"
                keyTimes="0;0.08;0.45;1"
                dur={S(d.dur)}
                begin={S(d.delayMs)}
              />
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
      )}
    </div>
  )
}
