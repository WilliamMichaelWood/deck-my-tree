import { useState, useEffect, useRef } from 'react'

// ── Copy ──────────────────────────────────────────────────────────────────────
const MESSAGES = [
  'Your stylist is curating the look\u2026',
  'Hunting down the perfect ornaments\u2026',
  'Building your holiday vision\u2026',
  'Almost ready to sleigh\u2026',
]

// ── SVG tree path — three-tier silhouette, viewBox 0 0 120 145 ───────────────
// Tier 1: apex (60,8) → base row y=44, width ±17 from center
// Tier 2: steps in 7 px, extends ±22 more, base row y=80
// Tier 3: steps in 9 px, extends ±27 more, base row y=115
// Trunk:  x 46–74, y 115–133
const TREE_PATH =
  'M60,8 L43,44 L50,44 L28,80 L37,80 L10,115 L46,115 L46,133 L74,133 L74,115 L110,115 L83,80 L92,80 L70,44 L77,44 Z'

const VH = 145   // SVG viewBox height
const VW = 120   // SVG viewBox width

// ── Particle burst ────────────────────────────────────────────────────────────
function makeParticles(n = 18) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
    const dist  = 48 + Math.random() * 58
    return {
      dx:    Math.round(Math.cos(angle) * dist),
      dy:    Math.round(Math.sin(angle) * dist),
      size:  +(2.5 + Math.random() * 3.5).toFixed(1),
      delay: +(Math.random() * 0.18).toFixed(2),
      color: ['#c9a84c', '#e8c86a', '#fffde7'][i % 3],
    }
  })
}

// ── Keyframes ─────────────────────────────────────────────────────────────────
const CSS = `
@keyframes slParticle {
  0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--pdx)), calc(-50% + var(--pdy))) scale(0.15); }
}
@keyframes slMsgIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

// ── Component ─────────────────────────────────────────────────────────────────
// Props:
//   isLoading      — true while the API call is in progress; flip to false when done
//   onExitComplete — called after the exit animation finishes (parent can unmount)
export default function SleighLoader({ isLoading, onExitComplete }) {
  // coverH: height of the dark rect hiding the gradient fill.
  // VH (145) = tree invisible; 0 = tree fully revealed.
  const [coverH,    setCoverH]    = useState(VH)
  const [fillDur,   setFillDur]   = useState('12s')
  const [msgIdx,    setMsgIdx]    = useState(0)
  const [msgKey,    setMsgKey]    = useState(0)
  const [particles, setParticles] = useState([])
  const [opacity,   setOpacity]   = useState(0)
  const doneRef = useRef(false)

  // Fade the overlay in
  useEffect(() => {
    const t = setTimeout(() => setOpacity(1), 40)
    return () => clearTimeout(t)
  }, [])

  // Kick off the slow fill: reveal to 93% (coverH → 10) over 12 s
  useEffect(() => {
    const t = setTimeout(() => setCoverH(10), 70)
    return () => clearTimeout(t)
  }, [])

  // Cycle messages every 2 s
  useEffect(() => {
    const iv = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
      setMsgKey(k => k + 1)
    }, 2000)
    return () => clearInterval(iv)
  }, [])

  // React when the API call finishes (isLoading flips false)
  useEffect(() => {
    if (!isLoading && !doneRef.current) {
      doneRef.current = true
      // 1. Snap transition to fast and complete the fill
      setFillDur('0.45s')
      setCoverH(0)
      // 2. After fill finishes → burst particles
      setTimeout(() => {
        setParticles(makeParticles())
        // 3. After sparkle → fade out overlay
        setTimeout(() => {
          setOpacity(0)
          // 4. After fade → tell parent we're done
          setTimeout(() => onExitComplete?.(), 650)
        }, 750)
      }, 480)
    }
  }, [isLoading, onExitComplete])

  const svgH = Math.round(VH * 160 / VW)   // rendered px height at 160 px width

  return (
    <div style={{
      position:   'fixed', inset: 0,
      background: '#0f1f35',
      display:    'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex:     200,
      opacity,
      transition: opacity === 0 ? 'opacity 0.65s ease' : 'opacity 0.4s ease',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* ── Tree ── */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width={160}
          height={svgH}
          overflow="visible"
          aria-hidden="true"
        >
          <defs>
            {/* Gradient: green at base → cranberry in middle → gold at top */}
            <linearGradient id="slGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor="#1d5c3a" />
              <stop offset="40%"  stopColor="#2e7848" />
              <stop offset="62%"  stopColor="#9b1c2c" />
              <stop offset="83%"  stopColor="#c9a84c" />
              <stop offset="100%" stopColor="#f0d870" />
            </linearGradient>
          </defs>

          {/* Gradient fill (always full-height; hidden by cover rect above) */}
          <path d={TREE_PATH} fill="url(#slGrad)" />

          {/* Dark cover — slides up as fill progresses */}
          <rect
            x="0" y="0" width={VW}
            style={{
              height:     coverH,
              transition: `height ${fillDur} cubic-bezier(0.25, 0.0, 0.35, 1.0)`,
            }}
            fill="#0f1f35"
          />

          {/* Outline — always visible so tree shape is clear before fill starts */}
          <path
            d={TREE_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.20)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>

        {/* Gold particles burst from the tree centre on exit */}
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position:     'absolute',
              left: '50%',  top: '55%',
              width:  p.size,
              height: p.size,
              borderRadius: '50%',
              background:   p.color,
              '--pdx': `${p.dx}px`,
              '--pdy': `${p.dy}px`,
              animation:   `slParticle 0.75s ease-out ${p.delay}s both`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>

      {/* ── Cycling copy ── */}
      <p
        key={msgKey}
        style={{
          marginTop:   28,
          color:       '#c9a84c',
          fontFamily:  '"Playfair Display", Georgia, serif',
          fontSize:    'clamp(14px, 4vw, 17px)',
          letterSpacing: '0.04em',
          textAlign:   'center',
          padding:     '0 28px',
          animation:   'slMsgIn 0.4s ease both',
        }}
      >
        {MESSAGES[msgIdx]}
      </p>
    </div>
  )
}
