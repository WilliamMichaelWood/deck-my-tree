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
// SVG viewBox: 0 0 340 330.  🎄 emoji (320 px) starts at y = 0.
// Container centre x = 170.  Strand heights at 45 / 60 / 75 % of 320 px.
// Bulb y from catenary: y(x) = y0 + sag × (1 − ((x − 170) / hw)²)
//
// Delays: 1.0 s / 1.8 s / 2.4 s   Bulb stagger: 0.15 s left → right
const STRANDS = [
  {
    path: 'M115,144 Q170,166 225,144',     // y=144, sag 22 px, hw 55
    lineDelay: '1.0s',
    baseDelay: 1.0,
    bulbs: [
      { cx: 115, cy: 144, color: '#fffde7' },
      { cx: 137, cy: 158, color: '#9b1c2c' },
      { cx: 159, cy: 165, color: '#c9a84c' },
      { cx: 181, cy: 165, color: '#fffde7' },
      { cx: 203, cy: 158, color: '#9b1c2c' },
      { cx: 225, cy: 144, color: '#c9a84c' },
    ],
  },
  {
    path: 'M94,192 Q170,217 246,192',      // y=192, sag 25 px, hw 76
    lineDelay: '1.8s',
    baseDelay: 1.8,
    bulbs: [
      { cx:  94, cy: 192, color: '#c9a84c' },
      { cx: 119, cy: 206, color: '#fffde7' },
      { cx: 145, cy: 214, color: '#9b1c2c' },
      { cx: 170, cy: 217, color: '#c9a84c' },
      { cx: 195, cy: 214, color: '#fffde7' },
      { cx: 221, cy: 206, color: '#9b1c2c' },
      { cx: 246, cy: 192, color: '#c9a84c' },
    ],
  },
  {
    path: 'M74,240 Q170,267 266,240',      // y=240, sag 27 px, hw 96
    lineDelay: '2.4s',
    baseDelay: 2.4,
    bulbs: [
      { cx:  74, cy: 240, color: '#9b1c2c' },
      { cx: 101, cy: 253, color: '#c9a84c' },
      { cx: 129, cy: 262, color: '#fffde7' },
      { cx: 156, cy: 266, color: '#9b1c2c' },
      { cx: 184, cy: 266, color: '#c9a84c' },
      { cx: 211, cy: 262, color: '#fffde7' },
      { cx: 239, cy: 253, color: '#9b1c2c' },
      { cx: 266, cy: 240, color: '#c9a84c' },
    ],
  },
]

// ── CSS animations ────────────────────────────────────────────────────────────
const CSS = `

/* ── Tree emoji ───────────────────────────────────────────────────────────────

   treeFadeIn — opacity 0 → 1 over 0.8 s (makes the silhouette appear)

   treeReveal — the "ornament bloom": transitions the emoji filter from
     grayscale(1) brightness(0.5)  →  grayscale(0) brightness(1.0)
     over 1.8 s starting at 3.2 s.  CSS interpolates both functions in lock
     step so color and brightness bloom together.  The backwards fill holds the
     dark-greyscale state during 0 s–3.2 s, giving the "bare tree" look without
     a separate emoji.  Because treeFadeIn and treeReveal animate different CSS
     properties (opacity vs filter) they compose without conflict.               */

@keyframes treeFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes treeReveal {
  from { filter: grayscale(1) brightness(0.5); }
  to   { filter: grayscale(0) brightness(1.0); }
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

/* ── Star glow — beacon (5.0–5.6 s) + twinkle (5.6–6.4 s) ──────────────────
   Single animation: duration 1.4 s, delay 5.0 s.
   Keyframe % = (t − 5.0) / 1.4:
      0 % = t 5.0 s — starts at 0
     43 % = t 5.6 s — beacon fully on (ease-out ramp)
     57 % = t 5.8 s — first flicker down
     71 % = t 6.0 s — flicker up
     86 % = t 6.2 s — flicker down again
    100 % = t 6.4 s — settles at full glow                                      */
@keyframes starGlow {
  0%   { opacity: 0;   animation-timing-function: ease-out; }
  43%  { opacity: 1;   animation-timing-function: linear;   }
  57%  { opacity: 0.4; }
  71%  { opacity: 0.9; }
  86%  { opacity: 0.4; }
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
//   0.0 s  🎄 fades in (0.8 s) with filter: grayscale(1) brightness(0.5)
//           — looks like a dark undecorated tree silhouette; snow runs throughout
//   1.0 s  Strand 1 wire draws; bulbs light left→right, 0.15 s stagger
//   1.8 s  Strand 2 same
//   2.4 s  Strand 3 same
//   ~3.0 s  All strands fully lit; natural pause
//   3.2 s  Ornament bloom begins: filter transitions grayscale→colour over 1.8 s
//           color and brightness ease in together; feels like ornaments materialising
//   5.0 s  Bloom complete (full colour) + star beacon ignites simultaneously
//           Smooth ease-out ramp to full glow over 0.6 s
//   5.6 s  Star twinkles: rapid flicker sequence over 0.8 s, then holds steady
//   6.2 s  "Deck My Tree" fades in
//   7.0 s  "Your Personal Holiday Stylist" fades in
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
              Two animations on the same element, different properties — no conflict:

              treeFadeIn (opacity, 0 s delay):
                opacity 0 → 1 over 0.8 s; backwards fill keeps it invisible
                before the animation kicks in.

              treeReveal (filter, 3.2 s delay):
                grayscale(1) brightness(0.5) → grayscale(0) brightness(1.0) over 1.8 s.
                Backwards fill holds the dark/greyscale state during 0 s–3.2 s so
                the tree reads as undecorated while the lights are added.
                CSS interpolates both filter functions simultaneously — the ornament
                colours and the overall brightness bloom in one smooth gesture.      */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            fontSize: 320, lineHeight: 1,
            textAlign: 'center', width: 340,
            zIndex: 1,
            opacity: 0,
            animation: 'treeFadeIn 0.8s ease-out 0s both, treeReveal 1.8s ease-in-out 3.2s both',
          }}>
            🎄
          </div>

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

          {/* ── Star glow + cardinal rays ─────────────────────────────────────────
              Centred on 🎄's star (≈ 8 % of 320 px = 26 px from top of container).
              Ignites at 5.0 s — exactly when treeReveal completes — so full colour
              and star beacon arrive together.
              SVG overflow:visible lets the ray lines extend beyond the 55 px box.  */}
          <div style={{
            position: 'absolute',
            left: '50%', top: 26,
            transform: 'translate(-50%, -50%)',
            zIndex: 3, pointerEvents: 'none',
          }}>
            <svg
              width="55" height="55"
              viewBox="-27.5 -27.5 55 55"
              overflow="visible"
              aria-hidden="true"
              style={{ opacity: 0, animation: 'starGlow 1.4s linear 5.0s both' }}
            >
              <defs>
                <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#ffeb96" stopOpacity="1.0" />
                  <stop offset="25%"  stopColor="#c9a84c" stopOpacity="0.8" />
                  <stop offset="70%"  stopColor="#c9a84c" stopOpacity="0.0" />
                </radialGradient>
              </defs>
              {/* Tight glow: 55 px diameter */}
              <circle cx="0" cy="0" r="27.5" fill="url(#starGrad)" />
              {/* Cardinal rays: start 15 px from centre, extend 20 px outward */}
              <line x1="0"   y1="-15" x2="0"   y2="-35" stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
              <line x1="0"   y1="15"  x2="0"   y2="35"  stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
              <line x1="-15" y1="0"   x2="-35" y2="0"   stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
              <line x1="15"  y1="0"   x2="35"  y2="0"   stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
            </svg>
          </div>

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
          animation: 'titleIn 0.6s ease 6.2s both',
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
          animation: 'taglineIn 0.7s ease 7.0s both',
        }}>
          Your Personal Holiday Stylist
        </div>

      </div>
    </div>
  )
}
