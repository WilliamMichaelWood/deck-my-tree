import { useState, useEffect } from 'react'

// ── Snowflakes — 25 elements with pseudo-random properties ────────────
const SNOW = Array.from({ length: 25 }, (_, i) => ({
  left:     `${(i * 37 + 11) % 97}%`,
  size:     3 + (i % 3),                                   // 3–5 px
  duration: `${(3 + ((i * 17) % 40) / 10).toFixed(1)}s`,  // 3.0–7.0 s
  delay:    `${((i * 13) % 70  / 10).toFixed(1)}s`,        // 0–7 s stagger
  opacity:  +(0.4 + ((i * 5)  % 50) / 100).toFixed(2),    // 0.40–0.85
}))

// ── Ornament dots — 18 px circles at branch-tip positions ────────────
// Positions are % of the 200 × 215 px tree container.
// 🎄 at 180 px is centered in the container; branch edges approximate
// the emoji's triangular silhouette.
const ORNAMENTS = [
  { left: '20%', top: '36%', color: '#9b1c2c', delay: '1.2s' }, // cranberry — left, upper tier
  { left: '78%', top: '43%', color: '#c9a84c', delay: '1.8s' }, // gold      — right, upper-mid
  { left: '85%', top: '58%', color: '#f8f4ec', delay: '2.4s' }, // white     — right, mid tier
  { left: '13%', top: '63%', color: '#e8a0a0', delay: '3.0s' }, // soft pink — left, lower-mid
  { left: '86%', top: '74%', color: '#1d5c3a', delay: '3.6s' }, // forest green — right, lower
]

// ── CSS animations ────────────────────────────────────────────────────
const CSS = `
@keyframes treeFadeIn {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}

/* Ornaments: translate(-50%,-50%) keeps the dot centered on its left/top point */
@keyframes ornFadeIn {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
  60%  { opacity: 1; transform: translate(-50%,-50%) scale(1.18); }
  100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

/* Gold star glow pulse at 4.2 s */
@keyframes starPulse {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.5);  box-shadow: none; }
  18%  { opacity: 1; transform: translate(-50%,-50%) scale(1.0);  box-shadow: 0 0 8px #c9a84c; }
  52%  { transform: translate(-50%,-50%) scale(1.42); box-shadow: 0 0 20px #c9a84c, 0 0 44px rgba(201,168,76,0.50); }
  78%  { transform: translate(-50%,-50%) scale(1.08); box-shadow: 0 0 10px #c9a84c; }
  100% { opacity: 1; transform: translate(-50%,-50%) scale(1.0);  box-shadow: 0 0 8px rgba(201,168,76,0.65); }
}

/* Snowflakes fade in near the top, fall, fade out at the bottom */
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
    const t0 = setTimeout(() => setOuterOpacity(1),    50)   // begin fade-in
    const t1 = setTimeout(() => setOuterOpacity(0),  7000)   // begin fade-out
    const t2 = setTimeout(onFinish,                  7900)   // hand off to app
    return () => [t0, t1, t2].forEach(clearTimeout)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0f1f35',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: outerOpacity,
      transition: outerOpacity === 1 ? 'opacity 0.8s ease' : 'opacity 0.9s ease',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* ── Snowflakes — z-index 0, behind tree ──────────────── */}
      {SNOW.map((f, i) => (
        // Outer div caps the peak opacity for this flake
        <div key={`sw${i}`} style={{
          position: 'absolute', left: f.left, top: 0,
          width: f.size, height: f.size,
          opacity: f.opacity,
          zIndex: 0, pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: '#dde8ff',
            animation: `snowFall ${f.duration} linear ${f.delay} infinite`,
          }} />
        </div>
      ))}

      {/* ── Main content — z-index 1, slightly above center ──── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: 'translateY(-8vh)',
      }}>

        {/* Tree container — 200 × 215 px holds emoji + overlays */}
        <div style={{ position: 'relative', width: 200, height: 215 }}>

          {/* 🎄 emoji */}
          <div style={{
            fontSize: 180,
            lineHeight: 1,
            textAlign: 'center',
            width: 200,
            animation: 'treeFadeIn 0.8s ease 0.05s both',
          }}>
            🎄
          </div>

          {/* Gold glow dot over the star at the tree's peak — pulses at 4.2 s */}
          <div style={{
            position: 'absolute',
            left: '50%', top: '7%',
            width: 22, height: 22,
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.55)',
            animation: 'starPulse 0.85s cubic-bezier(0.34,1.2,0.64,1) 4.2s both',
          }} />

          {/* Ornament dots — appear one by one on the branches */}
          {ORNAMENTS.map((o, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: o.left, top: o.top,
              width: 18, height: 18,
              borderRadius: '50%',
              background: o.color,
              boxShadow: `0 2px 8px rgba(0,0,0,0.45), 0 0 8px ${o.color}`,
              animation: `ornFadeIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${o.delay} both`,
            }} />
          ))}
        </div>

        {/* Title — Playfair Display loaded in index.html, gold */}
        <div style={{
          marginTop: 22,
          color: '#c9a84c',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(22px, 6vw, 32px)',
          fontWeight: 400,
          letterSpacing: '0.13em',
          opacity: 0,
          animation: 'titleIn 0.6s ease 5.0s both',
        }}>
          Deck My Tree
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: 9,
          color: 'rgba(228,212,168,0.62)',
          fontSize: 'clamp(10px, 2.8vw, 12px)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          opacity: 0,
          animation: 'taglineIn 0.7s ease 5.8s both',
        }}>
          Your Personal Holiday Stylist
        </div>

      </div>
    </div>
  )
}
