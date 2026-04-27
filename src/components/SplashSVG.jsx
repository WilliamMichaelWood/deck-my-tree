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

// ─── 12 burst sparkles radiating from logo center ────────────────
const BURST_SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30) * Math.PI / 180
  return {
    id: i,
    dx: Math.round(Math.cos(a) * 90),
    dy: Math.round(Math.sin(a) * 90),
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
  // Phase 1 (50ms):    logo fades + scales in
  // Phase 2 (600ms):   logo pulses
  // Phase 3 (2000ms):  sparkle burst + chime
  // Phase 4 (2500ms):  hold steady
  // Phase 5 (3000ms):  fade out
  // Done  (3300ms):    unmount
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),
      setTimeout(() => setPhase(2), T(600)),
      setTimeout(() => setPhase(3), T(2000)),
      setTimeout(() => setPhase(4), T(2500)),
      setTimeout(() => setPhase(5), T(3000)),
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(3300)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play sparkle chime at phase 3 ───────────────────────────
  useEffect(() => {
    if (phase === 3 && audioRef.current) {
      audioRef.current.volume = 0.4
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

      {/* ── Logo + sparkle burst ─────────────────────────────── */}
      <div className="splash-logo-wrap" aria-hidden="true">
        <div className="splash-logo-inner">
          <img src="/logo.png" alt="" className={`splash-logo-img splash-logo-p${phase}`} />

          {/* Glow ring at phase 3 */}
          {phase >= 3 && (
            <div className="splash-logo-glow" />
          )}

          {/* 12 burst sparkles at phase 3 */}
          {phase >= 3 && BURST_SPARKS.map(s => (
            <div
              key={s.id}
              className="splash-burst-ptcl"
              aria-hidden="true"
              style={{
                '--dx': `${s.dx}px`,
                '--dy': `${s.dy}px`,
                '--bd': `${s.id * 40}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
