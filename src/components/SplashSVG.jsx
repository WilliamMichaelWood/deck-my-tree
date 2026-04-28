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

// ─── Gold snow — same style as CurationModal ─────────────────────
// Deterministic (no Math.random) so server + client match.
// Negative delays = particles already mid-fall on load (no empty screen).
const SNOW = Array.from({ length: 22 }, (_, i) => ({
  id:       i,
  left:     ((i * 37.3 + 11)   % 100).toFixed(1),
  size:     (2 + (i * 0.19)    % 3).toFixed(1),
  delay:    -((i * 0.47 + 0.3) % 7).toFixed(2),   // pre-started
  duration: (4 + (i * 0.31)    % 3).toFixed(1),
  opacity:  (0.3 + (i * 0.023) % 0.5).toFixed(2),
}))

// ─────────────────────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const sm            = useMemo(getSplashSpeed, [])
  const [phase, setPhase] = useState(0)
  const audioRef      = useRef(null)
  const audioUnlocked = useRef(false)
  const done          = useRef(false)

  // ── Phase schedule ────────────────────────────────────────────
  // Phase 1  (50ms):   logo fades in (scale 0.9→1.0, opacity 0→1)
  // Phase 2 (500ms):   glow blooms behind logo + chime
  // Phase 3 (1200ms):  hold — logo + glow + snow
  // Phase 4 (2500ms):  fade to app
  // Done    (3000ms):  unmount
  useEffect(() => {
    localStorage.setItem('splashSeen', JSON.stringify({ ts: Date.now() }))
    const T = (ms) => Math.round(ms * sm)
    const timers = [
      setTimeout(() => setPhase(1), T(50)),
      setTimeout(() => setPhase(2), T(500)),
      setTimeout(() => setPhase(3), T(1200)),
      setTimeout(() => setPhase(4), T(2500)),
      setTimeout(() => { if (!done.current) { done.current = true; onFinish() } }, T(3000)),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chime at glow bloom ──────────────────────────────────────
  useEffect(() => {
    if (phase === 2 && audioRef.current) {
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

      {/* ── Gold snow particles (same as CurationModal) ──────── */}
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

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className={`splash-logo-wrap splash-lp${phase}`} aria-hidden="true">
        <img src="/logo.png" alt="" className="splash-logo" />
      </div>
    </div>
  )
}
