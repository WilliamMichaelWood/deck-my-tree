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
// Strand heights at 45 / 60 / 75 % of 260 px → y = 117 / 156 / 195
// x-extents trimmed to the emoji's triangular silhouette.
// Bulb y from catenary: y(x) = y0 + sag × (1 − ((x − 140) / hw)²)
//
// Delays: 1.0 s / 1.8 s / 2.4 s   Bulb stagger: 0.15 s left→right
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

// ── CSS animations ────────────────────────────────────────────────────────────
const CSS = `

/* ── Tree wrapper ─────────────────────────────────────────────────────────────
   treeFadeIn  — opacity 0 → 1 over 0.8 s (whole wrapper including both emojis)
   treeBrighten — filter brightness 0.75 → 1.0 over 2.8 s starting at 1.0 s;
                  backwards fill holds brightness(0.75) during the fade-in.    */
@keyframes treeFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes treeBrighten {
  from { filter: brightness(0.75); }
  to   { filter: brightness(1.00); }
}

/* ── Emoji crossfade at 4.0 s ─────────────────────────────────────────────────
   🌲 fades out as 🎄 fades in — the ornaments "appear" via the emoji swap.
   Both use fill-mode: both so:
     pineFadeOut backwards fill = opacity 1 (pine visible before 4.0 s)
     xmasFadeIn  backwards fill = opacity 0 (xmas hidden before 4.0 s)        */
@keyframes pineFadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes xmasFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
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

/* ── Star glow — beacon (4.8–5.4 s) + hold + twinkle (5.6–6.4 s) ────────────
   Single animation: duration 1.6 s, delay 4.8 s.
   Keyframe % = (t − 4.8) / 1.6:
      0 % = t 4.8 s — starts at 0
     38 % = t 5.4 s — beacon fully on (ease-out ramp)
     50 % = t 5.6 s — hold; twinkle sequence begins
     63 % = t 5.8 s — first flicker down
     75 % = t 6.0 s — flicker up
     88 % = t 6.2 s — flicker down again
    100 % = t 6.4 s — settles at full glow                                     */
@keyframes starGlow {
  0%   { opacity: 0;   animation-timing-function: ease-out; }
  38%  { opacity: 1;   animation-timing-function: linear;   }
  50%  { opacity: 1;   }
  63%  { opacity: 0.4; }
  75%  { opacity: 0.9; }
  88%  { opacity: 0.4; }
  100% { opacity: 1.0; }
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
// Full animation timeline (9.4 s total):
//   0.0 s  🌲 fades in over 0.8 s at brightness(0.75); snow runs throughout
//   1.0 s  Strand 1 wire draws; bulbs light left→right, 0.15 s stagger
//   1.8 s  Strand 2 same; tree brightness climbing toward 1.0
//   2.4 s  Strand 3 same
//   ~3.7 s  All strands fully lit; natural pause before the swap
//   4.0 s  🌲 → 🎄 crossfade over 0.3 s — ornaments appear via emoji swap
//   4.8 s  Star beacon ignites — ease-out ramp to full glow over 0.6 s (90 px)
//   5.6 s  Star twinkles: 0.9 → 0.4 → 0.9 → 0.4 → 1.0 over 0.8 s
//   6.4 s  "Deck My Tree" fades in
//   7.2 s  "Your Personal Holiday Stylist" fades in
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

          {/* ── Tree wrapper ─────────────────────────────────────────────────
              Handles the initial fade-in (treeFadeIn) and the brightness ramp
              (treeBrighten). Both emojis live inside so brightness is shared.
              The filter property creates a new stacking context — SVG and star
              glow are siblings, not children, so they are unaffected.          */}
          <div style={{
            position: 'relative',
            width: 280, height: 270,
            zIndex: 1,
            animation: 'treeFadeIn 0.8s ease-out 0s both, treeBrighten 2.8s ease-in 1.0s both',
          }}>

            {/* 🌲 — bare pine, visible from start, fades out at t=4.0 s.
                pineFadeOut backwards fill (before 4.0 s) holds opacity: 1. */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              fontSize: 260, lineHeight: 1,
              textAlign: 'center', width: 280,
              animation: 'pineFadeOut 0.3s ease-in-out 4.0s both',
            }}>
              🌲
            </div>

            {/* 🎄 — decorated tree, invisible until t=4.0 s crossfade.
                xmasFadeIn backwards fill (before 4.0 s) holds opacity: 0.     */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              fontSize: 260, lineHeight: 1,
              textAlign: 'center', width: 280,
              opacity: 0,
              animation: 'xmasFadeIn 0.3s ease-in-out 4.0s both',
            }}>
              🎄
            </div>

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

          {/* ── Star glow overlay ──────────────────────────────────────────────
              90 px radial gradient centred on the 🎄's star (y ≈ 21 px).
              Invisible until t=4.8 s — the star hasn't ignited during 🌲 phase.
              Single starGlow animation covers beacon + hold + twinkle.         */}
          <div style={{
            position: 'absolute',
            left: '50%', top: 21,
            transform: 'translate(-50%, -50%)',
            zIndex: 3, pointerEvents: 'none',
          }}>
            <div style={{
              width: 90, height: 90,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,220,100,0.95) 0%, rgba(201,168,76,0.6) 40%, transparent 70%)',
              opacity: 0,
              animation: 'starGlow 1.6s linear 4.8s both',
            }} />
          </div>

        </div>{/* end tree container */}

        {/* Title — after star has settled (6.4 s) */}
        <div style={{
          marginTop: 22,
          color: '#c9a84c',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(24px, 7vw, 34px)',
          fontWeight: 400,
          letterSpacing: '0.13em',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'titleIn 0.6s ease 6.4s both',
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
          animation: 'taglineIn 0.7s ease 7.2s both',
        }}>
          Your Personal Holiday Stylist
        </div>

      </div>
    </div>
  )
}
