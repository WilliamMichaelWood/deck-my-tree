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

// ─── Pixie-dust wake dots (SVG viewBox 0 0 100 100, circle r=50) ──
// Each dot appears when the sweep band passes its y-position.
const SWEEP_DUR_MS = 2000
const WAKE_DOTS = Array.from({ length: 22 }, (_, i) => {
  const angle  = (i / 22) * 2 * Math.PI + i * 0.38
  const radius = 10 + (i * 3.1 % 32)
  const x = 50 + Math.cos(angle) * radius
  const y = 50 + Math.sin(angle) * radius * 0.85
  // When does band center (100→0) reach this y?
  const delayMs = ((100 - y) / 100) * SWEEP_DUR_MS

  const RADII  = [1.2, 2.1, 1.5, 2.5, 1.0, 1.9, 1.4, 2.3, 1.6, 1.1,
                  2.0, 1.3, 2.4, 1.7, 1.2, 2.0, 1.5, 2.2, 1.6, 1.0, 1.8, 1.4]
  const COLORS = ['#fff8e1', '#e8c96a', '#ffd700', '#fffde7']
  const DURS   = [500, 700, 560, 810, 610, 660, 490, 730, 570, 630,
                  710, 530, 770, 590, 650, 520, 750, 580, 640, 500, 720, 580]

  return {
    id: i,
    x: x.toFixed(1),
    y: y.toFixed(1),
    r: RADII[i % RADII.length],
    color: COLORS[i % COLORS.length],
    delayMs,
    dur: DURS[i % DURS.length],
    driftX: (Math.cos(angle) * 2.8).toFixed(1),
    driftY: (-1.5 - (i % 3) * 0.6).toFixed(1),
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
  // Phase 1  (50ms):    dark logo fades in over 0.5s
  // Phase 2 (550ms):    gold sweep begins, chime fires
  // Phase 3 (2550ms):   sweep done — full-color logo glows
  // Phase 4 (3300ms):   fade out to app
  // Done    (3800ms):   unmount
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),
      setTimeout(() => setPhase(2), T(550)),
      setTimeout(() => setPhase(3), T(2550)),
      setTimeout(() => setPhase(4), T(3300)),
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(3800)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chime at sweep start ─────────────────────────────────────
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

  // SMIL timing helper (seconds string, speed-scaled)
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

      {/* ── Logo stage ───────────────────────────────────────── */}
      <div className="splash-logo-wrap" aria-hidden="true">
        <div className={`splash-logo-inner splash-logo-p${phase}`}>

          {/* Layer 1 (bottom): full-color logo — always underneath */}
          <img src="/logo.png" alt="" className="splash-logo-color" />

          {/* Layer 2 (top): dark overlay — clips away bottom→top during sweep */}
          <img
            src="/logo.png"
            alt=""
            className={`splash-logo-dark${phase >= 2 ? ' revealing' : ''}${phase >= 3 ? ' revealed' : ''}`}
          />

          {/* Layer 3 (top): SVG sweep band + pixie-dust wake, clipped to circle */}
          {phase >= 2 && (
            <svg
              className="splash-sweep-svg"
              viewBox="0 0 100 100"
              overflow="visible"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <clipPath id="sp-logo-clip">
                  <circle cx="50" cy="50" r="50" />
                </clipPath>
                <linearGradient id="sp-band-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="transparent" />
                  <stop offset="20%"  stopColor="#c9a84c" stopOpacity="0.55" />
                  <stop offset="42%"  stopColor="#e8c96a" stopOpacity="0.92" />
                  <stop offset="50%"  stopColor="#fffde7" />
                  <stop offset="58%"  stopColor="#e8c96a" stopOpacity="0.92" />
                  <stop offset="80%"  stopColor="#c9a84c" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <filter id="sp-band-glow" x="-80%" y="-400%" width="260%" height="900%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Glow band — filter applied before clip so it bleeds outside circle */}
              <g filter="url(#sp-band-glow)">
                <g clipPath="url(#sp-logo-clip)">
                  {/* Band: center tracks seam (100→0), h=15 → top 92.5→-7.5 */}
                  <rect x="0" y="92.5" width="100" height="15" fill="url(#sp-band-grad)">
                    <animate attributeName="y" from="92.5" to="-7.5"
                      dur={S(SWEEP_DUR_MS)} begin="0s" fill="freeze" />
                  </rect>
                  {/* Bright center line, h=3 → top 98.5→-1.5 */}
                  <rect x="0" y="98.5" width="100" height="3" fill="rgba(255,253,231,0.9)">
                    <animate attributeName="y" from="98.5" to="-1.5"
                      dur={S(SWEEP_DUR_MS)} begin="0s" fill="freeze" />
                  </rect>
                </g>
              </g>

              {/* Pixie-dust wake trail (clipped to circle, no extra glow) */}
              <g clipPath="url(#sp-logo-clip)">
                {WAKE_DOTS.map(d => (
                  <circle key={d.id} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={0}>
                    <animate
                      attributeName="opacity"
                      values="0;1;0.85;0"
                      keyTimes="0;0.1;0.5;1"
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
              </g>
            </svg>
          )}

        </div>
      </div>
    </div>
  )
}
