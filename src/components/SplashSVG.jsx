import { useState, useEffect } from 'react'

// ── Snowflakes — 25 elements, pseudo-random properties ────────────────
const SNOW = Array.from({ length: 25 }, (_, i) => ({
  left:     `${(i * 37 + 11) % 97}%`,
  size:     3 + (i % 3),                                   // 3–5 px
  duration: `${(3 + ((i * 17) % 40) / 10).toFixed(1)}s`,  // 3.0–7.0 s
  delay:    `${((i * 13) % 70  / 10).toFixed(1)}s`,        // 0–7 s stagger
  opacity:  +(0.4 + ((i * 5)  % 50) / 100).toFixed(2),    // 0.40–0.85
}))

// ── String light strands ───────────────────────────────────────────────
// SVG viewBox: 0 0 280 270.
// 🎄 emoji (260 px) starts at y = 0.
// Strand heights at 45 / 60 / 75 % of 260 px:
//   Strand 1: y = 117   Strand 2: y = 156   Strand 3: y = 195
//
// Strand x-extents trimmed to stay inside the emoji's triangular silhouette:
//   y=117 → x 95–185    y=156 → x 78–202    y=195 → x 62–218
//
// Bulb y from catenary:  y(x) = y0 + sag × (1 − ((x − 140) / hw)²)
const STRANDS = [
  {
    path: 'M95,117 Q140,135 185,117',      // sag 18 px, hw 45
    lineDelay: '1.5s',
    baseDelay: 1.5,
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
    lineDelay: '2.5s',
    baseDelay: 2.5,
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
    lineDelay: '3.2s',
    baseDelay: 3.2,
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

// ── CSS animations ────────────────────────────────────────────────────
const CSS = `
@keyframes drawStrand {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
@keyframes bulbOn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Phase 1 (4.2s–4.6s): rapid opacity flicker — star coming to life */
@keyframes starTwinkle {
  0%   { opacity: 0.3; }
  20%  { opacity: 0.8; }
  40%  { opacity: 0.3; }
  60%  { opacity: 0.8; }
  80%  { opacity: 0.3; }
  100% { opacity: 0.9; }
}

/* Phase 2 (4.6s–5.0s): bloom — grow and reach full brightness */
@keyframes starBloom {
  from { opacity: 0.9; transform: scale(1);   }
  to   { opacity: 1.0; transform: scale(1.5); }
}

@keyframes snowFall {
  0%   { transform: translateY(-10px); opacity: 0; }
  7%   { opacity: 1; }
  93%  { opacity: 1; }
  100% { transform: translateY(106vh); opacity: 0; }
}
@keyframes titleIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes taglineIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`

// ── Component ─────────────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const [outerOpacity, setOuterOpacity] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setOuterOpacity(1),    50)
    const t1 = setTimeout(() => setOuterOpacity(0),  7000)
    const t2 = setTimeout(onFinish,                  7900)
    return () => [t0, t1, t2].forEach(clearTimeout)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0f1f35',
      opacity: outerOpacity,
      transition: outerOpacity === 1 ? 'opacity 0.8s ease' : 'opacity 0.9s ease',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* ── Snowflakes — full screen, behind tree ──────────────── */}
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

      {/* ── Tree block — top edge at 35 % from viewport top ─────── */}
      <div style={{
        position: 'absolute',
        top: '35%', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Tree container: 280 × 270 px */}
        <div style={{ position: 'relative', width: 280, height: 270 }}>

          {/* 🎄 emoji — 260 px, no extra margin (star handled by glow overlay) */}
          <div style={{
            fontSize: 260, lineHeight: 1,
            textAlign: 'center', width: 280,
            position: 'relative', zIndex: 1,
          }}>
            🎄
          </div>

          {/* ── Star glow overlay ──────────────────────────────────
              Radial gradient circle (60 px) centred on the 🎄's built-in star.
              The star sits at roughly 8 % of the 260 px emoji height = y ≈ 21 px.
              Outer div handles centering; inner div runs the animation.
              opacity 0 before 4.2 s (fill-mode both), holds glow afterwards. */}
          <div style={{
            position: 'absolute',
            left: '50%', top: 21,
            transform: 'translate(-50%, -50%)',
            zIndex: 3, pointerEvents: 'none',
          }}>
            <div style={{
              width: 60, height: 60,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,220,100,0.95) 0%, rgba(201,168,76,0.6) 40%, transparent 70%)',
              opacity: 0,
              animation: 'starTwinkle 0.4s linear 4.2s forwards, starBloom 0.4s ease-out 4.6s forwards',
            }} />
          </div>

          {/* ── SVG string light overlay ─────────────────────────── */}
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
                {/* Bulbs light up left → right, 0.1 s apart */}
                {strand.bulbs.map((b, bi) => (
                  <circle
                    key={`b${si}${bi}`}
                    cx={b.cx} cy={b.cy} r={4}
                    fill={b.color}
                    style={{
                      filter: `drop-shadow(0 0 3px ${b.color}) drop-shadow(0 0 7px ${b.color})`,
                      opacity: 0,
                      animation: `bulbOn 0.25s ease ${(strand.baseDelay + bi * 0.1).toFixed(1)}s both`,
                    }}
                  />
                ))}
              </g>
            ))}
          </svg>

        </div>{/* end tree container */}

        {/* Title */}
        <div style={{
          marginTop: 22,
          color: '#c9a84c',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(24px, 7vw, 34px)',
          fontWeight: 400,
          letterSpacing: '0.13em',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'titleIn 0.6s ease 5.4s both',
        }}>
          Deck My Tree
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: 9,
          color: 'rgba(228,212,168,0.60)',
          fontSize: 'clamp(10px, 2.8vw, 12px)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'taglineIn 0.7s ease 5.8s both',
        }}>
          Your Personal Holiday Stylist
        </div>

      </div>
    </div>
  )
}
