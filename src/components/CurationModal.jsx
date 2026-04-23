import { useState, useEffect, useMemo } from 'react'

const MESSAGES = [
  'Your stylist is selecting…',
  'Weaving the magic…',
  'Enchanting your tree…',
  'Almost ready to sleigh…',
]

// ── Snow particles (behind everything) ───────────────────────────────────────
const SNOW_COUNT = 22

function useSnow() {
  return useMemo(() => Array.from({ length: SNOW_COUNT }, (_, i) => ({
    id:       i,
    left:     Math.random() * 100,
    size:     Math.random() * 3 + 2,
    delay:    Math.random() * 4,
    duration: Math.random() * 3 + 4,
    opacity:  Math.random() * 0.5 + 0.3,
  })), [])
}

// ── Orbiting sparkles ─────────────────────────────────────────────────────────
const SPARKLE_COUNT  = 12
const ORBIT_RADIUS   = 60   // px from centre
const ORBIT_DUR      = 4    // seconds per revolution

function useSparkles() {
  return useMemo(() => Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
    id:          i,
    // Negative delay staggers each sparkle evenly around the ring at t=0
    orbitDelay:  -((i / SPARKLE_COUNT) * ORBIT_DUR),
    glowDelay:   -(Math.random() * 2),
    glowDuration: 1.4 + Math.random() * 1.2,
  })), [])
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
/* Ornament spin — rotates the whole group around the ball centre */
@keyframes cmOrnSpin {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}

/* Colour shift — hue-rotate cycles gold→emerald→cranberry→gold */
/* Gold #c9a84c ≈ hue 43°; Emerald #0d4a2a ≈ hue 148° (+105°);  */
/* Cranberry #9b1c2c ≈ hue 350° (+307°)                           */
@keyframes cmOrnColor {
  0%   { filter: hue-rotate(0deg);   }
  33%  { filter: hue-rotate(105deg); }
  66%  { filter: hue-rotate(307deg); }
  100% { filter: hue-rotate(360deg); }
}

/* Glow pulse — applied to the outer group so it wraps the hue-rotated content */
@keyframes cmGlowPulse {
  0%, 100% { filter: drop-shadow(0 0  6px rgba(212,168,67,0.45)); }
  50%       { filter: drop-shadow(0 0 18px rgba(212,168,67,0.80)); }
}

/* Orbit — sparkle travels a 60 px circular path; counter-rotate keeps ✦ upright */
@keyframes cmOrbit {
  from { transform: rotate(0deg)   translateY(-${ORBIT_RADIUS}px) rotate(0deg);    }
  to   { transform: rotate(360deg) translateY(-${ORBIT_RADIUS}px) rotate(-360deg); }
}

/* Sparkle opacity throb */
@keyframes cmSparkleGlow {
  0%, 100% { opacity: 0.25; }
  50%       { opacity: 0.90; }
}

/* Falling snow */
@keyframes cmSnow {
  0%   { transform: translateY(-10px) scale(0.8); opacity: 0;   }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(100vh) scale(1.2); opacity: 0; }
}

/* Copy fade */
@keyframes cmMsgIn {
  from { opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  to   { opacity: 0; }
}
`

// Replace the template-literal radius with the actual number at module load
const LIVE_CSS = CSS.replace(/\$\{ORBIT_RADIUS\}/g, ORBIT_RADIUS)

// ── Spinning ornament SVG ─────────────────────────────────────────────────────
// Ball centred at (70, 70), r=32. Cap at top (67–73, 24–38).
// Outer <g> carries the pulsing glow (filter: drop-shadow).
// Inner <g> carries spin + colour shift on separate animation layers.
function SpinningOrnament() {
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
      <defs>
        {/* Metallic gold with highlights — gradient origin upper-left */}
        <radialGradient id="cmGG2" cx="32%" cy="28%" r="68%">
          <stop offset="0%"   stopColor="#f8ec80" />
          <stop offset="35%"  stopColor="#d4a843" />
          <stop offset="75%"  stopColor="#b88820" />
          <stop offset="100%" stopColor="#7a5808" />
        </radialGradient>
      </defs>

      {/* Outer group: glow pulse only */}
      <g style={{ animation: 'cmGlowPulse 2.5s ease-in-out infinite' }}>

        {/* Inner group: spin + colour cycle — pivots around ball centre (70,70) */}
        <g style={{
          transformOrigin: '70px 70px',
          animation: `cmOrnSpin ${ORBIT_DUR}s linear infinite, cmOrnColor 12s ease-in-out infinite`,
        }}>
          {/* String / cap */}
          <rect x="67" y="24" width="6" height="14" rx="2" fill="#c9a84c" />

          {/* Ball */}
          <circle cx="70" cy="70" r="32" fill="url(#cmGG2)" />

          {/* Primary specular highlight — large, upper-left */}
          <ellipse
            cx="54" cy="54" rx="13" ry="8"
            fill="rgba(255,255,255,0.48)"
            transform="rotate(-20 54 54)"
          />

          {/* Secondary glint — small, lower-right */}
          <ellipse
            cx="84" cy="84" rx="5" ry="3"
            fill="rgba(255,255,255,0.14)"
            transform="rotate(-20 84 84)"
          />
        </g>
      </g>
    </svg>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function CurationModal({ visible }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgKey, setMsgKey] = useState(0)
  const snow     = useSnow()
  const sparkles = useSparkles()

  useEffect(() => {
    if (!visible) return
    setMsgIdx(0)
    setMsgKey(k => k + 1)
    const iv = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
      setMsgKey(k => k + 1)
    }, 2500)
    return () => clearInterval(iv)
  }, [visible])

  if (!visible) return null

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      background:     'linear-gradient(135deg, rgba(15,31,53,0.82) 0%, rgba(26,10,46,0.72) 100%)',
      zIndex:         300,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      overflow:       'hidden',
    }}>
      <style>{LIVE_CSS}</style>

      {/* Falling snow — rendered first, sits behind card */}
      {snow.map(p => (
        <div key={p.id} aria-hidden="true" style={{
          position:      'absolute',
          top:           0,
          left:          `${p.left}%`,
          width:         p.size,
          height:        p.size,
          borderRadius:  '50%',
          background:    '#d4a843',
          opacity:       p.opacity,
          animation:     `cmSnow ${p.duration}s ease-in ${p.delay}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Card */}
      <div style={{
        background:    '#f8f4ec',
        borderRadius:  20,
        border:        '2px solid #c9a84c',
        width:         280,
        padding:       '44px 32px 40px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           28,
        boxShadow:     '0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(212,168,67,0.2)',
        position:      'relative',
        zIndex:        1,
      }}>

        {/* Animation container — 140×140, same footprint as the gold ring */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>

          {/* Gold circle border */}
          <svg
            width="140" height="140" viewBox="0 0 140 140"
            style={{
              position: 'absolute', top: 0, left: 0,
              filter:   'drop-shadow(0 0 4px rgba(212,168,67,0.3))',
            }}
            aria-hidden="true"
          >
            <circle cx="70" cy="70" r="66" fill="none" stroke="#c9a84c" strokeWidth="3.5" />
          </svg>

          {/* Spinning ornament */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <SpinningOrnament />
          </div>

          {/* Orbiting ✦ sparkles */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {sparkles.map(s => (
              <div
                key={s.id}
                aria-hidden="true"
                style={{
                  position:      'absolute',
                  top:           '50%',
                  left:          '50%',
                  // Centre the 8×8 glyph on the orbit origin
                  width:         8,
                  height:        8,
                  marginTop:     -4,
                  marginLeft:    -4,
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'center',
                  fontSize:      9,
                  lineHeight:    1,
                  color:         '#c9a84c',
                  pointerEvents: 'none',
                  // Two simultaneous animations: orbit path + opacity throb
                  animation:     [
                    `cmOrbit ${ORBIT_DUR}s linear ${s.orbitDelay}s infinite`,
                    `cmSparkleGlow ${s.glowDuration}s ease-in-out ${s.glowDelay}s infinite`,
                  ].join(', '),
                }}
              >
                ✦
              </div>
            ))}
          </div>

        </div>

        {/* Cycling copy */}
        <p
          key={msgKey}
          style={{
            margin:        0,
            fontSize:      14,
            lineHeight:    1.5,
            color:         '#0f1f35',
            fontFamily:    'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontWeight:    500,
            textAlign:     'center',
            letterSpacing: '0.01em',
            animation:     'cmMsgIn 2.5s ease both',
          }}
        >
          {MESSAGES[msgIdx]}
        </p>

      </div>
    </div>
  )
}
