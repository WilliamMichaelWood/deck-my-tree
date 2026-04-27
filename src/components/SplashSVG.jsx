import { useEffect, useRef, useState, useMemo } from 'react'
import './SplashSVG.css'

// ─── Speed: 1.0 = normal, 2/3 = 1.5× faster (repeat within 24h) ──
function getSplashSpeed() {
  try {
    const data = JSON.parse(localStorage.getItem('splashSeen') || '{}')
    if (data.ts && Date.now() - data.ts < 86_400_000) return 2 / 3
  } catch {}
  return 1
}

// ─── 30 falling particles (deterministic pseudo-random) ───────────
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left:  ((i * 33.7 + 11)  % 100).toFixed(1),
  delay: -((i * 0.47 + 0.3) % 9).toFixed(2),   // negative = already mid-fall
  dur:   (6 + (i * 0.31)   % 4.5).toFixed(1),
  size:  (2 + (i * 0.19)   % 2.2).toFixed(1),
}))

// ─── 12 burst sparkles radiating from star center (SVG coords) ────
const BURST_SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30) * Math.PI / 180
  return { id: i, dx: (Math.cos(a) * 36).toFixed(1), dy: (Math.sin(a) * 36).toFixed(1) }
})

// ─── Wake trail dots along tree center (appear as band sweeps up) ─
// Band sweeps from y≈192 to y≈10 during 0.4s→1.6s.
// Each dot fires when band passes its y position.
const WAKE_DOTS = Array.from({ length: 10 }, (_, i) => {
  const y     = 182 - i * 18
  const delay = 0.4 + ((192 - y) / 182) * 1.2          // seconds
  const xOff  = [0, 6, -5, 4, -6, 3, -4, 5, -3, 1][i]
  return { id: i, x: 100 + xOff, y, delay }
})

// ─── Tree polygon points (SVG viewBox 0 0 200 235) ────────────────
const TIERS = [
  '100,10 142,72 58,72',       // top tier
  '100,46 170,130 30,130',     // mid tier
  '100,88 188,192 12,192',     // bottom tier
]

// ─── 5-pointed star (outer R=22, inner R=8.5, center 100,8) ──────
// Topmost point at (100,−14), so requires overflow="visible" on SVG.
const STAR_PTS = '100,-14 105,1.1 120.9,1.2 108.1,10.6 112.9,25.8 100,16.5 87.1,25.8 91.9,10.6 79.1,1.2 95,1.1'

// ─────────────────────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const sm      = useMemo(getSplashSpeed, [])
  const [phase, setPhase] = useState(0)
  const audioRef = useRef(null)
  const done     = useRef(false)

  // ── Schedule phase transitions + record visit ──────────────────
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),     // tree fades in
      setTimeout(() => setPhase(2), T(400)),    // sweep starts (SMIL handles visuals)
      setTimeout(() => setPhase(3), T(1600)),   // star burst + audio
      setTimeout(() => setPhase(4), T(2100)),   // title rises
      setTimeout(() => setPhase(5), T(2800)),   // fade out
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(3100)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Try to play sparkle chime at phase 3 ──────────────────────
  useEffect(() => {
    if (phase === 3 && audioRef.current) {
      audioRef.current.volume = 0.4
      audioRef.current.play().catch(() => {}) // graceful autoplay failure
    }
  }, [phase])

  // ── Tap anywhere to skip ───────────────────────────────────────
  const skip = () => {
    if (done.current) return
    done.current = true
    onFinish()
  }

  // ── SMIL timing helpers (returns seconds string for begin/dur) ─
  const S = (ms) => `${(ms * sm / 1000).toFixed(3)}s`

  return (
    <div
      className={`splash splash-p${phase}`}
      style={{ '--sm': sm }}
      onClick={skip}
      aria-label="Loading Deck My Tree — tap to skip"
      role="presentation"
    >
      {/* Sparkle chime (place sparkle.mp3 in /public/sounds/) */}
      <audio ref={audioRef} src="/sounds/sparkle.mp3" preload="auto" />

      {/* ── Falling gold particles (always on) ─────────────────── */}
      <div className="splash-particles" aria-hidden="true">
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="splash-ptcl"
            style={{
              left:              `${p.left}%`,
              width:             `${p.size}px`,
              height:            `${p.size}px`,
              animationDelay:    `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      {/* ── Center stage: tree + title ──────────────────────────── */}
      <div className="splash-stage">
        {/* Tree wrap: emoji behind, SVG animation overlay on top */}
        <div className="splash-tree-wrap">
          <div className={`splash-emoji-tree splash-tree-body`} aria-hidden="true">🎄</div>

        <svg
          className="splash-tree-svg"
          viewBox="0 0 200 235"
          overflow="visible"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Clip path = union of all tree shapes */}
            <clipPath id="sp-tree-clip">
              {TIERS.map((pts, i) => <polygon key={i} points={pts} />)}
              <rect x="88" y="192" width="24" height="30" />
            </clipPath>

            {/* Sweep band gradient: transparent → gold → bright → gold → transparent */}
            <linearGradient id="sp-sweep-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="transparent" />
              <stop offset="25%"  stopColor="#c9a84c" stopOpacity="0.9" />
              <stop offset="50%"  stopColor="#e8c96a" />
              <stop offset="75%"  stopColor="#c9a84c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Glow for sweep band */}
            <filter id="sp-band-glow" x="-80%" y="-400%" width="260%" height="900%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow for star */}
            <filter id="sp-star-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Gold sweep band (clipped to tree shape) ──────── */}
          <g clipPath="url(#sp-tree-clip)" filter="url(#sp-band-glow)">
            <rect x="-10" y="0" width="220" height="22" fill="url(#sp-sweep-grad)">
              {/* SMIL: sweep band travels from tree base to apex */}
              <animate
                attributeName="y"
                from="235"
                to="-22"
                dur={S(1200)}
                begin={S(400)}
                fill="freeze"
              />
            </rect>
          </g>

          {/* ── Wake trail sparkles ───────────────────────────── */}
          {WAKE_DOTS.map(d => (
            <circle key={d.id} cx={d.x} cy={d.y} r={1.8} fill="#fff8e1" opacity={0}>
              <animate
                attributeName="opacity"
                values="0;1;0.7;0"
                keyTimes="0;0.15;0.55;1"
                dur={S(600)}
                begin={S(d.delay * 1000)}
              />
              <animate
                attributeName="r"
                values="0.5;2.2;1.5"
                keyTimes="0;0.15;1"
                dur={S(600)}
                begin={S(d.delay * 1000)}
              />
            </circle>
          ))}

          {/* ── Star glow ring burst (radial bloom) ──────────── */}
          <circle
            cx={100} cy={8} r={36}
            fill="rgba(232,201,106,0.45)"
            className={`splash-glow-ring${phase >= 3 ? ' splash-glow-ring-on' : ''}`}
          />

          {/* ── 5-pointed star at apex ────────────────────────── */}
          <polygon
            points={STAR_PTS}
            fill="#e8c96a"
            filter="url(#sp-star-glow)"
            className={`splash-star${phase >= 3 ? ' splash-star-burst' : ''}`}
          />

          {/* ── 12 burst sparkles radiating from star center ─── */}
          {phase >= 3 && BURST_SPARKS.map(s => (
            <circle key={s.id} cx={100} cy={8} r={2.2} fill="#fff8e1" opacity={1}>
              <animate
                attributeName="opacity"
                values="1;1;0"
                keyTimes="0;0.55;1"
                dur={S(800)}
                begin={S(s.id * 45)}
                fill="freeze"
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to={`${s.dx} ${s.dy}`}
                dur={S(800)}
                begin={S(s.id * 45)}
                additive="sum"
              />
            </circle>
          ))}
        </svg>
        </div>{/* end splash-tree-wrap */}

        {/* ── Title: rises in at phase 4 ──────────────────────── */}
        <p className={`splash-title${phase >= 4 ? ' splash-title-rise' : ''}`}>
          Deck My Tree
        </p>
      </div>
    </div>
  )
}
