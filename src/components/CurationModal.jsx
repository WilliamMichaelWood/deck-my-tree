import { useState, useEffect, useRef, useMemo } from 'react'

const MESSAGES = [
  'Your stylist is selecting…',
  'Weaving the magic…',
  'Enchanting your tree…',
  'Almost ready to sleigh…',
]

// ── Color palette — cycles every COLOR_MS ms ──────────────────────────────────
const COLORS = [
  { base: '#c9a84c', light: '#f8ec80', dark: '#8a6010' },  // gold
  { base: '#9b1c2c', light: '#e05060', dark: '#5e0e18' },  // cranberry
  { base: '#0d4a2a', light: '#1a8050', dark: '#072a18' },  // emerald
  { base: '#1a2a6b', light: '#3a5ac0', dark: '#0a1238' },  // sapphire
]
const COLOR_MS = 1500

// ── Burst geometry — 8 directions, 55 px travel ───────────────────────────────
const BURST_DIRS = Array.from({ length: 8 }, (_, i) => {
  const rad = (i * 45) * Math.PI / 180
  return { tx: Math.round(Math.sin(rad) * 55), ty: Math.round(-Math.cos(rad) * 55) }
})
const BURST_MS = 600

// ── Sparkle ring — 8 sparkles, 65 px orbit, 3 s period ───────────────────────
const ORBIT_R   = 65
const ORBIT_DUR = 3
const SPARKLE_RING = Array.from({ length: 8 }, (_, i) => ({
  id:    i,
  // Negative delay pre-positions each sparkle evenly around the ring
  delay: -(i / 8 * ORBIT_DUR),
}))

// ── Snow particles ────────────────────────────────────────────────────────────
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

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
/*
 * cmBreathGlow — 1.5 s: scale 1→1.12→1 + drop-shadow in sync.
 * Running on the wrapper div means filter wraps the full visual output.
 */
@keyframes cmBreathGlow {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0  8px rgba(212,168,67,0.40));
  }
  50% {
    transform: scale(1.12);
    filter: drop-shadow(0 0 26px rgba(212,168,67,0.85));
  }
}

/*
 * cmWobble — 2 s: ornament tilts ±8°, pivoting around its visual centre.
 * Applied to the SVG <g> so it composes independently with the scale above.
 */
@keyframes cmWobble {
  0%   { transform: rotate(-8deg); }
  50%  { transform: rotate( 8deg); }
  100% { transform: rotate(-8deg); }
}

/*
 * cmOrbit3 — ${ORBIT_DUR} s: sparkle travels a ${ORBIT_R}px circular path.
 * The counter-rotate keeps the ✦ glyph upright throughout the orbit.
 */
@keyframes cmOrbit3 {
  from { transform: rotate(0deg)   translateY(-${ORBIT_R}px) rotate(0deg);    }
  to   { transform: rotate(360deg) translateY(-${ORBIT_R}px) rotate(-360deg); }
}

/*
 * cmDepth3 — same duration as orbit, same delay per sparkle → in sync.
 * 0%=back/top (small+dim) → 50%=front/bottom (full size+bright) → 100%=back.
 */
@keyframes cmDepth3 {
  0%, 100% { transform: scale(0.4); opacity: 0.3; }
  50%       { transform: scale(1.0); opacity: 0.9; }
}

/* cmBurst — particle travels to (--tx, --ty) and fades/shrinks */
@keyframes cmBurst {
  0%   { transform: translate(0, 0)                     scale(1);    opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0.25); opacity: 0; }
}

/* Snow */
@keyframes cmSnow {
  0%   { transform: translateY(-10px) scale(0.8); opacity: 0;   }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(100vh) scale(1.2); opacity: 0; }
}

/* Copy cycling */
@keyframes cmMsgIn {
  from { opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  to   { opacity: 0; }
}
`

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function CurationModal({ visible }) {
  const [msgIdx,   setMsgIdx]   = useState(0)
  const [msgKey,   setMsgKey]   = useState(0)
  const [colorIdx, setColorIdx] = useState(0)
  const [bursts,   setBursts]   = useState([])
  // Guard: skip burst on initial mount; reset when modal closes
  const cycleCount = useRef(0)
  const snow = useSnow()

  // ── Text + color cycling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      cycleCount.current = 0
      setColorIdx(0)
      setBursts([])
      return
    }
    // Reset text
    setMsgIdx(0)
    setMsgKey(k => k + 1)

    const msgIv = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
      setMsgKey(k => k + 1)
    }, 2500)

    const colorIv = setInterval(() => {
      cycleCount.current += 1
      setColorIdx(prev => (prev + 1) % COLORS.length)
    }, COLOR_MS)

    return () => { clearInterval(msgIv); clearInterval(colorIv) }
  }, [visible])

  // ── Burst on each color change (skip initial mount) ───────────────────────
  useEffect(() => {
    if (!visible || cycleCount.current === 0) return
    const color = COLORS[colorIdx].base
    const id    = Date.now()
    setBursts(b => [...b, { id, color }])
    const t = setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), BURST_MS + 200)
    return () => clearTimeout(t)
  }, [colorIdx, visible])

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
      <style>{CSS}</style>

      {/* Snow — behind card */}
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

        {/* 140 × 140 animation container */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>

          {/* ── Gold circle border ── */}
          <svg width="140" height="140" viewBox="0 0 140 140"
            style={{
              position: 'absolute', top: 0, left: 0,
              filter:   'drop-shadow(0 0 4px rgba(212,168,67,0.3))',
              zIndex:   1,
            }}
            aria-hidden="true"
          >
            <circle cx="70" cy="70" r="66" fill="none" stroke="#c9a84c" strokeWidth="3.5" />
          </svg>

          {/* ── Ornament: breath+glow → SVG → wobble ──
                Outer div: cmBreathGlow (scale + drop-shadow, 1.5 s)
                SVG <g>:   cmWobble (rotate ±8°, 2 s)
                The two animations run on different elements so their
                transform stacks compose without interfering.          */}
          <div style={{
            position:  'absolute',
            inset:     0,
            animation: 'cmBreathGlow 1.5s ease-in-out infinite',
            zIndex:    2,
          }}>
            <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
              <defs>
                {COLORS.map((c, i) => (
                  <radialGradient key={i} id={`cmCG${i}`} cx="30%" cy="26%" r="70%">
                    <stop offset="0%"   stopColor={c.light} />
                    <stop offset="40%"  stopColor={c.base}  />
                    <stop offset="100%" stopColor={c.dark}  />
                  </radialGradient>
                ))}
              </defs>

              {/* Wobble group — pivots around ornament centre (70, 70) */}
              <g style={{ transformOrigin: '70px 70px', animation: 'cmWobble 2s ease-in-out infinite' }}>

                {/* Color circles — only the active one is opaque */}
                {COLORS.map((_, i) => (
                  <circle key={i} cx="70" cy="70" r="40"
                    fill={`url(#cmCG${i})`}
                    style={{
                      opacity:    colorIdx === i ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                    }}
                  />
                ))}

                {/* Primary specular highlight — large upper-left ellipse */}
                <ellipse cx="51" cy="51" rx="15" ry="9"
                  fill="rgba(255,255,255,0.52)"
                  transform="rotate(-20 51 51)"
                />
                {/* Secondary glint — subtle lower-right */}
                <ellipse cx="86" cy="85" rx="5" ry="3"
                  fill="rgba(255,255,255,0.16)"
                  transform="rotate(-20 86 85)"
                />

                {/* Cap stem */}
                <rect x="67" y="24" width="6" height="16" rx="2" fill="#c9a84c" />
                {/* Cap ring */}
                <ellipse cx="70" cy="24" rx="5" ry="2.5"
                  fill="none" stroke="#c9a84c" strokeWidth="1.5" />
              </g>
            </svg>
          </div>

          {/* ── Orbiting sparkles ──
                Each sparkle uses TWO nested divs:
                  Outer: orbit rotation (cmOrbit3, 3 s)
                  Inner: size + opacity depth illusion (cmDepth3, 3 s)
                Both share the same negative delay, so depth phase ↔ orbit
                position always match: back=small+dim, front=large+bright.  */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
            {SPARKLE_RING.map(s => (
              <div key={s.id} style={{
                position:   'absolute',
                top:        '50%',
                left:       '50%',
                width:      12,
                height:     12,
                marginTop:  -6,
                marginLeft: -6,
                animation:  `cmOrbit3 ${ORBIT_DUR}s linear ${s.delay}s infinite`,
              }}>
                <div style={{
                  width:          '100%',
                  height:         '100%',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       11,
                  lineHeight:     1,
                  color:          '#c9a84c',
                  animation:      `cmDepth3 ${ORBIT_DUR}s ease-in-out ${s.delay}s infinite`,
                }}>
                  ✦
                </div>
              </div>
            ))}
          </div>

          {/* ── Burst particles ──
                A new burst group is mounted each time the color changes.
                8 particles travel outward in 45° increments over BURST_MS.
                State cleanup removes the group ~200 ms after animation ends. */}
          {bursts.map(burst => (
            <div key={burst.id}
              style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}
              aria-hidden="true"
            >
              {BURST_DIRS.map((dir, i) => (
                <div key={i} style={{
                  position:       'absolute',
                  top:            '50%',
                  left:           '50%',
                  width:          8,
                  height:         8,
                  marginTop:      -4,
                  marginLeft:     -4,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       8,
                  lineHeight:     1,
                  color:          burst.color,
                  '--tx':         `${dir.tx}px`,
                  '--ty':         `${dir.ty}px`,
                  animation:      `cmBurst ${BURST_MS}ms ease-out forwards`,
                }}>
                  ✦
                </div>
              ))}
            </div>
          ))}

        </div>

        {/* Cycling copy */}
        <p key={msgKey} style={{
          margin:        0,
          fontSize:      14,
          lineHeight:    1.5,
          color:         '#0f1f35',
          fontFamily:    'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight:    500,
          textAlign:     'center',
          letterSpacing: '0.01em',
          animation:     'cmMsgIn 2.5s ease both',
        }}>
          {MESSAGES[msgIdx]}
        </p>

      </div>
    </div>
  )
}
