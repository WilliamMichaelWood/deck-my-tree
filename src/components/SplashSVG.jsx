import { useState, useEffect } from 'react'

// ── CSS animations ──────────────────────────────────────────────
const CSS = `
@keyframes starAwaken {
  from { opacity: 0; }
  to   { opacity: 0.9; }
}
@keyframes starPulse {
  0%, 100% { opacity: 0.9; }
  50%       { opacity: 1; }
}
@keyframes lightReveal {
  from { opacity: 0; transform: scale(0); }
  to   { opacity: 0.55; transform: scale(1); }
}
@keyframes twinkle {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%       { opacity: 1;    transform: scale(1.06); }
}
@keyframes ornReveal {
  0%   { opacity: 0; transform: scale(0) rotate(-15deg); }
  68%  { opacity: 1; transform: scale(1.14) rotate(3deg); }
  100% { opacity: 1; transform: scale(1)   rotate(0deg); }
}
@keyframes snowfall {
  0%   { transform: translate(0, -8px);           opacity: 0; }
  8%   { opacity: 0.7; }
  90%  { opacity: 0.4; }
  100% { transform: translate(var(--sdx), 105vh); opacity: 0; }
}
@keyframes titleIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

// ── Snowflakes ──────────────────────────────────────────────────
const FLAKES = Array.from({ length: 24 }, (_, i) => ({
  left: `${3 + (i * 41 + 7) % 94}%`,
  size: 1.5 + (i * 0.7) % 2.5,
  dur:  `${6 + (i * 1.4) % 7}s`,
  del:  `${(i * 0.65) % 8}s`,
  sdx:  `${((i * 17) % 28) - 14}px`,
}))

// ── Background stars ────────────────────────────────────────────
const BG_STARS = [
  [28,14,0.9,0.5],[68,6,0.7,0.38],[112,18,1.1,0.48],[188,10,0.8,0.42],
  [232,24,1.0,0.48],[258,8,0.7,0.38],[18,52,0.6,0.28],[284,40,0.9,0.48],
  [46,72,0.7,0.32],[276,68,0.8,0.38],[8,96,0.6,0.28],[292,92,0.7,0.32],
]

// ── Ornaments: [cx, cy, r, fill, highlight, delay(s)] ───────────
// Positioned in visible band of each tier (below the tier above it)
const ORN = [
  // tier 4 (visible y≈36–148, ornaments ~y=98)
  [133, 98,  5.5, '#b03a2e', 'rgba(255,220,210,0.40)', 2.4],
  [167, 98,  5.5, '#c8960a', 'rgba(255,250,200,0.45)', 2.65],
  // tier 3 visible band (y≈148–232, ornaments ~y=184)
  [100, 186, 6.2, '#1a5276', 'rgba(200,220,255,0.35)', 2.15],
  [150, 178, 6.8, '#1e7e45', 'rgba(200,255,220,0.35)', 2.80],
  [200, 186, 6.2, '#6c3483', 'rgba(220,200,255,0.35)', 2.40],
  // tier 2 visible band (y≈232–322, ornaments ~y=270)
  [ 80, 274, 7.2, '#b03a2e', 'rgba(255,220,210,0.38)', 2.05],
  [118, 268, 6.8, '#c8960a', 'rgba(255,250,200,0.42)', 2.55],
  [150, 260, 7.8, '#1a5276', 'rgba(200,220,255,0.35)', 3.00],
  [182, 268, 6.8, '#7d2060', 'rgba(255,200,235,0.35)', 2.30],
  [220, 274, 7.2, '#0f6b55', 'rgba(200,255,240,0.35)', 2.70],
  // tier 1 visible band (y≈322–394, ornaments ~y=350)
  [ 54, 354, 7.8, '#c8960a', 'rgba(255,250,200,0.42)', 1.95],
  [100, 348, 7.2, '#b03a2e', 'rgba(255,220,210,0.38)', 2.45],
  [150, 342, 8.5, '#1a5276', 'rgba(200,220,255,0.35)', 2.90],
  [200, 348, 7.2, '#1e7e45', 'rgba(200,255,220,0.35)', 2.20],
  [246, 354, 7.8, '#6c3483', 'rgba(220,200,255,0.35)', 2.65],
]

// ── Fairy lights ────────────────────────────────────────────────
const LIGHTS_RAW = [
  // tier 4 string (y≈100)
  { cx:114, cy:100, col:'#fff8d6' },{ cx:131, cy: 95, col:'#ffe0e0' },
  { cx:150, cy: 98, col:'#d6f5e8' },{ cx:169, cy: 95, col:'#fff8d6' },
  { cx:186, cy:100, col:'#d6e8ff' },
  // tier 3 string (y≈176)
  { cx: 88, cy:176, col:'#d6e8ff' },{ cx:108, cy:171, col:'#fff8d6' },
  { cx:130, cy:174, col:'#ffe0e0' },{ cx:150, cy:170, col:'#d6f5e8' },
  { cx:170, cy:174, col:'#fff8d6' },{ cx:192, cy:171, col:'#d6e8ff' },
  { cx:212, cy:176, col:'#ffe0e0' },
  // tier 2 string (y≈258)
  { cx: 62, cy:258, col:'#fff8d6' },{ cx: 83, cy:253, col:'#d6f5e8' },
  { cx:106, cy:256, col:'#d6e8ff' },{ cx:128, cy:252, col:'#ffe0e0' },
  { cx:150, cy:255, col:'#fff8d6' },{ cx:172, cy:252, col:'#d6f5e8' },
  { cx:194, cy:256, col:'#d6e8ff' },{ cx:217, cy:253, col:'#fff8d6' },
  { cx:238, cy:258, col:'#ffe0e0' },
  // tier 1 string (y≈338)
  { cx: 32, cy:338, col:'#d6e8ff' },{ cx: 56, cy:332, col:'#fff8d6' },
  { cx: 80, cy:335, col:'#ffe0e0' },{ cx:104, cy:330, col:'#d6f5e8' },
  { cx:128, cy:333, col:'#d6e8ff' },{ cx:150, cy:329, col:'#fff8d6' },
  { cx:172, cy:333, col:'#ffe0e0' },{ cx:196, cy:330, col:'#d6f5e8' },
  { cx:220, cy:335, col:'#d6e8ff' },{ cx:244, cy:332, col:'#fff8d6' },
  { cx:268, cy:338, col:'#ffe0e0' },
]
const LIGHTS = LIGHTS_RAW.map((l, i) => ({
  ...l,
  del:   `${1.80 + (i % 6) * 0.12}s`,
  twDel: `${2.20 + (i % 7) * 0.14}s`,
  twDur: `${2.1  + (i % 9) * 0.28}s`,
}))

// ── Component ───────────────────────────────────────────────────
export default function SplashSVG({ onFinish }) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setOpacity(1),    60)
    const t1 = setTimeout(() => setOpacity(0),  5400)
    const t2 = setTimeout(onFinish,             6400)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 38%, #0d1a2e 0%, #060c18 100%)',
      opacity,
      transition: opacity === 1 ? 'opacity 0.9s ease' : 'opacity 1.0s ease',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* ── Falling snow ─────────────────────────────────── */}
      {FLAKES.map((f, i) => (
        <div key={i} style={{
          position: 'absolute', left: f.left, top: 0,
          width: f.size, height: f.size,
          borderRadius: '50%',
          background: 'rgba(210,230,255,0.8)',
          pointerEvents: 'none',
          '--sdx': f.sdx,
          animation: `snowfall ${f.dur} linear ${f.del} infinite`,
        }} />
      ))}

      {/* ── Tree SVG ─────────────────────────────────────── */}
      {/*
        ViewBox 0 0 300 444
        Star:   center (150,16), outer R=13 → bottom outer at y=27
        Tier 4: tip y=36  → base y=148   (gap of 9px below star)
        Tier 3: tip y=90  → base y=232
        Tier 2: tip y=158 → base y=322
        Tier 1: tip y=226 → base y=394
        Trunk:  y=392–434
        Tiers use smooth cubic-bezier edges (no straight-line notches).
        Each tier filled with a top-to-bottom linearGradient (lighter
        at the tip, darker at the base) for natural depth.
      */}
      <svg
        viewBox="0 0 300 444"
        style={{ width: 'min(266px, 74vw)', height: 'auto', overflow: 'visible', flexShrink: 0 }}
        aria-hidden="true"
      >
        <defs>
          {/* ── Glow filters ─────────────────────────── */}
          <filter id="gLt" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="gMd" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="gStar" x="-180%" y="-180%" width="460%" height="460%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* ── Star gradient ────────────────────────── */}
          <radialGradient id="starFill" cx="40%" cy="32%" r="66%">
            <stop offset="0%"   stopColor="#fffde8"/>
            <stop offset="42%"  stopColor="#f5c428"/>
            <stop offset="100%" stopColor="#9c7200"/>
          </radialGradient>

          {/* ── Per-tier fill gradients (lighter top → darker base) ── */}
          {/* gradientUnits="userSpaceOnUse" locks gradient to SVG coords */}
          <linearGradient id="gT4" gradientUnits="userSpaceOnUse" x1="0" y1="36" x2="0" y2="148">
            <stop offset="0%"   stopColor="#1c7632"/>
            <stop offset="100%" stopColor="#0b3015"/>
          </linearGradient>
          <linearGradient id="gT3" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="232">
            <stop offset="0%"   stopColor="#176a2c"/>
            <stop offset="100%" stopColor="#082813"/>
          </linearGradient>
          <linearGradient id="gT2" gradientUnits="userSpaceOnUse" x1="0" y1="158" x2="0" y2="322">
            <stop offset="0%"   stopColor="#135e26"/>
            <stop offset="100%" stopColor="#071e0c"/>
          </linearGradient>
          <linearGradient id="gT1" gradientUnits="userSpaceOnUse" x1="0" y1="226" x2="0" y2="394">
            <stop offset="0%"   stopColor="#105220"/>
            <stop offset="100%" stopColor="#06140a"/>
          </linearGradient>

          {/* Bottom-shadow overlay gradient (bbox-relative, reused per tier) */}
          <linearGradient id="botSh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="52%"  stopColor="#000" stopOpacity="0"/>
            <stop offset="100%" stopColor="#040d08" stopOpacity="0.52"/>
          </linearGradient>
        </defs>

        {/* ── Background stars ──────────────────────────── */}
        {BG_STARS.map(([x, y, r, op], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#c8deff" opacity={op}/>
        ))}

        {/* ── TRUNK ─────────────────────────────────────── */}
        <rect x="136" y="392" width="28" height="42" rx="3.5" fill="#1c0b03"/>
        <rect x="140" y="392" width="19" height="42" rx="2"   fill="#2a1206" opacity="0.6"/>

        {/*
          ── TREE TIERS (back → front) ──────────────────────
          Rendering order: T1 first (background/base), T4 last (foreground/top).
          Each tier overlaps the tier below it.

          Edge path technique:
            Each side uses 2–3 cubic-bezier segments (C command) to create
            a smooth, flowing silhouette that suggests layered branches —
            no straight-line notches that produce a "stacked triangles" look.

          Depth layers per tier (inner → outer):
            1. Dark shadow backing (simple triangle, slightly wider)
            2. Main body with per-tier linearGradient fill
            3. Inner depth shadow (narrow central column, darker center)
            4. Tip highlight (lighter triangle at very top of tier)
            5. Bottom shadow overlay (same path, botSh gradient on top)
        */}

        {/* ── TIER 1 — base, widest ──────────────────────── */}
        {/* 1. Dark shadow backing */}
        <polygon points="150,222 6,400 294,400" fill="#040d08"/>
        {/* 2. Main body — smooth bezier edges */}
        <path
          d="M150,228
             C136,254 112,280 94,304
             C74,330 48,360 26,382
             L14,394 L286,394
             L274,382
             C252,360 226,330 206,304
             C188,280 164,254 150,228Z"
          fill="url(#gT1)"
        />
        {/* 3. Inner depth shadow */}
        <polygon points="150,228 98,394 202,394" fill="#000" opacity="0.11"/>
        {/* 4. Tip highlight */}
        <polygon points="150,228 108,294 192,294" fill="#165428" opacity="0.22"/>
        {/* 5. Bottom shadow overlay */}
        <path
          d="M150,228
             C136,254 112,280 94,304
             C74,330 48,360 26,382
             L14,394 L286,394
             L274,382
             C252,360 226,330 206,304
             C188,280 164,254 150,228Z"
          fill="url(#botSh)"
        />

        {/* ── TIER 2 ─────────────────────────────────────── */}
        <polygon points="150,154 28,328 272,328" fill="#040d08"/>
        <path
          d="M150,160
             C138,182 118,204 100,228
             C82,252 58,280 42,302
             L36,322 L264,322
             L258,302
             C242,280 218,252 200,228
             C182,204 162,182 150,160Z"
          fill="url(#gT2)"
        />
        <polygon points="150,160 104,322 196,322" fill="#000" opacity="0.10"/>
        <polygon points="150,160 108,224 192,224" fill="#175a28" opacity="0.24"/>
        <path
          d="M150,160
             C138,182 118,204 100,228
             C82,252 58,280 42,302
             L36,322 L264,322
             L258,302
             C242,280 218,252 200,228
             C182,204 162,182 150,160Z"
          fill="url(#botSh)"
        />

        {/* ── TIER 3 ─────────────────────────────────────── */}
        <polygon points="150,86 62,238 238,238" fill="#040d08"/>
        <path
          d="M150,92
             C140,112 122,132 108,154
             C92,176 76,202 70,226
             L70,232 L230,232
             L230,226
             C224,202 208,176 192,154
             C178,132 160,112 150,92Z"
          fill="url(#gT3)"
        />
        <polygon points="150,92 116,232 184,232" fill="#000" opacity="0.11"/>
        <polygon points="150,92 118,152 182,152" fill="#1a6430" opacity="0.26"/>
        <path
          d="M150,92
             C140,112 122,132 108,154
             C92,176 76,202 70,226
             L70,232 L230,232
             L230,226
             C224,202 208,176 192,154
             C178,132 160,112 150,92Z"
          fill="url(#botSh)"
        />

        {/* ── TIER 4 — topmost, smallest ─────────────────── */}
        <polygon points="150,32 100,152 200,152" fill="#040d08"/>
        <path
          d="M150,38
             C142,56 126,78 116,100
             C108,118 106,134 106,148
             L194,148
             C194,134 192,118 184,100
             C174,78 158,56 150,38Z"
          fill="url(#gT4)"
        />
        <polygon points="150,38 130,148 170,148" fill="#000" opacity="0.12"/>
        <polygon points="150,38 122,94 178,94" fill="#1e7036" opacity="0.28"/>
        <path
          d="M150,38
             C142,56 126,78 116,100
             C108,118 106,134 106,148
             L194,148
             C194,134 192,118 184,100
             C174,78 158,56 150,38Z"
          fill="url(#botSh)"
        />

        {/* ── FAIRY LIGHTS ──────────────────────────────── */}
        {LIGHTS.map((l, i) => (
          <g key={`l${i}`} transform={`translate(${l.cx},${l.cy})`}>
            <circle cx="0" cy="0" r="5" fill={l.col} opacity="0"
              filter="url(#gMd)"
              style={{
                transformBox: 'fill-box', transformOrigin: 'center',
                animation: `lightReveal 0.28s ease ${l.del} both, twinkle ${l.twDur} ease-in-out ${l.twDel} infinite`,
              }}
            />
            <circle cx="0" cy="0" r="2.2" fill={l.col} opacity="0"
              filter="url(#gLt)"
              style={{
                transformBox: 'fill-box', transformOrigin: 'center',
                animation: `lightReveal 0.28s ease ${l.del} both, twinkle ${l.twDur} ease-in-out ${l.twDel} infinite`,
              }}
            />
          </g>
        ))}

        {/* ── ORNAMENTS ──────────────────────────────────── */}
        {ORN.map(([cx, cy, r, fill, hl, del], i) => (
          <g key={`o${i}`} transform={`translate(${cx},${cy})`}>
            <circle cx="0" cy="0" r={r + 3.5} fill={fill} opacity="0"
              filter="url(#gLt)"
              style={{ transformBox: 'fill-box', transformOrigin: 'center',
                animation: `ornReveal 0.52s cubic-bezier(0.34,1.56,0.64,1) ${del}s both` }}
            />
            <circle cx="0" cy="0" r={r} fill={fill} opacity="0"
              style={{ transformBox: 'fill-box', transformOrigin: 'center',
                animation: `ornReveal 0.52s cubic-bezier(0.34,1.56,0.64,1) ${del}s both` }}
            />
            <ellipse cx={-r*0.28} cy={-r*0.28} rx={r*0.36} ry={r*0.22}
              fill={hl} opacity="0"
              style={{ transformBox: 'fill-box', transformOrigin: 'center',
                animation: `ornReveal 0.52s cubic-bezier(0.34,1.56,0.64,1) ${del}s both` }}
            />
            <rect x="-1.8" y={-r - 4.5} width="3.6" height="4.5" rx="1.2"
              fill="#b8860b" opacity="0"
              style={{ transformBox: 'fill-box', transformOrigin: 'center',
                animation: `ornReveal 0.52s cubic-bezier(0.34,1.56,0.64,1) ${del}s both` }}
            />
          </g>
        ))}

        {/*
          ── STAR ────────────────────────────────────────────
          Centered at (150, 16). Outer R=13, inner R=5.5.
          Bottom outer points land at y≈27 — 9 px above tier-4 tip (y=36).
          No large corona circles that bleed onto the tree.
          The star polygon carries its own gStar filter for the halo.
          A small hot-centre dot (r=5) adds the bright core glow.
          Both elements use starAwaken (fade-in) + starPulse (loop).
        */}
        {/* Hot centre dot — tight, above the tree */}
        <circle cx="150" cy="16" r="5" fill="#fff8c0" opacity="0"
          filter="url(#gMd)"
          style={{ animation: 'starAwaken 0.9s ease 1.0s both, starPulse 2.8s ease-in-out 2.0s infinite' }}
        />
        {/* Star polygon with wider halo */}
        <polygon
          points="150,3 153,12 163,12 156,18 158,27 150,22 142,27 144,18 137,12 147,12"
          fill="url(#starFill)" opacity="0"
          filter="url(#gStar)"
          style={{ animation: 'starAwaken 1.1s ease 0.9s both, starPulse 2.8s ease-in-out 2.0s infinite' }}
        />
        {/* Star inner bright highlight */}
        <polygon
          points="150,3 153,12 163,12 156,18 158,27 150,22 142,27 144,18 137,12 147,12"
          fill="#fffef0" opacity="0"
          style={{
            mixBlendMode: 'screen',
            animation: 'starAwaken 0.8s ease 1.1s both, starPulse 2.8s ease-in-out 2.0s infinite',
          }}
        />

        {/* ── Ground shadow ──────────────────────────────── */}
        <ellipse cx="150" cy="436" rx="56" ry="7" fill="#030a06" opacity="0.7"/>
      </svg>

      {/* ── Title ─────────────────────────────────────────── */}
      <div style={{
        marginTop: 22,
        textAlign: 'center',
        animation: 'titleIn 0.9s ease 4.2s both',
        pointerEvents: 'none',
      }}>
        <div style={{
          color: '#e4d4a8',
          fontSize: 'clamp(17px, 4.5vw, 22px)',
          fontWeight: 300,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}>
          Deck My Tree
        </div>
        <div style={{
          color: 'rgba(200,185,145,0.55)',
          fontSize: 'clamp(10px, 2.8vw, 12px)',
          letterSpacing: '0.24em',
          marginTop: 5,
          textTransform: 'uppercase',
        }}>
          Your Holiday Stylist
        </div>
      </div>
    </div>
  )
}
