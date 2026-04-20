import { useState, useEffect } from 'react'

const MESSAGES = [
  'Your stylist is curating…',
  'Finding the perfect ornaments…',
  'Building your holiday vision…',
  'Almost ready…',
]

// ── Simple 3-tier Christmas tree silhouette, 60 × 80 px ──────────────────────
// When rotating, max corner distance from centre ≈ 50 px.
// Gold circle inner radius is 64.5 px → comfortable ~14 px clearance at worst angle.
function TreeSilhouette() {
  return (
    <svg width="60" height="80" viewBox="0 0 60 80" aria-hidden="true">
      {/* Three-tier body */}
      <path
        d="M30,4 L21,26 L25,26 L16,46 L20,46 L10,66 L50,66 L40,46 L44,46 L35,26 L39,26 Z"
        fill="#0f1f35"
      />
      {/* Trunk */}
      <rect x="22" y="66" width="16" height="12" rx="2" fill="#0f1f35"/>
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
`

// ── Props ─────────────────────────────────────────────────────────────────────
// visible — boolean; modal renders (and blocks interaction) while true
export default function CurationModal({ visible }) {
  console.log('CurationModal mounted/rendered, visible prop:', visible)
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgKey, setMsgKey] = useState(0)

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
      position:        'fixed',
      inset:           0,
      background:      'rgba(15, 31, 53, 0.75)',
      zIndex:          300,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
    }}>
      <style>{CSS}</style>

      {/* Card */}
      <div style={{
        background:    '#f8f4ec',
        borderRadius:  20,
        width:         280,
        padding:       '44px 32px 40px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           28,
        boxShadow:     '0 24px 64px rgba(0,0,0,0.4)',
      }}>

        {/* Gold ring + spinning tree ── */}
        {/* Ring is static; inner div rotates the tree inside it.             */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>

          {/* Static gold circle border */}
          <svg
            width="140" height="140" viewBox="0 0 140 140"
            style={{ position: 'absolute', top: 0, left: 0 }}
            aria-hidden="true"
          >
            <circle cx="70" cy="70" r="66" fill="none" stroke="#c9a84c" strokeWidth="3"/>
          </svg>

          {/* Rotating tree — centred absolutely so it spins around its own centre */}
          <div style={{
            position:        'absolute',
            inset:           0,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            animation:       'cmTreeSpin 3s linear infinite',
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
