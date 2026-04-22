import { useState, useEffect, useMemo } from 'react'

const MESSAGES = [
  'Your stylist is selecting…',
  'Weaving the magic…',
  'Enchanting your tree…',
  'Almost ready to sleigh…',
]

// ── Sparkle particles — gold-tinted, small ───────────────────────────────────
const PARTICLE_COUNT = 22

function useParticles() {
  return useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    left:     Math.random() * 100,        // vw %
    size:     Math.random() * 3 + 2,      // 2–5 px
    delay:    Math.random() * 4,          // s
    duration: Math.random() * 3 + 4,     // 4–7 s
    opacity:  Math.random() * 0.5 + 0.3, // 0.3–0.8
  })), [])
}

// ── Tree + star icon ─────────────────────────────────────────────────────────
function TreeSilhouette() {
  return (
    <svg width="60" height="88" viewBox="0 0 60 88" aria-hidden="true">
      {/* Star on top */}
      <polygon
        points="30,0 32.4,7.3 40,7.3 34,11.8 36.4,19.1 30,14.6 23.6,19.1 26,11.8 20,7.3 27.6,7.3"
        fill="#d4a843"
      />
      {/* Three-tier body */}
      <path
        d="M30,18 L21,38 L25,38 L16,56 L20,56 L10,76 L50,76 L40,56 L44,56 L35,38 L39,38 Z"
        fill="#0f1f35"
      />
      {/* Trunk */}
      <rect x="22" y="76" width="16" height="10" rx="2" fill="#0f1f35"/>
    </svg>
  )
}

const CSS = `
@keyframes cmTreeSpin {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}
@keyframes cmMsgIn {
  from { opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes cmSparkle {
  0%   { transform: translateY(-10px) scale(0.8); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(100vh) scale(1.2); opacity: 0; }
}
`

// ── Props ─────────────────────────────────────────────────────────────────────
// visible — boolean; modal renders (and blocks interaction) while true
export default function CurationModal({ visible }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgKey, setMsgKey] = useState(0)
  const particles = useParticles()

  // Reset copy cycle each time the modal opens
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
      <style>{CSS}</style>

      {/* Falling sparkle particles */}
      {particles.map(p => (
        <div
          key={p.id}
          aria-hidden="true"
          style={{
            position:         'absolute',
            top:              0,
            left:             `${p.left}%`,
            width:            p.size,
            height:           p.size,
            borderRadius:     '50%',
            background:       '#d4a843',
            opacity:          p.opacity,
            animation:        `cmSparkle ${p.duration}s ease-in ${p.delay}s infinite`,
            pointerEvents:    'none',
          }}
        />
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

        {/* Gold ring + spinning tree */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>

          {/* Static gold circle border with glow */}
          <svg
            width="140" height="140" viewBox="0 0 140 140"
            style={{
              position: 'absolute', top: 0, left: 0,
              filter: 'drop-shadow(0 0 4px rgba(212,168,67,0.3))',
            }}
            aria-hidden="true"
          >
            <circle cx="70" cy="70" r="66" fill="none" stroke="#c9a84c" strokeWidth="3.5"/>
          </svg>

          {/* Rotating tree with glow */}
          <div style={{
            position:       'absolute',
            inset:          0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            animation:      'cmTreeSpin 4s linear infinite',
            filter:         'drop-shadow(0 0 8px rgba(212,168,67,0.4))',
          }}>
            <TreeSilhouette />
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
