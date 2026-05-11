/**
 * Ornament.jsx — Shared ornament renderer
 *
 * <Ornament shape="ball" color="#e8b942" size={64} />
 *
 * shape : ball | drop | star | snowflake | pinecone | bow | bell | berry
 * color : hex string for the main fill
 * size  : rendered width in px (height auto-scales by aspect ratio)
 *
 * Context-specific framing (background glow, halo, scale) is the consuming
 * component's responsibility — not handled here.
 */
import { useRef } from 'react'

// Aspect ratios (height / width) per shape — from TreeAdvisor's SHAPE_ASPECT
const SHAPE_ASPECT = {
  ball:      1.23,
  drop:      1.40,
  pinecone:  1.33,
  bell:      1.20,
  berry:     1.13,
  bow:       0.70,
  star:      1.23,
  snowflake: 1.00,
}

// Antique brass cap — deep warm gold, not raw brown
// Registered as --gold-cap in App.css
const CAP = '#7a6840'

// Shapes that have no solid body to bloom — handled differently
const FLOATING = new Set(['star', 'snowflake', 'bow'])

// Single drop shadow applied via filter on the SVG wrapper
const SHADOW = 'drop-shadow(2px 3px 3px rgba(0,0,0,0.45))'

// ─── Shape SVGs ──────────────────────────────────────────────────────────────
// Each shape embeds:
//   1. Base fill
//   2. Radial gradient overlay (multiply blend) — lighter top-left → darker bottom-right
//   3. Diffuse specular lobe — rgba(255,255,255,0.55), upper-left, rotated
//   4. Point specular dot   — rgba(255,255,255,0.85), inside the lobe
//   5. Cap in CAP color where applicable

function BallShape({ color, gid }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={gid} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.30)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.40)" />
        </radialGradient>
        <clipPath id={`${gid}c`}><circle cx="30" cy="46" r="26"/></clipPath>
      </defs>
      <rect x="26" y="0" width="8" height="14" rx="3.5" fill={CAP}/>
      <circle cx="30" cy="46" r="26" fill={color}/>
      <rect x="4" y="20" width="52" height="52"
        fill={`url(#${gid})`} clipPath={`url(#${gid}c)`}
        style={{ mixBlendMode: 'multiply' }}/>
      <ellipse cx="20" cy="34" rx="8" ry="6" fill="rgba(255,255,255,0.55)" transform="rotate(-20 20 34)"/>
      <circle  cx="18" cy="32" r="2.8" fill="rgba(255,255,255,0.85)"/>
    </svg>
  )
}

function DropShape({ color, gid }) {
  const body = "M30,13 C18,13 7,27 7,45 C7,62 17,76 30,76 C43,76 53,62 53,45 C53,27 42,13 30,13 Z"
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 84" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={gid} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.30)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.40)" />
        </radialGradient>
        <clipPath id={`${gid}c`}><path d={body}/></clipPath>
      </defs>
      <rect x="26" y="0" width="8" height="13" rx="3.5" fill={CAP}/>
      <path d={body} fill={color}/>
      <rect x="7" y="13" width="46" height="63"
        fill={`url(#${gid})`} clipPath={`url(#${gid}c)`}
        style={{ mixBlendMode: 'multiply' }}/>
      <ellipse cx="20" cy="30" rx="6" ry="10" fill="rgba(255,255,255,0.55)" transform="rotate(-15 20 30)"/>
      <circle  cx="18" cy="26" r="2.8" fill="rgba(255,255,255,0.85)"/>
    </svg>
  )
}

function StarShape({ color, gid }) {
  // Outer R=24, inner r=10, center (30,47) — fills the viewBox like ball does
  // Top outer point at y=23; cap y=0-11; thin stem y=11-23 bridges the gap
  const pts = "30,23 36,39 53,40 40,50 44,66 30,57 16,66 21,50 7,40 24,39"
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cap + stem */}
      <rect x="26" y="0" width="8" height="11" rx="3.5" fill={CAP}/>
      <rect x="28" y="11" width="4" height="13" fill={CAP}/>
      {/* Star body — flat metallic foil, no multiply blend */}
      <polygon points={pts} fill={color}/>
      {/* Metallic sheen: soft specular on upper-left facet of the star body */}
      <ellipse cx="17" cy="38" rx="5" ry="3.5" fill="rgba(255,255,255,0.50)" transform="rotate(-35 17 38)"/>
      <circle  cx="15" cy="37" r="1.8" fill="rgba(255,255,255,0.85)"/>
    </svg>
  )
}

function SnowflakeShape({ color, gid }) {
  // Flat foil/paper — transparent linework, no fill, no dark circle, no multiply blend
  // Soft warm inner glow only (suggests light catching foil edges)
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={gid} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="rgba(255,248,220,0.20)" />
          <stop offset="100%" stopColor="rgba(255,248,220,0)" />
        </radialGradient>
      </defs>
      {/* Shadow layer for depth — offset repeat of main arms, no fill */}
      <g stroke="rgba(0,0,0,0.22)" strokeWidth="4.5" strokeLinecap="round" transform="translate(1,1.5)">
        <line x1="30" y1="6"  x2="30" y2="54"/>
        <line x1="7"  y1="19" x2="53" y2="41"/>
        <line x1="53" y1="19" x2="7"  y2="41"/>
      </g>
      {/* Main arms — stroke only, transparent background */}
      <g stroke={color} strokeWidth="4.5" strokeLinecap="round">
        <line x1="30" y1="6"  x2="30" y2="54"/>
        <line x1="7"  y1="19" x2="53" y2="41"/>
        <line x1="53" y1="19" x2="7"  y2="41"/>
        <line x1="23" y1="17" x2="37" y2="17"/>
        <line x1="23" y1="43" x2="37" y2="43"/>
        <line x1="14" y1="22" x2="22" y2="14"/>
        <line x1="38" y1="46" x2="46" y2="38"/>
        <line x1="46" y1="22" x2="38" y2="14"/>
        <line x1="22" y1="46" x2="14" y2="38"/>
      </g>
      {/* Center disk */}
      <circle cx="30" cy="30" r="4.5" fill={color}/>
      {/* Soft warm inner glow — foil catching ambient light, no dark fill */}
      <circle cx="30" cy="30" r="26" fill={`url(#${gid})`}/>
    </svg>
  )
}

function PineconeShape({ color, gid }) {
  // Scale shape: arch that extends downward from attachment line
  // Draw bottom-to-top so upper rows paint over lower rows
  const sc = (cx, y, w = 10, h = 8) =>
    `M${cx - w / 2},${y} C${cx - w / 2},${y + h * 0.55} ${cx},${y + h} ${cx},${y + h} C${cx},${y + h} ${cx + w / 2},${y + h * 0.55} ${cx + w / 2},${y} Z`

  return (
    <svg width="100%" height="100%" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Matte depth gradient: lighter at top, darker at bottom — NORMAL blend, not multiply */}
        <linearGradient id={gid} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.14)" />
          <stop offset="45%"  stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
        </linearGradient>
        {/* Clip all scale geometry to the cone ellipse */}
        <clipPath id={`${gid}c`}><ellipse cx="30" cy="48" rx="19" ry="29"/></clipPath>
      </defs>

      {/* Cap */}
      <rect x="26" y="0" width="8" height="12" rx="3" fill={CAP}/>

      {/* Base fill */}
      <ellipse cx="30" cy="48" rx="18" ry="28" fill={color}/>

      {/* Scale geometry — all clipped to cone; painted bottom→top so upper rows overlay lower */}
      <g clipPath={`url(#${gid}c)`}>
        {/* Row A — bottom, single wide scale */}
        <path d={sc(30, 66, 16, 9)} fill="rgba(0,0,0,0.28)"/>
        {/* Row B */}
        <path d={sc(21, 59, 12, 9)} fill="rgba(0,0,0,0.24)"/>
        <path d={sc(39, 59, 12, 9)} fill="rgba(0,0,0,0.24)"/>
        {/* Row C */}
        <path d={sc(14, 52, 10, 9)} fill="rgba(0,0,0,0.22)"/>
        <path d={sc(30, 52, 10, 9)} fill="rgba(0,0,0,0.22)"/>
        <path d={sc(46, 52, 10, 9)} fill="rgba(0,0,0,0.22)"/>
        {/* Row D */}
        <path d={sc(22, 45, 11, 9)} fill="rgba(0,0,0,0.20)"/>
        <path d={sc(38, 45, 11, 9)} fill="rgba(0,0,0,0.20)"/>
        {/* Row E */}
        <path d={sc(15, 38, 10, 8)} fill="rgba(0,0,0,0.17)"/>
        <path d={sc(30, 38, 10, 8)} fill="rgba(0,0,0,0.17)"/>
        <path d={sc(45, 38, 10, 8)} fill="rgba(0,0,0,0.17)"/>
        {/* Row F */}
        <path d={sc(22, 31, 9, 8)} fill="rgba(0,0,0,0.14)"/>
        <path d={sc(38, 31, 9, 8)} fill="rgba(0,0,0,0.14)"/>
        {/* Row G — top, single narrow scale */}
        <path d={sc(30, 25, 8, 7)} fill="rgba(0,0,0,0.11)"/>
      </g>

      {/* Matte depth gradient overlay — normal blend, no multiply */}
      <ellipse cx="30" cy="48" rx="18" ry="28" fill={`url(#${gid})`}/>
    </svg>
  )
}

function BowShape({ color, gid }) {
  // Fabric treatment — no radial gradient, no specular
  // Fold shadows: darker at inner fold (center), lighter at outer crest of each loop
  const lL = `${gid}L`, lR = `${gid}R`, cL = `${gid}cL`, cR = `${gid}cR`
  const loopL = "M40,28 Q28,10 10,14 Q4,22 10,30 Q22,38 40,28 Z"
  const loopR = "M40,28 Q52,10 70,14 Q76,22 70,30 Q58,38 40,28 Z"
  return (
    <svg width="100%" height="100%" viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Left loop: lighter on outer edge (x=4), darker at inner fold (x=40) */}
        <linearGradient id={lL} x1="4" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.18)"/>
          <stop offset="55%"  stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.28)"/>
        </linearGradient>
        {/* Right loop: darker at inner fold (x=40), lighter on outer edge (x=76) */}
        <linearGradient id={lR} x1="40" y1="0" x2="76" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.28)"/>
          <stop offset="45%"  stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.18)"/>
        </linearGradient>
        <clipPath id={cL}><path d={loopL}/></clipPath>
        <clipPath id={cR}><path d={loopR}/></clipPath>
      </defs>

      {/* Left loop — base fill then fabric gradient overlay */}
      <path d={loopL} fill={color}/>
      <rect x="4" y="10" width="36" height="28"
        fill={`url(#${lL})`} clipPath={`url(#${cL})`}/>

      {/* Right loop — base fill then fabric gradient overlay */}
      <path d={loopR} fill={color}/>
      <rect x="40" y="10" width="36" height="28"
        fill={`url(#${lR})`} clipPath={`url(#${cR})`}/>

      {/* Centre knot — slightly darker shade to anchor the bow */}
      <ellipse cx="40" cy="28" rx="8" ry="7" fill={color}/>
      <ellipse cx="40" cy="28" rx="8" ry="7" fill="rgba(0,0,0,0.18)"/>

      {/* Ribbon tails */}
      <path d="M36,33 Q30,46 22,50" stroke={color} strokeWidth="5.5" strokeLinecap="round"/>
      <path d="M44,33 Q50,46 58,50" stroke={color} strokeWidth="5.5" strokeLinecap="round"/>
      {/* Subtle shadow on underside of tails */}
      <path d="M36,33 Q30,46 22,50" stroke="rgba(0,0,0,0.18)" strokeWidth="3" strokeLinecap="round"/>
      <path d="M44,33 Q50,46 58,50" stroke="rgba(0,0,0,0.18)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

function BellShape({ color, gid }) {
  const body = "M30,13 C16,13 8,26 8,42 L8,54 Q8,58 12,58 L48,58 Q52,58 52,54 L52,42 C52,26 44,13 30,13 Z"
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={gid} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.30)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.40)" />
        </radialGradient>
        <clipPath id={`${gid}c`}><path d={body}/></clipPath>
      </defs>
      {/* Hanger */}
      <rect x="26" y="0" width="8" height="11" rx="3.5" fill={CAP}/>
      <ellipse cx="30" cy="11" rx="5" ry="2.5" fill="none" stroke={CAP} strokeWidth="1.5"/>
      {/* Bell body */}
      <path d={body} fill={color}/>
      <rect x="8" y="13" width="44" height="45"
        fill={`url(#${gid})`} clipPath={`url(#${gid}c)`}
        style={{ mixBlendMode: 'multiply' }}/>
      {/* Flared rim */}
      <rect x="5" y="54" width="50" height="7" rx="3.5" fill={color}/>
      <rect x="5" y="54" width="50" height="3"  rx="1.5" fill="rgba(0,0,0,0.20)"/>
      {/* Clapper */}
      <circle cx="30" cy="63" r="3" fill={CAP}/>
      {/* Specular */}
      <ellipse cx="19" cy="27" rx="7" ry="5" fill="rgba(255,255,255,0.55)" transform="rotate(-20 19 27)"/>
      <circle  cx="17" cy="25" r="2.8" fill="rgba(255,255,255,0.85)"/>
    </svg>
  )
}

function BerryShape({ color, gid }) {
  const ga = `${gid}a`, gb = `${gid}b`, gc = `${gid}c2`
  const ca = `${gid}ca`, cb = `${gid}cb`, cc = `${gid}cc`
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={ga} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.30)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.40)" />
        </radialGradient>
        <radialGradient id={gb} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
        <radialGradient id={gc} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
        <clipPath id={ca}><circle cx="30" cy="35" r="14"/></clipPath>
        <clipPath id={cb}><circle cx="16" cy="50" r="12"/></clipPath>
        <clipPath id={cc}><circle cx="44" cy="50" r="12"/></clipPath>
      </defs>
      <rect x="27" y="0" width="6" height="12" rx="3" fill={CAP}/>
      {/* Top berry */}
      <circle cx="30" cy="35" r="14" fill={color}/>
      <rect x="16" y="21" width="28" height="28"
        fill={`url(#${ga})`} clipPath={`url(#${ca})`}
        style={{ mixBlendMode: 'multiply' }}/>
      {/* Left berry */}
      <circle cx="16" cy="50" r="12" fill={color}/>
      <rect x="4"  y="38" width="24" height="24"
        fill={`url(#${gb})`} clipPath={`url(#${cb})`}
        style={{ mixBlendMode: 'multiply' }}/>
      {/* Right berry */}
      <circle cx="44" cy="50" r="12" fill={color}/>
      <rect x="32" y="38" width="24" height="24"
        fill={`url(#${gc})`} clipPath={`url(#${cc})`}
        style={{ mixBlendMode: 'multiply' }}/>
      {/* Specular — diffuse lobe + point dot per berry */}
      <ellipse cx="23" cy="28" rx="5" ry="4" fill="rgba(255,255,255,0.55)" transform="rotate(-20 23 28)"/>
      <circle  cx="22" cy="27" r="1.8" fill="rgba(255,255,255,0.85)"/>
      <ellipse cx="10" cy="43" rx="4" ry="3" fill="rgba(255,255,255,0.45)" transform="rotate(-20 10 43)"/>
      <circle  cx="9"  cy="42" r="1.5" fill="rgba(255,255,255,0.85)"/>
      <ellipse cx="38" cy="43" rx="4" ry="3" fill="rgba(255,255,255,0.40)" transform="rotate(-20 38 43)"/>
      <circle  cx="37" cy="42" r="1.5" fill="rgba(255,255,255,0.80)"/>
    </svg>
  )
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

function ShapeDispatch({ shape, color, gid }) {
  switch (shape) {
    case 'drop':      return <DropShape      color={color} gid={gid} />
    case 'star':      return <StarShape      color={color} gid={gid} />
    case 'snowflake': return <SnowflakeShape color={color} gid={gid} />
    case 'pinecone':  return <PineconeShape  color={color} gid={gid} />
    case 'bow':       return <BowShape       color={color} gid={gid} />
    case 'bell':      return <BellShape      color={color} gid={gid} />
    case 'berry':     return <BerryShape     color={color} gid={gid} />
    default:          return <BallShape      color={color} gid={gid} />
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

let _counter = 0

export default function Ornament({ shape = 'ball', color = '#e8b942', size = 64 }) {
  // Stable per-instance ID — never changes after mount, keeps SVG gradient IDs unique
  const gidRef = useRef(null)
  if (gidRef.current === null) gidRef.current = `orn${_counter++}`
  const gid = gidRef.current

  const aspect = SHAPE_ASPECT[shape] ?? 1.0
  const w = size
  const h = Math.round(size * aspect)

  return (
    <div style={{
      position:    'relative',
      width:       `${w}px`,
      height:      `${h}px`,
      display:     'inline-block',
      flexShrink:  0,
      filter:      SHADOW,
    }}>
      <ShapeDispatch shape={shape} color={color} gid={gid} />
    </div>
  )
}
