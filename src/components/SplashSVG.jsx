import { useState, useEffect } from 'react'

// ── Jewel color palette ───────────────────────────────────────────────────────
const JEWEL = ['#1a3a6b', '#6b1a1a', '#0d4a2a', '#d4a843']

// ── Particles — 30 mixed floating elements ────────────────────────────────────
// Types: snow (white dots), gold (✦ sparkles), emerald (green dots)
// Each drifts upward or diagonally; opacity fades in at 8 %, holds, fades out
const PARTICLES = Array.from({ length: 30 }, (_, i) => {
  const typeIdx = i % 3
  return {
    left:      `${(i * 37 + 11) % 97}%`,
    top:       `${(i * 29 + 5)  % 95}%`,
    type:      typeIdx === 0 ? 'snow' : typeIdx === 1 ? 'gold' : 'emerald',
    size:      typeIdx === 1 ? 10 : 3 + (i % 3),
    duration:  `${(4 + ((i * 17) % 50) / 10).toFixed(1)}s`,  // 4–9 s
    delay:     `${((i * 13) % 80 / 10).toFixed(1)}s`,         // 0–8 s stagger
    opacity:   +(0.3 + ((i * 7)  % 50) / 100).toFixed(2),    // 0.30–0.80
    driftAnim: ['driftUp', 'driftLeft', 'driftRight'][(i * 7) % 3],
  }
})

// ── String light strands — jewel tones ───────────────────────────────────────
// SVG viewBox: 0 0 340 330.  Same catenary geometry as before.
// Delays shifted +0.2 s from prior version to fit new timeline.
const STRANDS = [
  {
    path: 'M115,144 Q170,166 225,144',
    lineDelay: '1.2s',
    baseDelay: 1.2,
    bulbs: [
      { cx: 115, cy: 144, color: JEWEL[0] },
      { cx: 137, cy: 158, color: JEWEL[1] },
      { cx: 159, cy: 165, color: JEWEL[2] },
      { cx: 181, cy: 165, color: JEWEL[3] },
      { cx: 203, cy: 158, color: JEWEL[0] },
      { cx: 225, cy: 144, color: JEWEL[1] },
    ],
  },
  {
    path: 'M94,192 Q170,217 246,192',
    lineDelay: '2.0s',
    baseDelay: 2.0,
    bulbs: [
      { cx:  94, cy: 192, color: JEWEL[2] },
      { cx: 119, cy: 206, color: JEWEL[3] },
      { cx: 145, cy: 214, color: JEWEL[0] },
      { cx: 170, cy: 217, color: JEWEL[1] },
      { cx: 195, cy: 214, color: JEWEL[2] },
      { cx: 221, cy: 206, color: JEWEL[3] },
      { cx: 246, cy: 192, color: JEWEL[0] },
    ],
  },
  {
    path: 'M74,240 Q170,267 266,240',
    lineDelay: '2.6s',
    baseDelay: 2.6,
    bulbs: [
      { cx:  74, cy: 240, color: JEWEL[1] },
      { cx: 101, cy: 253, color: JEWEL[2] },
      { cx: 129, cy: 262, color: JEWEL[3] },
      { cx: 156, cy: 266, color: JEWEL[0] },
      { cx: 184, cy: 266, color: JEWEL[1] },
      { cx: 211, cy: 262, color: JEWEL[2] },
      { cx: 239, cy: 253, color: JEWEL[3] },
      { cx: 266, cy: 240, color: JEWEL[0] },
    ],
  },
]

// ── CSS animations ────────────────────────────────────────────────────────────
const CSS = `

/* ── Tree ─────────────────────────────────────────────────────────────────────

   treeFadeIn — opacity 0 → 1 over 0.8 s.

   treeReveal — enchanted-to-warm colour bloom at 3.6 s:
     hue-rotate(120deg) shifts green emoji toward blue-green/teal (dark forest).
     brightness(0.4) keeps it very dim; saturate(0.6) mutes the colours.
     Backwards fill holds the dark enchanted state from 0 s–3.6 s.
     Forward fill settles on the vivid warm look after 5.6 s.
     Both filter functions interpolate simultaneously — colour and brightness
     bloom together like a spell taking effect.                                 */

@keyframes treeFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes treeReveal {
  from { filter: hue-rotate(120deg) brightness(0.4) saturate(0.6); }
  to   { filter: hue-rotate(0deg)   brightness(1.0) saturate(1.2); }
}

/* ── Particles ── */
@keyframes driftUp {
  0%   { transform: translateY(0);                          opacity: 0; }
  8%   {                                                     opacity: 1; }
  90%  {                                                     opacity: 1; }
  100% { transform: translateY(-110vh);                      opacity: 0; }
}
@keyframes driftLeft {
  0%   { transform: translateY(0)      translateX(0);        opacity: 0; }
  8%   {                                                     opacity: 1; }
  90%  {                                                     opacity: 1; }
  100% { transform: translateY(-90vh)  translateX(-35px);    opacity: 0; }
}
@keyframes driftRight {
  0%   { transform: translateY(0)      translateX(0);        opacity: 0; }
  8%   {                                                     opacity: 1; }
  90%  {                                                     opacity: 1; }
  100% { transform: translateY(-90vh)  translateX(35px);     opacity: 0; }
}

/* ── String lights ── */
@keyframes drawStrand {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
@keyframes bulbOn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* bulbFlicker — candle-like cycling between 0.70–1.0 opacity.
   Listed AFTER bulbOn in each element's animation shorthand so it takes
   priority once it starts.  During its delay window bulbOn's forwards fill
   holds opacity at 1, then flicker takes over seamlessly.                    */
@keyframes bulbFlicker {
  0%,  100% { opacity: 1.00; }
  20%        { opacity: 0.75; }
  45%        { opacity: 0.95; }
  70%        { opacity: 0.70; }
  85%        { opacity: 0.90; }
}

/* ── Shimmer pulse — radial light burst from tree centre at 3.4 s ──
   Scales from 0 → 340 px while fading out over 0.6 s.                        */
@keyframes shimmerPulse {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}

/* ── Star glow — beacon (5.2–5.8 s) + twinkle (5.8–6.8 s) ──────────────────
   duration 1.6 s, delay 5.2 s.
   Keyframe % = (t − 5.2) / 1.6:
      0 % = t 5.2 s — starts dark
     37 % = t 5.8 s — beacon fully on (ease-out ramp)
     50 % = t 6.0 s — first flicker down
     62 % = t 6.2 s — flicker up
     75 % = t 6.4 s — flicker down again
     88 % = t 6.6 s — settles toward full
    100 % = t 6.8 s — holds at full glow                                       */
@keyframes starGlow {
  0%   { opacity: 0;   animation-timing-function: ease-out; }
  37%  { opacity: 1;   animation-timing-function: linear;   }
  50%  { opacity: 0.4; }
  62%  { opacity: 0.9; }
  75%  { opacity: 0.4; }
  88%  { opacity: 1.0; }
  100% { opacity: 1.0; }
}

/* ── Title / tagline ── */
@keyframes titleIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes taglineIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);    }
}
`

// ── Component ─────────────────────────────────────────────────────────────────
// Full animation timeline (9.4 s total):
//   0.0 s  🎄 fades in (0.8 s), held dark enchanted via treeReveal backwards fill
//           Particles drift upward/diagonally throughout
//   1.2 s  Strand 1 wire draws; jewel bulbs light left→right then flicker like candles
//   2.0 s  Strand 2 same
//   2.6 s  Strand 3 same
//   3.4 s  Magical shimmer pulse radiates from tree centre (0.6 s)
//   3.6 s  Colour bloom: hue-rotate+brightness+saturate transition over 2.0 s
//   5.2 s  Star beacon ignites (ease-out to full glow over 0.6 s)
//   5.8 s  Star twinkles: rapid flicker sequence, then holds steady
//   6.4 s  "Deck My Tree" drifts up and fades in
//   7.2 s  "Your Personal Holiday Stylist" drifts up and fades in
//   8.5 s  Full screen fades out (0.9 s)
//   9.4 s  onFinish → reveals app
export default function SplashSVG({ onFinish }) {
  const [outerOpacity, setOuterOpacity] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setOuterOpacity(1),   10)   // appear almost instantly
    const t1 = setTimeout(() => setOuterOpacity(0), 8500)   // start fade-out
    const t2 = setTimeout(onFinish,                 9400)   // hand off to app
    return () => [t0, t1, t2].forEach(clearTimeout)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #0a0618 0%, #0f1f35 50%, #0d2818 100%)',
      opacity: outerOpacity,
      transition: outerOpacity === 0 ? 'opacity 0.9s ease' : 'opacity 0.1s ease',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* ── Dark purple vignette overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(20,10,40,0.7) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Particles — full screen, behind tree ── */}
      {PARTICLES.map((p, i) => {
        const dotColor = p.type === 'snow' ? '#dde8ff' : '#2d8a55'
        return (
          <div key={`p${i}`} style={{
            position: 'absolute', left: p.left, top: p.top,
            width: p.size, height: p.size,
            zIndex: 0, pointerEvents: 'none',
            animation: `${p.driftAnim} ${p.duration} linear ${p.delay} infinite`,
          }}>
            {p.type === 'gold' ? (
              // Gold 4-pointed sparkle
              <div style={{
                width: '100%', height: '100%',
                color: '#d4a843',
                fontSize: p.size,
                lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: p.opacity,
              }}>✦</div>
            ) : (
              <div style={{
                width: '100%', height: '100%',
                borderRadius: '50%',
                background: dotColor,
                opacity: p.opacity,
              }} />
            )}
          </div>
        )
      })}

      {/* ── Tree block — top edge at 30 % from viewport top ── */}
      <div style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Tree container: 340 × 330 px */}
        <div style={{ position: 'relative', width: 340, height: 330 }}>

          {/* ── 🎄 emoji ─────────────────────────────────────────────────────────
              treeFadeIn (opacity, 0 s): 0 → 1 over 0.8 s.
              treeReveal (filter, 3.6 s): hue-rotate(120deg) brightness(0.4) saturate(0.6)
                → hue-rotate(0deg) brightness(1.0) saturate(1.2) over 2.0 s.
              Backwards fill of treeReveal holds the dark enchanted filter from
              0 s–3.6 s — deep forest look while the lights are being hung.    */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            fontSize: 320, lineHeight: 1,
            textAlign: 'center', width: 340,
            zIndex: 1,
            opacity: 0,
            animation: 'treeFadeIn 0.8s ease-out 0s both, treeReveal 2.0s ease-in-out 3.6s both',
          }}>
            🎄
          </div>

          {/* ── Magical shimmer pulse ─────────────────────────────────────────
              Radial gold halo expands from 0 → 340 px while fading out over
              0.6 s at 3.4 s — just before the colour bloom, like a spell firing. */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 340, height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,168,67,0.15) 0%, transparent 70%)',
            zIndex: 3, pointerEvents: 'none',
            animation: 'shimmerPulse 0.6s ease-out 3.4s both',
          }} />

          {/* ── SVG string light overlay ── */}
          <svg
            viewBox="0 0 340 330"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: 340, height: 330,
              overflow: 'visible', pointerEvents: 'none',
              zIndex: 2,
            }}
            aria-hidden="true"
          >
            {STRANDS.map((strand, si) => (
              <g key={`s${si}`}>
                {/* Wire draws left → right */}
                <path
                  d={strand.path}
                  stroke="rgba(212,168,67,0.3)"
                  strokeWidth="1.5"
                  fill="none"
                  pathLength="1"
                  strokeDasharray="1"
                  style={{
                    strokeDashoffset: 1,
                    animation: `drawStrand 0.55s linear ${strand.lineDelay} both`,
                  }}
                />
                {/* Bulbs light left → right, 0.15 s apart, then flicker like candles */}
                {strand.bulbs.map((b, bi) => {
                  const onDelay      = (strand.baseDelay + bi * 0.15).toFixed(2)
                  // Flicker starts after bulbOn finishes + small settling buffer.
                  // Per-bulb offset prevents all bulbs flickering in sync.
                  const flickerDelay = (strand.baseDelay + bi * 0.15 + 0.55 + (bi * 0.31 + si * 0.47) % 0.6).toFixed(2)
                  const flickerDur   = (1.5 + (bi * 0.19 + si * 0.23) % 0.7).toFixed(1)
                  return (
                    <circle
                      key={`b${si}${bi}`}
                      cx={b.cx} cy={b.cy} r={4}
                      fill={b.color}
                      style={{
                        filter: `drop-shadow(0 0 4px ${b.color}) drop-shadow(0 0 9px ${b.color})`,
                        opacity: 0,
                        animation: `bulbOn 0.25s ease ${onDelay}s both, bulbFlicker ${flickerDur}s ease-in-out ${flickerDelay}s infinite`,
                      }}
                    />
                  )
                })}
              </g>
            ))}
          </svg>

          {/* ── Star glow + cardinal rays ─────────────────────────────────────
              Centred on 🎄's star tip (≈ 26 px from top of container).
              60 px SVG with tight radial gradient + 4 rays extending 25 px.
              Ignites at 5.2 s — bloom is 80 % done by then — then twinkles.   */}
          <div style={{
            position: 'absolute',
            left: '50%', top: 26,
            transform: 'translate(-50%, -50%)',
            zIndex: 4, pointerEvents: 'none',
          }}>
            <svg
              width="60" height="60"
              viewBox="-30 -30 60 60"
              overflow="visible"
              aria-hidden="true"
              style={{ opacity: 0, animation: 'starGlow 1.6s linear 5.2s both' }}
            >
              <defs>
                <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#fff096" stopOpacity="1.0" />
                  <stop offset="20%"  stopColor="#d4a843" stopOpacity="0.9" />
                  <stop offset="60%"  stopColor="#d4a843" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#d4a843" stopOpacity="0.0" />
                </radialGradient>
              </defs>
              {/* Tight glow: 60 px diameter */}
              <circle cx="0" cy="0" r="30" fill="url(#starGrad)" />
              {/* Cardinal rays: start 15 px from centre, extend 25 px outward */}
              <line x1="0"   y1="-15" x2="0"   y2="-40" stroke="#d4a843" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round" />
              <line x1="0"   y1="15"  x2="0"   y2="40"  stroke="#d4a843" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round" />
              <line x1="-15" y1="0"   x2="-40" y2="0"   stroke="#d4a843" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round" />
              <line x1="15"  y1="0"   x2="40"  y2="0"   stroke="#d4a843" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round" />
            </svg>
          </div>

        </div>{/* end tree container */}

        {/* Title */}
        <div style={{
          marginTop: 22,
          color: '#d4a843',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '2.8rem',
          fontWeight: 400,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'titleIn 0.6s ease 6.4s both',
        }}>
          Deck My Tree
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: 9,
          color: 'rgba(212,168,67,0.6)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: 'clamp(10px, 2.8vw, 12px)',
          fontVariant: 'small-caps',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'taglineIn 0.7s ease 7.2s both',
        }}>
          Your Personal Holiday Stylist
        </div>

      </div>
    </div>
  )
}
