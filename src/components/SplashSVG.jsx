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

// ─── 20 burst sparkles — varying sizes for depth ─────────────────
const SIZES = [8, 4, 2, 4, 8, 2, 8, 4, 2, 4, 8, 4, 2, 8, 4, 2, 4, 8, 2, 4]
const BURST_SPARKS = Array.from({ length: 20 }, (_, i) => {
  const a    = (i * 18) * Math.PI / 180
  const dist = 80 + (i % 5) * 10 // 80–120px
  return {
    id:    i,
    dx:    Math.round(Math.cos(a) * dist),
    dy:    Math.round(Math.sin(a) * dist),
    size:  SIZES[i],
    delay: i * 15,
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
  // Phase 1  (50ms):    logo fades + scales in (0.7→1.0) over 0.4s
  // Phase 2 (400ms):    burst erupts behind logo + glow + chime
  // Phase 3 (800ms):    glow dims, logo pulses (1.0→1.06→1.0)
  // Phase 4 (1800ms):   hold with subtle glow
  // Phase 5 (2500ms):   fade out
  // Done    (3000ms):   unmount
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),
      setTimeout(() => setPhase(2), T(400)),
      setTimeout(() => setPhase(3), T(800)),
      setTimeout(() => setPhase(4), T(1800)),
      setTimeout(() => setPhase(5), T(2500)),
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(3000)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chime at phase 2 (burst moment) ─────────────────────────
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
        <div className="splash-logo-inner">

          {/* Glow disc — behind logo (z-index 1) */}
          <div className={`splash-logo-glow splash-glow-p${phase}`} />

          {/* Burst sparkles — behind logo (z-index 1) */}
          {phase >= 2 && BURST_SPARKS.map(s => (
            <div
              key={s.id}
              className="splash-burst-ptcl"
              aria-hidden="true"
              style={{
                '--dx':   `${s.dx}px`,
                '--dy':   `${s.dy}px`,
                '--bd':   `${s.delay}ms`,
                '--sz':   `${s.size}px`,
              }}
            />
          ))}

          {/* Logo — on top (z-index 2) */}
          <img
            src="/logo.png"
            alt=""
            className={`splash-logo-img splash-logo-p${phase}`}
          />

        </div>
      </div>
    </div>
  )
}
