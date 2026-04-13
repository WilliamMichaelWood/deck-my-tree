import { useState, useEffect } from 'react'

// ── Snowflakes — 25 elements, pseudo-random properties ───────────────────────
const SNOW = Array.from({ length: 25 }, (_, i) => ({
  left:     `${(i * 37 + 11) % 97}%`,
  size:     3 + (i % 3),                                    // 3–5 px
  duration: `${(3 + ((i * 17) % 40) / 10).toFixed(1)}s`,   // 3.0–7.0 s
  delay:    `${((i * 13) % 70  / 10).toFixed(1)}s`,         // 0–7 s stagger
  opacity:  +(0.4 + ((i * 5)  % 50) / 100).toFixed(2),     // 0.40–0.85
}))

// ── String light strands ──────────────────────────────────────────────────────
// SVG viewBox: 0 0 280 270.  🎄 emoji (260 px) starts at y = 0.
// Strand heights at 45 / 60 / 75 % of 260 px:
//   Strand 1: y = 117   Strand 2: y = 156   Strand 3: y = 195
//
// Strand x-extents trimmed to stay inside the emoji's triangular silhouette:
//   y=117 → x 95–185    y=156 → x 78–202    y=195 → x 62–218
//
// Bulb y from catenary:  y(x) = y0 + sag × (1 − ((x − 140) / hw)²)
// Delays updated to tell the decorating story: 1.0 s / 1.8 s / 2.4 s
// Bulb stagger: 0.15 s (gives a measured left-to-right reveal)
const STRANDS = [
  {
    path: 'M95,117 Q140,135 185,117',      // sag 18 px, hw 45
    lineDelay: '1.0s',
    baseDelay: 1.0,
    bulbs: [
      { cx:  95, cy: 117, color: '#fffde7' },
      { cx: 113, cy: 129, color: '#9b1c2c' },
      { cx: 131, cy: 134, color: '#c9a84c' },
      { cx: 149, cy: 134, color: '#fffde7' },
      { cx: 167, cy: 129, color: '#9b1c2c' },
      { cx: 185, cy: 117, color: '#c9a84c' },
    ],
  },
  {
    path: 'M78,156 Q140,176 202,156',      // sag 20 px, hw 62
    lineDelay: '1.8s',
    baseDelay: 1.8,
    bulbs: [
      { cx:  78, cy: 156, color: '#c9a84c' },
      { cx:  99, cy: 167, color: '#fffde7' },
      { cx: 119, cy: 174, color: '#9b1c2c' },
      { cx: 140, cy: 176, color: '#c9a84c' },
      { cx: 161, cy: 174, color: '#fffde7' },
      { cx: 181, cy: 167, color: '#9b1c2c' },
      { cx: 202, cy: 156, color: '#c9a84c' },
    ],
  },
  {
    path: 'M62,195 Q140,217 218,195',      // sag 22 px, hw 78
    lineDelay: '2.4s',
    baseDelay: 2.4,
    bulbs: [
      { cx:  62, cy: 195, color: '#9b1c2c' },
      { cx:  84, cy: 206, color: '#c9a84c' },
      { cx: 107, cy: 213, color: '#fffde7' },
      { cx: 129, cy: 217, color: '#9b1c2c' },
      { cx: 151, cy: 217, color: '#c9a84c' },
      { cx: 173, cy: 213, color: '#fffde7' },
      { cx: 196, cy: 206, color: '#9b1c2c' },
      { cx: 218, cy: 195, color: '#c9a84c' },
    ],
  },
]

// ── Ornament dots — 5 brand-color dots, scale-pop from 4.0 s ─────────────────
// Positions inside the 280 × 270 tree container, within the emoji's silhouette.
// Each dot is centred on (left, top) via translate(-50%, -50%) in the animation.
const ORNAMENTS = [
  { left: 108, top:  90, color: '#9b1c2c', delay: 4.0 },  // cranberry
  { left: 178, top: 105, color: '#c9a84c', delay: 4.5 },  // gold
  { left: 115, top: 155, color: '#fffde7', delay: 5.0 },  // cream / white
  { left: 175, top: 160, color: '#1d5c3a', delay: 5.5 },  // forest green
  { left: 138, top: 200, color: '#c4607a', delay: 6.0 },  // pink
]

// ── CSS animations ────────────────────────────────────────────────────────────
const CSS = `

/* ── Tree appearance ── */

/* Emoji fades in over 0.8 s */
@keyframes treeFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Emoji brightens from dim (0.7) to full as lights come on.
   Starts at 0.8 s (after fade-in), runs 3.0 s → reaches 1.0 at t=3.8 s,
   timed so full brightness lands as the star beacon ignites. */
@keyframes treeBrighten {
  from { filter: brightness(0.70); }
  to   { filter: brightness(1.00); }
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

/* ── Star glow — single animation covering beacon + hold + twinkle ──
   Delay 3.2 s, duration 3.1 s (runs until t = 6.3 s).
   Keyframe % = (t − 3.2) / 3.1:
     0 %  = t 3.2 s — starts at 0
    19 %  = t 3.8 s — beacon fully on (0.6 s ease-out ramp)
    74 %  = t 5.5 s — holds steady; twinkle sequence begins
    81 %  = t 5.7 s — first flicker down
    87 %  = t 5.9 s — flicker up
    94 %  = t 6.1 s — flicker down again
   100 %  = t 6.3 s — settles at full brightness            */
@keyframes starGlow {
  0%   { opacity: 0;   animation-timing-function: ease-out; }
  19%  { opacity: 1;   animation-timing-function: linear;   }
  74%  { opacity: 1;   }
  81%  { opacity: 0.4; }
  87%  { opacity: 0.9; }
  94%  { opacity: 0.4; }
  100% { opacity: 1.0; }
}

/* ── Ornament dots — spring pop ── */
@keyframes ornPop {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(0);   }
  55%  { opacity: 1; transform: translate(-50%,-50%) scale(1.2); }
  100% { opacity: 1; transform: translate(-50%,-50%) scale(1.0); }
}

/* ── Snow ── */
@keyframes snowFall {
  0%   { transform: translateY(-10px); opacity: 0; }
  7%   { opacity: 1; }
  93%  { opacity: 1; }
  100% { transform: translateY(106vh); opacity: 0; }
}

/* ── Title / tagline ── */
@keyframes titleIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes taglineIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`

// ── Component ─────────────────────────────────────────────────────────────────
// Full animation timeline:
//   0.0 s  🎄 emoji fades in (0.8 s); tree at brightness 0.7; snow running
//   1.0 s  Strand 1 wire draws; bulbs light left→right, 0.15 s stagger
//   1.8 s  Strand 2 wire draws + bulbs
//   2.4 s  Strand 3 wire draws + bulbs
//   3.2 s  Star beacon ignites — smooth ramp to full glow over 0.6 s
//   3.8 s  Tree reaches full brightness (treeBrighten completes)
//   4.0 s  Ornament 1 pops (cranberry)
//   4.5 s  Ornament 2 pops (gold)
//   5.0 s  Ornament 3 pops (white)
//   5.5 s  Ornament 4 pops (forest green) + star twinkle begins
//   6.0 s  Ornament 5 pops (pink)
//   6.2 s  "Deck My Tree" fades in
//   6.3 s  Star settles at full glow
//   7.0 s  "Your Personal Holiday Stylist" fades in
//   8.2 s  Full screen fades out (0.9 s)
//   9.1 s  onFinish → reveals app
export default function SplashSVG({ onFinish }) {
  const [outerOpacity, setOuterOpacity] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setOuterOpacity(1),   10)   // appear almost instantly
    const t1 = setTimeout(() => setOuterOpacity(0), 8200)   // start fade-out
    const t2 = setTimeout(onFinish,                9100)    // hand off to app
    return () => [t0, t1, t2].forEach(clearTimeout)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0f1f35',
      opacity: outerOpacity,
      transition: outerOpacity === 0 ? 'opacity 0.9s ease' : 'opacity 0.1s ease',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* ── Snowflakes — full screen, behind tree ── */}
      {SNOW.map((f, i) => (
        <div key={`sw${i}`} style={{
          position: 'absolute', left: f.left, top: 0,
          width: f.size, height: f.size,
          opacity: f.opacity, zIndex: 0, pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%', height: '100%',
            borderRadius: '50%', background: '#dde8ff',
            animation: `snowFall ${f.duration} linear ${f.delay} infinite`,
          }} />
        </div>
      ))}

      {/* ── Tree block — top edge at 35 % from viewport top ── */}
      <div style={{
        position: 'absolute',
        top: '35%', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Tree container: 280 × 270 px */}
        <div style={{ position: 'relative', width: 280, height: 270 }}>

          {/* 🎄 emoji
              Two animations:
              1. treeFadeIn  — opacity 0→1 over 0.8 s starting at t=0
              2. treeBrighten — filter brightness 0.7→1.0 over 3.0 s starting at t=0.8 s
              The backwards-fill of treeBrighten keeps the emoji dim during its own
              fade-in, so the tree appears dark-but-present before lights come on. */}
          <div style={{
            fontSize: 260, lineHeight: 1,
            textAlign: 'center', width: 280,
            position: 'relative', zIndex: 1,
            opacity: 0,
            animation: 'treeFadeIn 0.8s ease-out 0s both, treeBrighten 3.0s ease-in 0.8s both',
          }}>
            🎄
          </div>

          {/* ── SVG string light overlay ── */}
          <svg
            viewBox="0 0 280 270"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: 280, height: 270,
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
                  stroke="#8B6914"
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                  fill="none"
                  pathLength="1"
                  strokeDasharray="1"
                  style={{
                    strokeDashoffset: 1,
                    animation: `drawStrand 0.55s linear ${strand.lineDelay} both`,
                  }}
                />
                {/* Bulbs light up left → right, 0.15 s apart */}
                {strand.bulbs.map((b, bi) => (
                  <circle
                    key={`b${si}${bi}`}
                    cx={b.cx} cy={b.cy} r={4}
                    fill={b.color}
                    style={{
                      filter: `drop-shadow(0 0 3px ${b.color}) drop-shadow(0 0 7px ${b.color})`,
                      opacity: 0,
                      animation: `bulbOn 0.25s ease ${(strand.baseDelay + bi * 0.15).toFixed(2)}s both`,
                    }}
                  />
                ))}
              </g>
            ))}
          </svg>

          {/* ── Ornament dots — 5 brand colours, pop in from 4.0 s ──
              zIndex 3 puts them above the string light SVG but below the star glow. */}
          {ORNAMENTS.map((o, i) => (
            <div
              key={`o${i}`}
              style={{
                position: 'absolute',
                left: o.left, top: o.top,
                width: 13, height: 13,
                borderRadius: '50%',
                background: o.color,
                boxShadow: `0 0 5px ${o.color}, 0 0 11px ${o.color}99`,
                opacity: 0,
                zIndex: 3,
                pointerEvents: 'none',
                animation: `ornPop 0.4s cubic-bezier(0.34,1.3,0.64,1) ${o.delay}s both`,
              }}
            />
          ))}

          {/* ── Star glow overlay ──
              90 px radial gradient centred on the 🎄's built-in star (y ≈ 21 px).
              Single starGlow animation: beacon 3.2–3.8 s, hold, then twinkle 5.5–6.3 s. */}
          <div style={{
            position: 'absolute',
            left: '50%', top: 21,
            transform: 'translate(-50%, -50%)',
            zIndex: 4, pointerEvents: 'none',
          }}>
            <div style={{
              width: 90, height: 90,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,220,100,0.95) 0%, rgba(201,168,76,0.6) 40%, transparent 70%)',
              opacity: 0,
              animation: 'starGlow 3.1s linear 3.2s both',
            }} />
          </div>

        </div>{/* end tree container */}

        {/* Title — appears after star has bloomed (6.2 s) */}
        <div style={{
          marginTop: 22,
          color: '#c9a84c',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(24px, 7vw, 34px)',
          fontWeight: 400,
          letterSpacing: '0.13em',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'titleIn 0.6s ease 6.2s both',
        }}>
          Deck My Tree
        </div>

        {/* Tagline — 0.8 s after title */}
        <div style={{
          marginTop: 9,
          color: 'rgba(228,212,168,0.60)',
          fontSize: 'clamp(10px, 2.8vw, 12px)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'taglineIn 0.7s ease 7.0s both',
        }}>
          Your Personal Holiday Stylist
        </div>

      </div>
    </div>
  )
}
