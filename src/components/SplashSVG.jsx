import { useState, useEffect } from 'react'

// ── CSS keyframes ──────────────────────────────────────────────────────
const CSS = `
@keyframes treeFadeIn {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
@keyframes ornAppear {
  0%   { opacity: 0; transform: scale(0.25); }
  62%  { opacity: 1; transform: scale(1.18); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes starPulse {
  0%   { transform: scale(1);    filter: drop-shadow(0 0 4px rgba(240,192,64,0.45)); }
  42%  { transform: scale(1.42); filter: drop-shadow(0 0 18px #f0c040) drop-shadow(0 0 36px rgba(240,192,64,0.55)); }
  72%  { transform: scale(1.08); filter: drop-shadow(0 0 9px #f0c040); }
  100% { transform: scale(1);    filter: drop-shadow(0 0 4px rgba(240,192,64,0.45)); }
}
@keyframes titleIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes taglineIn {
  from { opacity: 0; }
  to   { opacity: 0.55; }
}
`

// ── Ornament data ──────────────────────────────────────────────────────
// SVG viewBox: 0 0 300 450
// Tree tiers (tip → base):
//   T4: (150,36) → lx=95  rx=205  y=125
//   T3: (150,100)→ lx=65  rx=235  y=210
//   T2: (150,168)→ lx=30  rx=270  y=300
//   T1: (150,235)→ lx=8   rx=292  y=388
//
// Ornament centers computed at realistic branch-tip positions:
//   (cx, cy, r, fill, highlightFill, delay)
const ORN = [
  // cranberry — right edge of T3, near base  (y=190 → rx≈219)
  [218, 192, 10, '#9b1c2c', 'rgba(255,175,175,0.45)', '1.2s'],
  // gold      — left edge of T2, upper-mid   (y=230 → lx≈91)
  [90,  230, 11, '#c9a84c', 'rgba(255,248,196,0.48)', '1.8s'],
  // white     — right edge of T1, lower      (y=350 → rx≈259)
  [258, 350, 10, '#f8f4ec', 'rgba(255,255,255,0.60)', '2.4s'],
  // soft pink — left edge of T3, upper       (y=160 → lx≈100)
  [100, 162, 10, '#d4849a', 'rgba(255,208,220,0.48)', '3.0s'],
  // forest green — left edge of T1, mid      (y=318 → lx≈70)
  [70,  318, 11, '#1d5c3a', 'rgba(100,220,150,0.38)', '3.6s'],
]

// ── Gold star polygon ──────────────────────────────────────────────────
// 5-pointed star: center (150,18), outer R=14, inner R=6
// Points alternate outer/inner starting from top outer point
const STAR = '150,4 153.5,13.2 163.3,13.7 155.7,19.9 158.2,29.3 ' +
             '150,24 141.8,29.3 144.3,19.9 136.7,13.7 146.5,13.2'

// ── Component ──────────────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const [outerOpacity, setOuterOpacity] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setOuterOpacity(1),    50)   // begin fade-in
    const t1 = setTimeout(() => setOuterOpacity(0),  7000)   // begin fade-out
    const t2 = setTimeout(onFinish,                  7900)   // unmount
    return () => [t0, t1, t2].forEach(clearTimeout)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 38%, #0d1a2e 0%, #060c18 100%)',
      opacity: outerOpacity,
      transition: outerOpacity === 1 ? 'opacity 0.7s ease' : 'opacity 0.9s ease',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* Content shifted slightly above true center */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: 'translateY(-8vh)',
      }}>

        {/* ── Tree SVG ── */}
        <svg
          viewBox="0 0 300 450"
          style={{
            width: '55vw',
            height: 'auto',
            display: 'block',
            overflow: 'visible',
            flexShrink: 0,
            animation: 'treeFadeIn 0.8s ease 0.05s both',
          }}
          aria-hidden="true"
        >
          <defs>
            {/* Tier gradients: lighter green at tip → darker at base */}
            <linearGradient id="spGt4" gradientUnits="userSpaceOnUse" x1="0" y1="36"  x2="0" y2="125">
              <stop offset="0%"   stopColor="#297f49"/>
              <stop offset="100%" stopColor="#0e3319"/>
            </linearGradient>
            <linearGradient id="spGt3" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="210">
              <stop offset="0%"   stopColor="#247342"/>
              <stop offset="100%" stopColor="#0b2d15"/>
            </linearGradient>
            <linearGradient id="spGt2" gradientUnits="userSpaceOnUse" x1="0" y1="168" x2="0" y2="300">
              <stop offset="0%"   stopColor="#20673b"/>
              <stop offset="100%" stopColor="#092512"/>
            </linearGradient>
            <linearGradient id="spGt1" gradientUnits="userSpaceOnUse" x1="0" y1="235" x2="0" y2="388">
              <stop offset="0%"   stopColor="#1c5a35"/>
              <stop offset="100%" stopColor="#071d0e"/>
            </linearGradient>
            {/* Star fill */}
            <radialGradient id="spStar" cx="38%" cy="28%" r="68%">
              <stop offset="0%"   stopColor="#fffde8"/>
              <stop offset="40%"  stopColor="#f0c040"/>
              <stop offset="100%" stopColor="#9c7200"/>
            </radialGradient>
          </defs>

          {/* ── TREE TIERS (back → front) ── */}

          {/* Tier 1 — base, widest */}
          <polygon points="150,235 8,388 292,388"   fill="url(#spGt1)"/>
          {/* inner centre shadow for depth */}
          <polygon points="150,235 82,388 218,388"  fill="#000" opacity="0.07"/>

          {/* Tier 2 */}
          <polygon points="150,168 30,300 270,300"  fill="url(#spGt2)"/>
          <polygon points="150,168 97,300 203,300"  fill="#000" opacity="0.07"/>

          {/* Tier 3 */}
          <polygon points="150,100 65,210 235,210"  fill="url(#spGt3)"/>
          <polygon points="150,100 111,210 189,210" fill="#000" opacity="0.08"/>

          {/* Tier 4 — topmost */}
          <polygon points="150,36 95,125 205,125"   fill="url(#spGt4)"/>
          <polygon points="150,36 126,125 174,125"  fill="#000" opacity="0.09"/>

          {/* ── TRUNK ── */}
          <rect x="133" y="388" width="34" height="44" rx="4" fill="#1e0a04"/>
          <rect x="137" y="388" width="22" height="44" rx="2" fill="#3a1508" opacity="0.75"/>

          {/* ── ORNAMENTS ── */}
          {ORN.map(([cx, cy, r, fill, hl, delay], i) => (
            <g key={i} style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animation: `ornAppear 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay} both`,
            }}>
              {/* Cap */}
              <rect
                x={cx - 2.5} y={cy - r - 7}
                width="5" height="7" rx="1.5"
                fill="#8b6914" opacity="0.9"
              />
              {/* Ball with glow */}
              <circle
                cx={cx} cy={cy} r={r} fill={fill}
                style={{ filter: `drop-shadow(0 2px 5px rgba(0,0,0,0.55)) drop-shadow(0 0 ${Math.round(r * 0.75)}px ${fill})` }}
              />
              {/* Specular highlight */}
              <ellipse
                cx={cx - r * 0.28} cy={cy - r * 0.28}
                rx={r * 0.36} ry={r * 0.24}
                fill={hl}
                transform={`rotate(-20,${cx - r * 0.28},${cy - r * 0.28})`}
              />
            </g>
          ))}

          {/* ── GOLD STAR ── */}
          {/* The star is always visible (fades in with the tree).
              At 4.2s the starPulse animation runs: scale up + gold glow. */}
          <g style={{
            transformBox: 'fill-box',
            transformOrigin: 'center',
            animation: 'starPulse 0.9s ease 4.2s both',
            filter: 'drop-shadow(0 0 4px rgba(240,192,64,0.4))',
          }}>
            <polygon points={STAR} fill="url(#spStar)"/>
            {/* Bright hot centre */}
            <circle cx="150" cy="18" r="3.5" fill="#fffef0" opacity="0.88"/>
          </g>

          {/* Ground shadow */}
          <ellipse cx="150" cy="436" rx="52" ry="7" fill="#020a04" opacity="0.55"/>
        </svg>

        {/* ── Title ── fades in at 5.0s */}
        <div style={{
          marginTop: 20,
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            color: '#e4d4a8',
            fontSize: 'clamp(15px, 4vw, 22px)',
            fontWeight: 300,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0,
            animation: 'titleIn 0.6s ease 5.0s both',
          }}>
            Deck My Tree
          </div>
          {/* ── Tagline ── fades in at 5.8s */}
          <div style={{
            color: 'rgba(200,185,145,0.55)',
            fontSize: 'clamp(9px, 2.5vw, 12px)',
            letterSpacing: '0.26em',
            marginTop: 6,
            textTransform: 'uppercase',
            opacity: 0,
            animation: 'taglineIn 0.7s ease 5.8s both',
          }}>
            Your Holiday Stylist
          </div>
        </div>

      </div>
    </div>
  )
}
