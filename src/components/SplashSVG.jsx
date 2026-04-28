import { useEffect, useRef, useState, useMemo } from 'react'
import './SplashSVG.css'

function getSplashSpeed() {
  try {
    const data = JSON.parse(localStorage.getItem('splashSeen') || '{}')
    if (data.ts && Date.now() - data.ts < 86_400_000) return 2 / 3
  } catch {}
  return 1
}

// ─── 28 gold particles that drift INWARD toward the logo ─────────
// Positioned in a ring around the screen, each drifting ~halfway in.
// vmin units keep them proportional on any screen size.
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const a   = (i / 28) * 2 * Math.PI + i * 0.41
  const sr  = 36 + (i % 6) * 6           // start radius: 36–66 vmin
  const er  = sr * 0.48                   // end radius: ~halfway to center
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return {
    id:       i,
    sx:       `${(cos * sr).toFixed(1)}vmin`,
    sy:       `${(sin * sr).toFixed(1)}vmin`,
    ex:       `${(cos * er).toFixed(1)}vmin`,
    ey:       `${(sin * er).toFixed(1)}vmin`,
    size:     (1.2 + (i % 5) * 0.65).toFixed(1),
    opacity:  (0.18 + (i % 7) * 0.09).toFixed(2),
    delay:    ((i * 0.23) % 1.4).toFixed(2),
    duration: (3.8 + (i * 0.19) % 1.8).toFixed(1),
  }
})

// ─── 8 star twinkles positioned around the logo circumference ────
const TWINKLE_R = 152   // px from screen center
const TWINKLES  = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * 2 * Math.PI + 0.38
  return {
    id:    i,
    x:     Math.round(Math.cos(a) * TWINKLE_R),
    y:     Math.round(Math.sin(a) * TWINKLE_R),
    size:  6 + (i % 3) * 5,
    delay: Math.round(i * 60),
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
  // Phase 1 (100ms):   glow blooms, particles begin drifting inward,
  //                    logo fades + scales in over 0.95s
  // Phase 2 (1700ms):  shimmer sweeps L→R across logo + star twinkles
  //                    + soft chime
  // Phase 3 (2600ms):  fade to app
  // Done    (3100ms):  unmount
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))

    // Respect prefers-reduced-motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPhase(2)
      const t = setTimeout(() => { done.current = true; onFinish() }, 1200)
      return () => clearTimeout(t)
    }

    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(100)),
      setTimeout(() => setPhase(2), T(1700)),
      setTimeout(() => setPhase(3), T(2600)),
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(3100)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Soft chime when shimmer fires ────────────────────────────
  useEffect(() => {
    if (phase === 2 && audioRef.current) {
      audioRef.current.volume = 0.28
      audioRef.current.play().catch(() => {})
    }
  }, [phase])

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

      {/* ── Warm glow that blooms behind logo ────────────────── */}
      <div className={`splash-glow splash-glow-p${phase}`} aria-hidden="true" />

      {/* ── Gold particles drifting inward ────────────────────── */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          aria-hidden="true"
          className="splash-particle"
          style={{
            '--sx': p.sx, '--sy': p.sy,
            '--ex': p.ex, '--ey': p.ey,
            '--po': p.opacity,
            width:  `${p.size}px`,
            height: `${p.size}px`,
            animation: phase >= 1
              ? `particleIn ${p.duration}s ease-in-out ${p.delay}s infinite`
              : 'none',
          }}
        />
      ))}

      {/* ── Logo stage ───────────────────────────────────────── */}
      <div className="splash-logo-stage" aria-hidden="true">

        {/* Logo: summoned from golden light */}
        <img
          src="/logo.png"
          alt=""
          className={`splash-logo splash-logo-p${phase}`}
        />

        {/* Shimmer sweep across logo (phase 2+) */}
        {phase >= 2 && (
          <div className="splash-shimmer-wrap" aria-hidden="true">
            <div className="splash-shimmer" />
          </div>
        )}
      </div>

      {/* ── Star twinkles around logo edges (phase 2+) ───────── */}
      {phase >= 2 && TWINKLES.map(t => (
        <div
          key={t.id}
          className="splash-twinkle"
          aria-hidden="true"
          style={{
            left:    `calc(50% + ${t.x}px)`,
            top:     `calc(50% + ${t.y}px)`,
            '--td':  `${Math.round(t.delay * sm)}ms`,
          }}
        >
          {/* 4-pointed star — elegant, not cartoonish */}
          <svg viewBox="0 0 20 20" width={t.size} height={t.size} aria-hidden="true">
            <path
              d="M10,1 L11.4,8.6 L19,10 L11.4,11.4 L10,19 L8.6,11.4 L1,10 L8.6,8.6 Z"
              fill="#F4D88A"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
