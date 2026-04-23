import { useState, useEffect, useMemo } from 'react'

const MESSAGES = [
  'Growing your vision…',
  'Ornaments taking shape…',
  'Tree coming alive…',
  'Almost there…',
]

// ── Falling sparkle particles (gold-tinted) ───────────────────────────────────
const PARTICLE_COUNT = 22

function useParticles() {
  return useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id:       i,
    left:     Math.random() * 100,
    size:     Math.random() * 3 + 2,
    delay:    Math.random() * 4,
    duration: Math.random() * 3 + 4,
    opacity:  Math.random() * 0.5 + 0.3,
  })), [])
}

// ── Growing-tree animation timing (3.5 s loop) ────────────────────────────────
// All keyframe percentages are derived from the target wall-clock times:
//   Phase 1 — central ornament :  0.0–0.3 s  (  0 –  9 %)
//   Phase 2 — tier-1 branches  :  0.4–0.8 s  ( 11 – 23 %)
//   Phase 3 — tier-1 ornaments :  0.9–1.3 s  ( 26 – 37 %)
//   Phase 4 — tier-2 branches  :  1.4–1.8 s  ( 40 – 51 %)
//   Phase 5 — tier-2 ornaments :  1.9–2.3 s  ( 54 – 66 %)
//   Phase 6 — star              :  2.4–2.8 s  ( 69 – 80 %)
//   Phase 7 — radial glow       :  2.9–3.5 s  ( 83 –100 %)

const DUR = '3.5s'

const CSS = `
/* Phase 1 — central ornament */
@keyframes cmOrn0 {
  0%   { opacity: 0; transform: scale(0);   }
  9%   { opacity: 1; transform: scale(1.1); }
  12%  { opacity: 1; transform: scale(1);   }
  94%  { opacity: 1; transform: scale(1);   }
  100% { opacity: 0; transform: scale(0);   }
}

/* Phase 2 — tier-1 branches */
@keyframes cmBranch1 {
  0%   { stroke-dashoffset: 70; opacity: 0; }
  11%  { stroke-dashoffset: 70; opacity: 0; }
  13%  { stroke-dashoffset: 70; opacity: 1; }
  23%  { stroke-dashoffset: 0;  opacity: 1; }
  94%  { stroke-dashoffset: 0;  opacity: 1; }
  100% { stroke-dashoffset: 70; opacity: 0; }
}

/* Phase 3 — tier-1 ornaments */
@keyframes cmOrn1 {
  0%   { opacity: 0; transform: scale(0);   }
  26%  { opacity: 0; transform: scale(0);   }
  33%  { opacity: 1; transform: scale(1.1); }
  37%  { opacity: 1; transform: scale(1);   }
  94%  { opacity: 1; transform: scale(1);   }
  100% { opacity: 0; transform: scale(0);   }
}

/* Phase 4 — tier-2 branches */
@keyframes cmBranch2 {
  0%   { stroke-dashoffset: 90; opacity: 0; }
  40%  { stroke-dashoffset: 90; opacity: 0; }
  42%  { stroke-dashoffset: 90; opacity: 1; }
  51%  { stroke-dashoffset: 0;  opacity: 1; }
  94%  { stroke-dashoffset: 0;  opacity: 1; }
  100% { stroke-dashoffset: 90; opacity: 0; }
}

/* Phase 5 — tier-2 ornaments, staggered in three waves */
@keyframes cmOrn2a {
  0%   { opacity: 0; transform: scale(0);   }
  54%  { opacity: 0; transform: scale(0);   }
  61%  { opacity: 1; transform: scale(1.1); }
  65%  { opacity: 1; transform: scale(1);   }
  94%  { opacity: 1; transform: scale(1);   }
  100% { opacity: 0; transform: scale(0);   }
}
@keyframes cmOrn2b {
  0%   { opacity: 0; transform: scale(0);   }
  57%  { opacity: 0; transform: scale(0);   }
  65%  { opacity: 1; transform: scale(1.1); }
  69%  { opacity: 1; transform: scale(1);   }
  94%  { opacity: 1; transform: scale(1);   }
  100% { opacity: 0; transform: scale(0);   }
}
@keyframes cmOrn2c {
  0%   { opacity: 0; transform: scale(0);   }
  61%  { opacity: 0; transform: scale(0);   }
  69%  { opacity: 1; transform: scale(1.1); }
  73%  { opacity: 1; transform: scale(1);   }
  94%  { opacity: 1; transform: scale(1);   }
  100% { opacity: 0; transform: scale(0);   }
}

/* Phase 6 — gold star */
@keyframes cmStar {
  0%   { opacity: 0; transform: scale(0);   }
  69%  { opacity: 0; transform: scale(0);   }
  74%  { opacity: 1; transform: scale(1.3); }
  80%  { opacity: 1; transform: scale(1);   }
  94%  { opacity: 1; transform: scale(1);   }
  100% { opacity: 0; transform: scale(0);   }
}

/* Phase 7 — radial glow pulse */
@keyframes cmGlowPulse {
  0%, 83% { opacity: 0;   }
  89%      { opacity: 1;   }
  94%      { opacity: 0.6; }
  100%     { opacity: 0;   }
}

/* Trunk fades in alongside tier-1 ornaments */
@keyframes cmTrunk {
  0%   { opacity: 0; }
  26%  { opacity: 0; }
  37%  { opacity: 0.75; }
  94%  { opacity: 0.75; }
  100% { opacity: 0; }
}

/* Falling sparkle particles */
@keyframes cmSparkle {
  0%   { transform: translateY(-10px) scale(0.8); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(100vh) scale(1.2); opacity: 0; }
}

/* Cycling copy */
@keyframes cmMsgIn {
  from { opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  to   { opacity: 0; }
}
`

// ── Reusable ornament group ───────────────────────────────────────────────────
// Scales/fades around the circle centre (cx, cy) via explicit transformOrigin.
function Ornament({ cx, cy, r, gradId, capH = 6, anim }) {
  const capY = cy - r - capH + 1
  return (
    <g style={{ animation: anim, transformOrigin: `${cx}px ${cy}px` }}>
      {/* Cap */}
      <rect x={cx - 2} y={capY} width={4} height={capH} rx={1.5} fill="#c9a84c" />
      {/* Body */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />
      {/* Specular highlight */}
      <ellipse
        cx={cx - r * 0.28}  cy={cy - r * 0.32}
        rx={r * 0.38}       ry={r * 0.26}
        fill="rgba(255,255,255,0.45)"
        transform={`rotate(-20 ${cx - r * 0.28} ${cy - r * 0.32})`}
      />
    </g>
  )
}

// ── Growing tree SVG ──────────────────────────────────────────────────────────
// viewBox 0 0 140 140 matches the 140 × 140 gold-circle container.
// All tree elements sit within the r=66 circle (centre 70,70).
//
// Layout (y increases downward):
//   Star          : tip at (70, 12) — within r=58 from centre
//   Central ornament : cy=46, r=12
//   Tier-1 branches  : (70,46) → (40,72) and (100,72)
//   Tier-1 ornaments : (40,72) and (100,72)
//   Trunk segment    : (70,58) → (70,78)
//   Tier-2 branches  : (70,78) → (28,102) and (112,102)
//   Tier-2 ornaments : 5 ornaments spread across lower portion
//   Trunk base       : rect at (64,116)
function GrowingTree() {
  const a = (kf) => `${kf} ${DUR} ease infinite`

  return (
    <svg viewBox="0 0 140 140" width="140" height="140" overflow="visible" aria-hidden="true">
      <defs>
        <radialGradient id="cmGG" cx="35%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#f0d870" />
          <stop offset="55%"  stopColor="#d4a843" />
          <stop offset="100%" stopColor="#9a7018" />
        </radialGradient>
        <radialGradient id="cmGC" cx="35%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#e05060" />
          <stop offset="55%"  stopColor="#9b1c2c" />
          <stop offset="100%" stopColor="#5e0e18" />
        </radialGradient>
        <radialGradient id="cmGE" cx="35%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#1a8050" />
          <stop offset="55%"  stopColor="#0d4a2a" />
          <stop offset="100%" stopColor="#072a18" />
        </radialGradient>
        <radialGradient id="cmGW" cx="35%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="55%"  stopColor="#f0eee8" />
          <stop offset="100%" stopColor="#c4c0b8" />
        </radialGradient>
        <radialGradient id="cmGN" cx="35%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#2a4a7a" />
          <stop offset="55%"  stopColor="#0f1f35" />
          <stop offset="100%" stopColor="#060e1c" />
        </radialGradient>
        <radialGradient id="cmGlow" cx="50%" cy="58%" r="48%">
          <stop offset="0%"   stopColor="#d4a843" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#d4a843" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* Phase 7 — radial glow (renders first, sits behind everything) */}
      <circle cx="70" cy="78" r="62" fill="url(#cmGlow)"
        style={{ animation: a('cmGlowPulse') }}
      />

      {/* Trunk base rect */}
      <rect x="64" y="116" width="12" height="10" rx="2" fill="#5c3a1e"
        style={{ animation: a('cmTrunk') }}
      />

      {/* Trunk segment connecting the two branch tiers */}
      <line x1="70" y1="58" x2="70" y2="78"
        stroke="#1d5c3a" strokeWidth="3" strokeLinecap="round"
        style={{ animation: a('cmTrunk') }}
      />

      {/* Phase 4 — tier-2 branches */}
      <path d="M70,78 Q46,90 28,102"
        fill="none" stroke="#1d5c3a" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray="90" strokeDashoffset="90"
        style={{ animation: a('cmBranch2') }}
      />
      <path d="M70,78 Q94,90 112,102"
        fill="none" stroke="#1d5c3a" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray="90" strokeDashoffset="90"
        style={{ animation: a('cmBranch2') }}
      />

      {/* Phase 5 — tier-2 ornaments (three staggered waves) */}
      {/* Outer pair — cranberry / emerald */}
      <Ornament cx={28}  cy={102} r={9} gradId="cmGC" anim={a('cmOrn2a')} />
      <Ornament cx={112} cy={102} r={9} gradId="cmGE" anim={a('cmOrn2a')} />
      {/* Inner pair — white / navy */}
      <Ornament cx={48}  cy={108} r={8} gradId="cmGW" anim={a('cmOrn2b')} />
      <Ornament cx={92}  cy={108} r={8} gradId="cmGN" anim={a('cmOrn2b')} />
      {/* Centre bottom — gold */}
      <Ornament cx={70}  cy={112} r={8} gradId="cmGG" anim={a('cmOrn2c')} />

      {/* Phase 2 — tier-1 branches */}
      <path d="M70,46 Q52,62 40,72"
        fill="none" stroke="#1d5c3a" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="70" strokeDashoffset="70"
        style={{ animation: a('cmBranch1') }}
      />
      <path d="M70,46 Q88,62 100,72"
        fill="none" stroke="#1d5c3a" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="70" strokeDashoffset="70"
        style={{ animation: a('cmBranch1') }}
      />

      {/* Phase 3 — tier-1 ornaments */}
      <Ornament cx={40}  cy={72} r={9}  gradId="cmGC" anim={a('cmOrn1')} />
      <Ornament cx={100} cy={72} r={9}  gradId="cmGE" anim={a('cmOrn1')} />

      {/* Phase 1 — central ornament (gold, slightly larger) */}
      <Ornament cx={70}  cy={46} r={12} gradId="cmGG" capH={8} anim={a('cmOrn0')} />

      {/* Phase 6 — gold star on top */}
      <polygon
        points="70,12 72.4,19.3 80,19.3 74,23.8 76.4,31.1 70,26.6 63.6,31.1 66,23.8 60,19.3 67.6,19.3"
        fill="#d4a843"
        style={{
          animation:     a('cmStar'),
          transformOrigin: '70px 22px',
          filter:        'drop-shadow(0 0 6px rgba(212,168,67,0.9))',
        }}
      />
    </svg>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function CurationModal({ visible }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgKey, setMsgKey] = useState(0)
  const particles = useParticles()

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
        <div key={p.id} aria-hidden="true" style={{
          position:      'absolute',
          top:           0,
          left:          `${p.left}%`,
          width:         p.size,
          height:        p.size,
          borderRadius:  '50%',
          background:    '#d4a843',
          opacity:       p.opacity,
          animation:     `cmSparkle ${p.duration}s ease-in ${p.delay}s infinite`,
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

        {/* Gold circle frame + growing tree */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>

          {/* Static gold circle with glow */}
          <svg width="140" height="140" viewBox="0 0 140 140"
            style={{
              position: 'absolute', top: 0, left: 0,
              filter:   'drop-shadow(0 0 4px rgba(212,168,67,0.3))',
            }}
            aria-hidden="true"
          >
            <circle cx="70" cy="70" r="66" fill="none" stroke="#c9a84c" strokeWidth="3.5" />
          </svg>

          {/* Growing tree — fills the same 140×140 space */}
          <div style={{
            position: 'absolute',
            inset:    0,
            display:  'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GrowingTree />
          </div>
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
