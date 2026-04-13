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
// SVG coordinate system: 280 × 300 px container.
// 🎄 emoji (260 px) starts at y = 20 inside the container (marginTop: 20).
// Strand heights at 45 / 60 / 75 % of emoji height (260 px) + 20 px offset:
//   Strand 1: y = 20 + 0.45*260 = 137
//   Strand 2: y = 20 + 0.60*260 = 176
//   Strand 3: y = 20 + 0.75*260 = 215
//
// Tree left/right edges at those heights (emoji centred in 280 px wide container):
//   y=137 → x: 75–205   y=176 → x: 52–228   y=215 → x: 30–250
//
// Bulb y-values computed from catenary: y(x) = y0 + sag*(1 - ((x-cx)/hw)²)
// where cx = 140 (horizontal centre), hw = half-width, sag = droop in px.
const STRANDS = [
  {
    path: 'M75,137 Q140,158 205,137',       // cx=140, sag=21, hw=65
    lineDelay: '1.5s',
    baseDelay: 1.5,
    bulbs: [
      { cx:  75, cy: 137, color: '#fffde7' },
      { cx: 101, cy: 150, color: '#9b1c2c' },
      { cx: 127, cy: 157, color: '#c9a84c' },
      { cx: 153, cy: 157, color: '#fffde7' },
      { cx: 179, cy: 150, color: '#9b1c2c' },
      { cx: 205, cy: 137, color: '#c9a84c' },
    ],
  },
  {
    path: 'M52,176 Q140,200 228,176',       // cx=140, sag=24, hw=88
    lineDelay: '2.5s',
    baseDelay: 2.5,
    bulbs: [
      { cx:  52, cy: 176, color: '#c9a84c' },
      { cx:  81, cy: 189, color: '#fffde7' },
      { cx: 110, cy: 197, color: '#9b1c2c' },
      { cx: 140, cy: 200, color: '#c9a84c' },
      { cx: 170, cy: 197, color: '#fffde7' },
      { cx: 199, cy: 189, color: '#9b1c2c' },
      { cx: 228, cy: 176, color: '#c9a84c' },
    ],
  },
  {
    path: 'M30,215 Q140,240 250,215',       // cx=140, sag=25, hw=110
    lineDelay: '3.2s',
    baseDelay: 3.2,
    bulbs: [
      { cx:  30, cy: 215, color: '#9b1c2c' },
      { cx:  61, cy: 227, color: '#c9a84c' },
      { cx:  93, cy: 235, color: '#fffde7' },
      { cx: 124, cy: 240, color: '#9b1c2c' },
      { cx: 155, cy: 240, color: '#c9a84c' },
      { cx: 187, cy: 235, color: '#fffde7' },
      { cx: 218, cy: 228, color: '#9b1c2c' },
      { cx: 250, cy: 215, color: '#c9a84c' },
    ],
  },
]

// ── CSS animations ────────────────────────────────────────────────────
const CSS = `
/* Strand wire draws left → right via stroke-dashoffset on a normalised path */
@keyframes drawStrand {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}

/* Each bulb fades in */
@keyframes bulbOn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Star: starts dim, ignites at 4.2 s, glow is held permanently */
@keyframes starIgnite {
  0%   { opacity: 0.35;
         filter: drop-shadow(0 0 3px rgba(201,168,76,0.30)); }
  40%  { opacity: 1;
         transform: scale(1.25);
         filter: drop-shadow(0 0 25px #c9a84c)
                 drop-shadow(0 0 55px rgba(201,168,76,0.45)); }
  75%  { transform: scale(0.96);
         filter: drop-shadow(0 0 18px #c9a84c)
                 drop-shadow(0 0 42px rgba(201,168,76,0.38)); }
  100% { opacity: 1;
         transform: scale(1);
         filter: drop-shadow(0 0 22px #c9a84c)
                 drop-shadow(0 0 50px rgba(201,168,76,0.42)); }
}

/* Snow */
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
    const t0 = setTimeout(() => setOuterOpacity(1),    50)   // fade in
    const t1 = setTimeout(() => setOuterOpacity(0),  7000)   // fade out
    const t2 = setTimeout(onFinish,                  7900)   // hand off
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

        {/* Tree container: 280 × 300 px */}
        <div style={{ position: 'relative', width: 280, height: 300 }}>

          {/* ⭐ star — centred at the tree's peak; ignites at 4.2 s */}
          {/* Outer div handles horizontal centering; inner div handles animation */}
          <div style={{
            position: 'absolute',
            top: 0, left: '50%',
            transform: 'translate(-50%, -40%)',  // float above the container top
            zIndex: 3,
          }}>
            <div style={{
              fontSize: 48, lineHeight: 1,
              opacity: 0.35,
              filter: 'drop-shadow(0 0 3px rgba(201,168,76,0.30))',
              transformOrigin: 'center',
              animation: 'starIgnite 0.9s cubic-bezier(0.34,1.2,0.64,1) 4.2s both',
            }}>
              ⭐
            </div>
          </div>

          {/* 🎄 emoji — 260 px, 20 px top margin to leave room for star */}
          <div style={{
            fontSize: 260, lineHeight: 1,
            textAlign: 'center', width: 280,
            marginTop: 20,
            zIndex: 1, position: 'relative',
          }}>
            🎄
          </div>

          {/* ── SVG string light overlay ─────────────────────────── */}
          {/*
            viewBox matches container exactly (280 × 300).
            Each strand uses pathLength="1" so strokeDashoffset 1→0
            draws the wire from left to right regardless of actual path length.
            Bulbs (r=4, 8 px diameter) light up in sequence after the wire.
          */}
          <svg
            viewBox="0 0 280 300"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: 280, height: 300,
              overflow: 'visible', pointerEvents: 'none',
              zIndex: 2,
            }}
            aria-hidden="true"
          >
            {STRANDS.map((strand, si) => (
              <g key={`s${si}`}>

                {/* Wire */}
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

        {/* ── Title — Playfair Display, gold ────────────────────── */}
        <div style={{
          marginTop: 22,
          color: '#c9a84c',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(24px, 7vw, 34px)',
          fontWeight: 400,
          letterSpacing: '0.13em',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'titleIn 0.6s ease 5.0s both',
        }}>
          Deck My Tree
        </div>

        {/* ── Tagline ────────────────────────────────────────────── */}
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

      </div>{/* end tree block */}

    </div>
  )
}
