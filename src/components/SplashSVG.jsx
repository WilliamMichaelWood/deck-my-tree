import { useEffect, useRef, useState, useMemo } from 'react'
import './SplashSVG.css'

function getSplashSpeed() {
  try {
    const data = JSON.parse(localStorage.getItem('splashSeen') || '{}')
    if (data.ts && Date.now() - data.ts < 86_400_000) return 2 / 3
  } catch {}
  return 1
}

// ─── Gold snow (identical to CurationModal) ───────────────────────
const SNOW = Array.from({ length: 22 }, (_, i) => ({
  id:       i,
  left:     ((i * 37.3 + 11)   % 100).toFixed(1),
  size:     (2 + (i * 0.19)    % 3).toFixed(1),
  delay:    -((i * 0.47 + 0.3) % 7).toFixed(2),
  duration: (4 + (i * 0.31)    % 3).toFixed(1),
  opacity:  (0.3 + (i * 0.023) % 0.5).toFixed(2),
}))

// ─── Gold sparks that explode outward at the Lumos moment ─────────
const SPARKS = Array.from({ length: 24 }, (_, i) => {
  const a    = (i / 24) * 2 * Math.PI
  const dist = 70 + (i % 6) * 18                                    // 70–178px
  const SIZES = [12, 4, 3, 7, 10, 3, 5, 4, 11, 3, 8, 4,
                  3, 12, 3, 6, 5, 9, 3, 5, 4, 10, 3, 6]
  return {
    id:    i,
    dx:    Math.round(Math.cos(a) * dist),
    dy:    Math.round(Math.sin(a) * dist),
    size:  SIZES[i],
    delay: Math.round(i * 18),                                       // stagger per spark
  }
})

export default function SplashSVG({ onFinish }) {
  const sm            = useMemo(getSplashSpeed, [])
  const [phase, setPhase] = useState(0)
  const audioRef      = useRef(null)
  const audioUnlocked = useRef(false)
  const done          = useRef(false)

  // ── Phase schedule ────────────────────────────────────────────
  // Phase 1  (50ms):   snow falls, a pinpoint of gold light gathers
  // Phase 2 (600ms):   LUMOS — logo erupts from the point of light,
  //                    radial clip-path expands, sparks scatter, chime
  // Phase 3 (1600ms):  logo fully revealed, warm glow settles
  // Phase 4 (2400ms):  everything fades to app
  // Done    (2900ms):  unmount
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),
      setTimeout(() => setPhase(2), T(600)),
      setTimeout(() => setPhase(3), T(1600)),
      setTimeout(() => setPhase(4), T(2400)),
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(2900)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 2 && audioRef.current) {
      audioRef.current.volume = 0.5
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

      {/* ── Falling gold snow (always) ───────────────────────── */}
      {SNOW.map(p => (
        <div key={p.id} aria-hidden="true" className="splash-snow" style={{
          left:              `${p.left}%`,
          width:             `${p.size}px`,
          height:            `${p.size}px`,
          opacity:           p.opacity,
          animationDelay:    `${p.delay}s`,
          animationDuration: `${p.duration}s`,
        }} />
      ))}

      {/* ── Gathering orb — energy concentrating before Lumos ── */}
      <div className={`splash-gather splash-gather-p${phase}`} aria-hidden="true" />

      {/* ── Logo — revealed by expanding circle of light ─────── */}
      <div className={`splash-logo-wrap splash-lp${phase}`} aria-hidden="true">
        <img src="/logo.png" alt="" className="splash-logo" />
      </div>

      {/* ── Lumos flash — blinding gold burst at reveal moment ── */}
      {phase >= 2 && (
        <div className="splash-lumos-flash" aria-hidden="true" />
      )}

      {/* ── Gold sparks scatter from logo center outward ─────── */}
      {phase >= 2 && SPARKS.map(s => (
        <div
          key={s.id}
          className="splash-spark"
          aria-hidden="true"
          style={{
            '--dx':    `${s.dx}px`,
            '--dy':    `${s.dy}px`,
            '--sz':    `${s.size}px`,
            '--delay': `${Math.round(s.delay * sm)}ms`,
          }}
        />
      ))}
    </div>
  )
}
