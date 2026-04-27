import { useState, useEffect, useRef, useCallback } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'
import CurationModal from './CurationModal'

const BASE_ANALYSIS_PROMPT = `You are a professional Christmas tree decorator. Every response must apply the four mandatory rules below — these are non-negotiable constraints, not suggestions. Violation of any rule is an error.

MANDATORY RULE 1 — ORNAMENT COUNT
Target: 10–15 ornaments per vertical foot of tree height. State the estimated tree height, compute the target range (e.g. "6 ft tree → 60–90 ornaments"), and compare it to what you observe. A precisely placed 80-ornament tree outperforms a random 120-ornament tree every time.

MANDATORY RULE 2 — THREE-ZONE PLACEMENT (must name the zone in every recommendation)
Zone A — Deep/trunk (30–40% of ornaments): matte, dark, or flat-finish pieces only. These create shadow depth and visual richness that makes the whole tree look fuller.
Zone B — Mid-branch (30–40%): mixed textures — glass, wood, metallics. The structural layer.
Zone C — Outer tips (20–30%): your largest, boldest, most detailed pieces. This is the only zone the eye lands on first; it must earn that attention.
Never say "add an ornament" without specifying Zone A, B, or C.

MANDATORY RULE 3 — FIVE-TYPE ORNAMENT SYSTEM (cite type percentages in every diagnosis)
Type 1 — Ball ornaments: 40–50% of total. The backbone. Non-negotiable.
Type 2 — Textural objects (wood, rope, woven, fabric): 20–25%.
Type 3 — Statement shapes (stars, animals, sculptural): 10–15%.
Type 4 — Reflective accents (metallics, glitter, mercury glass): 10–15%.
Type 5 — Wildcard (one unexpected category, max one): 5–10%.
If you cannot identify a tree's type breakdown from the photo, say so and prescribe the target ratios explicitly.

MANDATORY RULE 4 — COLOR SYSTEM (state the color count and ratio in every response)
Maximum colors: 3 (editorial) or 4 (layered). Five or more colors = diagnose as chaos and prescribe a reduction.
Required ratio: base color 60% of ornaments, secondary color 25–30%, accent color 10–15%, optional wildcard ≤5%.
Placement rule: always cluster same-color ornaments in odd groups of 3 or 5 — never pairs, never isolated singles.

YOUR OUTPUT:
Study this specific photo — tree shape, height estimate, existing ornaments, colors, tree type (real/artificial), lighting. Give exactly 5 bullet points. Each bullet must:
1. Reference something visible in this specific photo (name colors, describe what you see)
2. Apply at least one of the four mandatory rules by name or number
3. State a specific percentage, zone, or type when making any recommendation
4. Never use the phrase "add more ornaments" — always say which zone, which type, and why

Tone: direct and expert, like a decorator reviewing a client's tree on-site. 1–2 complete sentences per bullet. No headers. No hedging.`

const getAnalysisPrompt = () => {
  try {
    const owned = JSON.parse(localStorage.getItem('deck-my-tree-ornaments') || '[]')
    if (!owned.length) return BASE_ANALYSIS_PROMPT
    const list = owned.map(o =>
      `• ${o.name} (${o.colorDesc || o.color || 'unknown color'}, ${o.material}${o.shape ? `, ${o.shape}` : ''})`
    ).join('\n')
    return `${BASE_ANALYSIS_PROMPT}\n\nThe user already owns these ornaments — if any would complement what you see on this tree, mention them by name and explain why they'd work:\n${list}`
  } catch { return BASE_ANALYSIS_PROMPT }
}

// ── Triangle placement engine (AI-detected bounds) ────────────────────────
// Claude vision detects the tree bounding box. We build an inset triangle from
// those coords and generate all positions client-side — AI supplies metadata only.

const DETECT_PROMPT = `Analyze this image and return ONLY a JSON object with the Christmas tree bounding box as image-percentage coordinates, estimated tree height in feet, and whether the tree has string lights: {"treeTop":N,"treeBottom":N,"treeLeft":N,"treeRight":N,"treeCenterX":N,"treeHeightFt":N,"hasLights":true/false}. Look carefully at the tree branches for ANY signs of lighting — warm glowing points, bright spots between branches, illuminated areas, or a general glow emanating from the tree. If there is ANY indication of lights, return hasLights: true. Only return hasLights: false if the tree is clearly completely dark and unlit. If the tree appears professionally photographed, fully decorated, or is in a well-lit indoor setting where lights would be expected, default to hasLights: true. No other text, just the JSON.`

// Build an inset triangle from Claude's detected bounding box
function buildDetectedTri(b) {
  const cl  = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const top = cl(b.treeTop    ?? 10,  0,  50)
  const bot = cl(b.treeBottom ?? 88, 50, 100)
  const lft = cl(b.treeLeft   ??  5,  0,  45)
  const rgt = cl(b.treeRight  ?? 95, 55, 100)
  const cx  = cl(b.treeCenterX ?? 50, 10, 90)

  // Pull each vertex 8% toward centroid — keeps ornaments off the silhouette edge
  const INSET = 0.08
  const gcx = (cx  + lft + rgt) / 3
  const gcy = (top + bot + bot) / 3
  const pull = (vx, vy) => ({ x: vx + INSET * (gcx - vx), y: vy + INSET * (gcy - vy) })

  return {
    apex:  pull(cx,  top),
    baseL: pull(lft, bot),
    baseR: pull(rgt, bot),
  }
}

// Linear interpolation: allowed x range at a given y inside the triangle
function xRangeAtY(y, tri) {
  const h    = tri.baseL.y - tri.apex.y
  const frac = Math.max(0, Math.min(1, (y - tri.apex.y) / h))
  const hw   = ((tri.baseR.x - tri.baseL.x) / 2) * frac
  return { xMin: tri.apex.x - hw, xMax: tri.apex.x + hw }
}

// Point-in-triangle test (sign method) — final safety check
function triSign(p1x, p1y, p2x, p2y, p3x, p3y) {
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y)
}
function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = triSign(px, py, ax, ay, bx, by)
  const d2 = triSign(px, py, bx, by, cx, cy)
  const d3 = triSign(px, py, cx, cy, ax, ay)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}

// ── Light strand generation ───────────────────────────────────────────────────
const WARM_WHITE  = { bulb: '#fffde7', glow: '#f9a825' }
const COOL_WHITE  = { bulb: '#e3f2fd', glow: '#90caf9' }
const MULTICOLORS = ['#ef5350', '#c9a84c', '#1d5c3a', '#1a2a6b']

function getLightColors(palette) {
  if (!palette) return WARM_WHITE
  const cols = [palette.base, palette.secondary, palette.accent].filter(Boolean).map(c => c.toLowerCase())
  // Detect saturation: count colors that are clearly non-neutral
  const isCool    = cols.some(c => /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.test(c) && (() => {
    const b = parseInt(c.slice(5, 7), 16), r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16)
    return b > r + 20 && b > g + 20  // blue-dominant
  })())
  const warmWords = /gold|ivory|champagne|cream|copper|bronze|amber|warm/i
  const coolWords = /silver|blue|white|grey|gray|ice|frost|crystal/i
  const multiWords = /red|green|pink|purple|magenta|rainbow/i
  const str = cols.join(',')
  const isWarm  = warmWords.test(str) || cols.some(c => {
    const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16)
    return r > 180 && g > 130 && b < 100  // warm-toned hex
  })
  const isMulti = multiWords.test(str) || (
    cols.filter(c => { const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16); return Math.max(r,g,b) - Math.min(r,g,b) > 80 }).length >= 2
  )
  if (isCool || coolWords.test(str)) return COOL_WHITE
  if (isMulti) return { bulb: null, glow: null, multi: true }
  if (isWarm)  return WARM_WHITE
  return WARM_WHITE
}

function generateLightStrands(bounds, palette) {
  const tri = buildDetectedTri(bounds || {})
  const treeH = tri.baseL.y - tri.apex.y
  const lightColors = getLightColors(palette)
  const STRAND_YFS  = [0.28, 0.52, 0.74]
  const BULBS_PER   = 9

  return STRAND_YFS.map((yF, si) => {
    const baseY = tri.apex.y + yF * treeH
    const { xMin, xMax } = xRangeAtY(baseY, tri)
    const edgePad = (xMax - xMin) * 0.03
    const lo = xMin + edgePad
    const hi = xMax - edgePad
    const bulbs = Array.from({ length: BULBS_PER }, (_, bi) => {
      const t = BULBS_PER === 1 ? 0.5 : bi / (BULBS_PER - 1)
      const x = lo + t * (hi - lo)
      // Sine drape: bulbs bow slightly downward in the middle, like a real strand
      const drape = Math.sin(bi / (BULBS_PER - 1) * Math.PI) * (treeH * 0.02)
      // Per-bulb random y jitter ±2% of image height
      const jitter = (Math.random() - 0.5) * 4
      const y = baseY + drape + jitter
      const colorIdx = bi % MULTICOLORS.length
      return {
        x,
        y,
        color:     lightColors.multi ? MULTICOLORS[colorIdx]        : lightColors.bulb,
        glowColor: lightColors.multi ? MULTICOLORS[colorIdx] + '80' : lightColors.glow + '80',
        delay:     Math.random() * 2000,
      }
    })
    return { id: si, y: baseY, xMin: lo, xMax: hi, bulbs }
  })
}

// ── Spiral-band placement ─────────────────────────────────────────────────────
// Divides the tree into 5 horizontal bands. Within each band, ornaments are
// placed using a golden-angle spiral offset so they naturally alternate
// left/right/center without being perfectly symmetric. Size graduation follows
// the tapered silhouette: mid-band (40–60%) gets the largest anchors.
//
// Every position is clamped to xRangeAtY() — no ornament can escape the
// silhouette. Color distribution is handled in the caller's mapping step.

const BANDS = [
  { yLo: 0.00, yHi: 0.20, frac: 0.12, rMin: 1.2, rMax: 1.5 },  // top — small
  { yLo: 0.20, yHi: 0.40, frac: 0.20, rMin: 1.4, rMax: 1.8 },  // upper-mid
  { yLo: 0.40, yHi: 0.60, frac: 0.28, rMin: 1.6, rMax: 2.0 },  // anchor — largest
  { yLo: 0.60, yHi: 0.80, frac: 0.24, rMin: 1.5, rMax: 1.9 },  // lower-mid
  { yLo: 0.80, yHi: 1.00, frac: 0.16, rMin: 1.3, rMax: 1.7 },  // bottom — taper back
]

const GOLDEN_ANGLE = 2.399963  // radians ≈ 137.5°
const MIN_DIST     = 5.5

function generateClusteredPlacements(n, bounds) {
  const tri   = buildDetectedTri(bounds || {})
  const treeH = tri.baseL.y - tri.apex.y
  const positions = []

  for (const band of BANDS) {
    const count = Math.max(1, Math.round(n * band.frac))
    // Starting angle offset per band so each band's spiral is rotated
    const angleBase = band.yLo * Math.PI * 7

    for (let i = 0; i < count; i++) {
      // Golden-angle spiral: spreads points without repetitive symmetry
      const spiralAngle = angleBase + i * GOLDEN_ANGLE
      // yF within this band — spread evenly with slight jitter
      const yF = band.yLo + (i / count) * (band.yHi - band.yLo) + (Math.random() - 0.5) * 0.06
      const yFc = Math.max(band.yLo + 0.01, Math.min(band.yHi - 0.01, yF))
      const cy  = tri.apex.y + yFc * treeH

      const { xMin, xMax } = xRangeAtY(cy, tri)
      const hw = (xMax - xMin) / 2

      // Spiral x: golden angle maps to a lateral offset fraction of half-width
      // cos produces natural left/right alternation; scale shrinks toward tree edges
      const lateralFrac = Math.cos(spiralAngle) * 0.72  // ±72% of half-width
      // Depth: sin maps ornament forward/back — front ornaments have lower depth value
      const depth = Math.round(15 + Math.abs(Math.sin(spiralAngle)) * 70)

      let safeX = tri.apex.x + hw * lateralFrac
      let safeY = cy

      // Try up to 12 positions, each with increasing jitter, to avoid overlap
      for (let attempt = 0; attempt < 12; attempt++) {
        const jitter  = attempt * 0.8
        const rawX    = tri.apex.x + hw * lateralFrac + (Math.random() - 0.5) * jitter
        const rawY    = cy + (Math.random() - 0.5) * treeH * 0.04

        const cy2 = Math.max(tri.apex.y + 0.5, Math.min(tri.baseL.y - 0.5, rawY))
        const { xMin: lo, xMax: hi } = xRangeAtY(cy2, tri)
        // Hard clamp: 2.0% inside silhouette on each side
        const clampedX = Math.max(lo + 2.0, Math.min(hi - 2.0, rawX))

        const tooClose = positions.some(p => {
          const dx = p.x - clampedX, dy = p.y - cy2
          return Math.sqrt(dx * dx + dy * dy) < MIN_DIST
        })

        safeX = clampedX
        safeY = cy2
        if (!tooClose) break
      }

      const r = +((band.rMin + Math.random() * (band.rMax - band.rMin)) * 0.85).toFixed(1)
      positions.push({ x: +safeX.toFixed(1), y: +safeY.toFixed(1), r, z: depth, yF: yFc })
    }
  }

  return positions
}

const OVERLAY_VARIETIES = 12

// Assign ornament metadata (color/shape/name) to positions with color-distribution
// enforcement: no single color may exceed 25% of total placements.
// Positions come from generateClusteredPlacements; meta comes from AI.
function assignOrnamentsToPositions(positions, meta) {
  if (!meta.length) return []
  const colorCount = {}
  const maxPerColor = Math.ceil(positions.length * 0.25)

  return positions.map((pos, i) => {
    // Try ornaments in round-robin order starting at this index, skip if over-quota
    for (let k = 0; k < meta.length; k++) {
      const candidate = meta[(i + k) % meta.length]
      const c = candidate.color || 'unknown'
      // Bottom band: prefer ball/drop for stability
      if (pos.yF > 0.70 && candidate.shape !== 'ball' && candidate.shape !== 'drop') continue
      if ((colorCount[c] || 0) >= maxPerColor) continue
      colorCount[c] = (colorCount[c] || 0) + 1
      return { ...candidate, ...pos }
    }
    // Fallback: ignore quota to avoid empty slots
    const fallback = meta[i % meta.length]
    const c = fallback.color || 'unknown'
    colorCount[c] = (colorCount[c] || 0) + 1
    return { ...fallback, ...pos }
  })
}

function buildOrnamentListPrompt(varieties = OVERLAY_VARIETIES) {
  return `You are a professional Christmas tree decorator. Analyze this specific tree photo carefully.

STEP 1 — Read the room. Look at: wall color, floor, furniture, lighting, tree type, any existing decor. Estimate the tree height from the photo. Choose a 3-color palette that fits THIS specific environment. Do not default to red and gold unless the photo clearly calls for it.

STEP 2 — Return ONLY a valid JSON object in this exact format. No markdown, no code fences, no explanation before or after:

{"palette":{"base":"#hexcolor","secondary":"#hexcolor","accent":"#hexcolor","description":"one sentence explaining why these colors fit this specific room"},"ornaments":[EXACTLY ${varieties} ITEMS],"topper":{"name":"Specific searchable topper product name","label":"Short label","type":"star|angel|bow|lantern|monogram","color":"#hexcolor","walmart":{"price":"$X–$XX"},"amazon":{"price":"$X–$XX"},"etsy":{"price":"$X–$XX"}}}

Each ornament must use ONLY the palette colors above:
{"name":"Specific searchable product name","label":"Short label","color":"#hexcolor","shape":"ball|drop|star","walmart":{"price":"$X–$XX"},"amazon":{"price":"$X–$XX"},"etsy":{"price":"$X–$XX"}}

Type distribution for ${varieties} ornaments:
- 50% balls, 20% drops, 20% stars, 10% wildcard shape
- Every single ornament color must be one of the three palette hex values — no exceptions
- Vary finish descriptions in names (matte, satin, glitter, mercury, velvet) but keep colors disciplined

For the topper: choose based on style direction — elegant/classic → star or angel, rustic → lantern or bow, whimsical → oversized bow or novelty, modern → geometric star. Topper color should complement the palette.`
}

const RETAILERS = [
  { key: 'walmart', label: 'Walmart', color: '#0071ce' },
  { key: 'amazon',  label: 'Amazon',  color: '#ff9900' },
  { key: 'etsy',    label: 'Etsy',    color: '#F1641E' },
]

function BallOrnament({ color }) {
  return (
    <svg width="100%" viewBox="0 0 60 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="0" width="8" height="14" rx="3.5" fill="#c9a84c"/>
      <circle cx="30" cy="46" r="26" fill={color}/>
      <ellipse cx="21" cy="35" rx="8" ry="6" fill="rgba(255,255,255,0.48)" transform="rotate(-20 21 35)"/>
    </svg>
  )
}

function DropOrnament({ color }) {
  return (
    <svg width="100%" viewBox="0 0 60 84" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="0" width="8" height="13" rx="3.5" fill="#c9a84c"/>
      <path d="M30,13 C18,13 7,27 7,45 C7,62 17,76 30,76 C43,76 53,62 53,45 C53,27 42,13 30,13 Z" fill={color}/>
      <ellipse cx="21" cy="32" rx="6" ry="10" fill="rgba(255,255,255,0.44)" transform="rotate(-15 21 32)"/>
    </svg>
  )
}

function StarOrnament({ color }) {
  return (
    <svg width="100%" viewBox="0 0 60 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="0" width="8" height="14" rx="3.5" fill="#c9a84c"/>
      {/* 5-pointed star, center (30,48), outer R=20, inner r=8 */}
      <polygon
        points="30,28 35,42 49,42 38,51 42,64 30,56 18,64 22,51 11,42 25,42"
        fill={color}
      />
      <ellipse cx="23" cy="37" rx="4" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-30 23 37)"/>
    </svg>
  )
}

function SnowflakeOrnament({ color }) {
  return (
    <svg width="100%" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke={color} strokeWidth="4.5" strokeLinecap="round">
        {/* 3 axes = 6 arms */}
        <line x1="30" y1="6"  x2="30" y2="54"/>
        <line x1="7"  y1="19" x2="53" y2="41"/>
        <line x1="53" y1="19" x2="7"  y2="41"/>
        {/* branch marks on vertical arm */}
        <line x1="23" y1="17" x2="37" y2="17"/>
        <line x1="23" y1="43" x2="37" y2="43"/>
        {/* branch marks on 60° arm */}
        <line x1="14" y1="22" x2="22" y2="14"/>
        <line x1="38" y1="46" x2="46" y2="38"/>
        {/* branch marks on 120° arm */}
        <line x1="46" y1="22" x2="38" y2="14"/>
        <line x1="22" y1="46" x2="14" y2="38"/>
      </g>
      <circle cx="30" cy="30" r="4" fill={color}/>
    </svg>
  )
}

function PineconeOrnament({ color }) {
  const brown = color || '#7a4a22'
  return (
    <svg width="100%" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="0" width="8" height="12" rx="3" fill="#c9a84c"/>
      <ellipse cx="30" cy="48" rx="18" ry="28" fill={brown}/>
      {/* scale arcs from bottom to top */}
      <path d="M13,62 Q30,54 47,62" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M14,52 Q30,44 46,52" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M15,42 Q30,34 45,42" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M17,32 Q30,24 43,32" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M20,22 Q30,15 40,22" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none"/>
      <ellipse cx="21" cy="36" rx="5" ry="4" fill="rgba(255,255,255,0.12)" transform="rotate(-10 21 36)"/>
    </svg>
  )
}


function OrnamentShape({ shape, color }) {
  switch (shape) {
    case 'drop':      return <DropOrnament      color={color} />
    case 'star':      return <StarOrnament      color={color} />
    case 'snowflake': return <SnowflakeOrnament color={color} />
    case 'pinecone':  return <PineconeOrnament  color={color} />
    default:          return <BallOrnament      color={color} />
  }
}

function OrnamentTypeIcon({ shape, size = 22 }) {
  const s = String(shape || 'ball').toLowerCase()
  const stroke = '#c9a84c'
  const sw = 1.5
  if (s === 'drop') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="12" y="1" width="4" height="5" rx="2" fill={stroke}/>
      <path d="M14 6 C8 6 5 13 5 18 a9 9 0 0 0 18 0 C23 13 20 6 14 6Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  )
  if (s === 'star') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <polygon points="14,3 17,10 25,10 19,15 21,23 14,18 7,23 9,15 3,10 11,10" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  )
  if (s === 'snowflake') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <g stroke={stroke} strokeWidth={sw} strokeLinecap="round">
        <line x1="14" y1="3"  x2="14" y2="25"/>
        <line x1="4"  y1="9"  x2="24" y2="19"/>
        <line x1="24" y1="9"  x2="4"  y2="19"/>
      </g>
      <circle cx="14" cy="14" r="2" fill={stroke}/>
    </svg>
  )
  if (s === 'pinecone') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="12" y="1" width="4" height="5" rx="2" fill={stroke}/>
      <ellipse cx="14" cy="19" rx="7" ry="9" stroke={stroke} strokeWidth={sw}/>
      <line x1="7" y1="15" x2="21" y2="15" stroke={stroke} strokeWidth="1" opacity="0.5"/>
      <line x1="8" y1="19" x2="20" y2="19" stroke={stroke} strokeWidth="1" opacity="0.5"/>
      <line x1="9" y1="23" x2="19" y2="23" stroke={stroke} strokeWidth="1" opacity="0.5"/>
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="12" y="1" width="4" height="5" rx="2" fill={stroke}/>
      <circle cx="14" cy="20" r="9" stroke={stroke} strokeWidth={sw}/>
    </svg>
  )
}

function TopperSVG({ type, color }) {
  const c = color || '#c9a84c'
  if (type === 'angel') {
    return (
      <svg viewBox="0 0 32 40" width="32" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="6" r="5" fill="#f8f4ec"/>
        <path d="M8,14 Q16,10 24,14 L22,30 Q16,34 10,30 Z" fill="#f8f4ec"/>
        <path d="M4,12 Q8,8 12,14" stroke="#f8f4ec" strokeWidth="2" fill="none"/>
        <path d="M28,12 Q24,8 20,14" stroke="#f8f4ec" strokeWidth="2" fill="none"/>
        <ellipse cx="16" cy="4" rx="7" ry="3" stroke={c} strokeWidth="1.5" fill="none"/>
      </svg>
    )
  }
  if (type === 'bow') {
    return (
      <svg viewBox="0 0 32 28" width="32" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="10" cy="14" rx="9" ry="6" fill={c} opacity="0.9"/>
        <ellipse cx="22" cy="14" rx="9" ry="6" fill={c} opacity="0.9"/>
        <circle cx="16" cy="14" r="4" fill={c}/>
        <ellipse cx="10" cy="14" rx="9" ry="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
        <ellipse cx="22" cy="14" rx="9" ry="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
      </svg>
    )
  }
  if (type === 'lantern') {
    return (
      <svg viewBox="0 0 28 36" width="28" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="0" width="8" height="5" rx="2" fill={c}/>
        <rect x="6" y="5" width="16" height="3" rx="1" fill={c}/>
        <rect x="7" y="8" width="14" height="18" rx="3" fill="none" stroke={c} strokeWidth="1.5"/>
        <line x1="14" y1="8" x2="14" y2="26" stroke={c} strokeWidth="1" opacity="0.4"/>
        <line x1="7" y1="17" x2="21" y2="17" stroke={c} strokeWidth="1" opacity="0.4"/>
        <ellipse cx="14" cy="17" rx="4" ry="4" fill={c} opacity="0.3"/>
        <rect x="6" y="26" width="16" height="3" rx="1" fill={c}/>
        <line x1="11" y1="29" x2="11" y2="34" stroke={c} strokeWidth="1.5"/>
        <line x1="17" y1="29" x2="17" y2="34" stroke={c} strokeWidth="1.5"/>
        <line x1="9" y1="34" x2="19" y2="34" stroke={c} strokeWidth="1.5"/>
      </svg>
    )
  }
  // Default: star
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="16,2 19.5,12 30,12 21.5,18.5 24.5,29 16,22.5 7.5,29 10.5,18.5 2,12 12.5,12"
        fill={c}
      />
      <polygon
        points="16,2 19.5,12 30,12 21.5,18.5 24.5,29 16,22.5 7.5,29 10.5,18.5 2,12 12.5,12"
        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"
      />
    </svg>
  )
}

function renderTopperLayer(topper, bounds) {
  if (!topper) return null
  const tri = buildDetectedTri(bounds || {})
  const x = tri.apex.x
  const y = Math.max(0, tri.apex.y - 1.5)
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 200,
      filter: 'drop-shadow(0 0 10px rgba(201,168,76,0.95))',
      pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12,2 L14.9,9.5 L22.5,9.5 L16.6,14.5 L18.9,22 L12,17.5 L5.1,22 L7.4,14.5 L1.5,9.5 L9.1,9.5 Z" fill="#c9a84c" />
      </svg>
    </div>
  )
}

const LIGHT_PULSE_CSS = `
@keyframes lightPulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1.0; }
}
`

function renderLightLayer(strands) {
  if (!strands || strands.length === 0) return null
  return (
    <>
      <style>{LIGHT_PULSE_CSS}</style>
      {strands.map(strand => (
        <div key={strand.id} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
          {/* Wire removed — straight line conflicts with draped bulb positions */}
          {/* Bulbs */}
          {strand.bulbs.map((b, bi) => (
            <div key={bi} style={{ position: 'absolute', top: `${b.y}%`, left: `${b.x}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
              {/* Cap */}
              <div style={{
                width: 2, height: 3,
                background: '#444',
                margin: '0 auto',
              }} />
              {/* Bulb */}
              <div style={{
                width:        5,
                height:       6,
                borderRadius: '40% 40% 50% 50%',
                background:   b.color,
                opacity:      0.75,
                boxShadow:    `0 0 3px 1px ${b.glowColor}, 0 0 6px 2px ${b.glowColor.slice(0, 7)}50`,
                animation:    `lightPulse 1.8s ease-in-out ${b.delay.toFixed(0)}ms infinite`,
              }} />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function renderOrnamentLayer(ornaments) {
  return ornaments.map((o, i) => {
    // Every 4th ornament skipped — intentional human-feeling gaps
    if (i % 4 === 3) return null

    const z     = o.z ?? 55
    const yF    = o.yF ?? 0.5
    const shape = o.shape || 'ball'

    // Zone-based depth scaling: A=60%, B=85%, C=100%
    const zoneScale = yF < 0.35 ? 0.60 : yF < 0.65 ? 0.85 : 1.00
    const size = o.r * 2 * zoneScale

    // Depth layer opacity + z-index only (size now from zone scale)
    let op, zi
    if      (z < 34) { op = 0.60; zi = 10 + Math.round(z * 0.7) }
    else if (z < 67) { op = 0.80; zi = 40 + Math.round((z - 34) * 0.9) }
    else             { op = 1.00; zi = 70 + Math.round((z - 67) * 0.9) }

    // White stroke via chained drop-shadow + main shadow; back layer darkened
    const strokeFilter = 'drop-shadow(0 0 1.5px rgba(255,255,255,0.4)) drop-shadow(0px 3px 6px rgba(0,0,0,0.5))'
    const svgFilter    = z < 34 ? `brightness(0.65) ${strokeFilter}` : strokeFilter

    const isBallOrDrop = shape === 'ball' || shape === 'drop'
    const glowRadius   = shape === 'drop' ? '40% 40% 55% 55%' : '50%'

    return (
      <div key={i} className="ornament-pin" title={o.label} style={{
        left: `${o.x}%`, top: `${o.y}%`,
        width: `${size}%`,
        opacity: op, zIndex: zi,
      }}>
        {/* Radial glow — behind SVG, color matches ornament */}
        <div style={{
          position: 'absolute', inset: '-20%',
          borderRadius: glowRadius,
          background: o.color, opacity: 0.25,
          filter: 'blur(6px)', pointerEvents: 'none',
        }} />

        {/* Ornament SVG with stroke + shadow filter */}
        <div style={{ position: 'relative', filter: svgFilter }}>
          <OrnamentShape shape={shape} color={o.color} />
        </div>

        {/* Specular highlight — ball and drop only */}
        {isBallOrDrop && (
          <div style={{
            position: 'absolute',
            top:    shape === 'drop' ? '28%' : '20%',
            left:   '22%',
            width:  shape === 'drop' ? '22%' : '30%',
            height: shape === 'drop' ? '30%' : '22%',
            background: 'white', opacity: 0.25,
            borderRadius: '50%',
            transform: 'rotate(-20deg)',
            filter: 'blur(2px)', pointerEvents: 'none',
          }} />
        )}
      </div>
    )
  })
}

function StyledOverlayView({ image, ornaments, topper, bounds, lightStrands }) {
  return (
    <div className="styled-overlay-view">
      <img src={image.preview} alt="Your tree" className="ba-img" draggable={false} />
      {renderLightLayer(lightStrands)}
      {renderOrnamentLayer(ornaments)}
      {renderTopperLayer(topper, bounds)}
    </div>
  )
}

const saveDecoration = (image, ornaments, analysis, varieties, palette, topper, lightStrands, hasLights) => {
  const decoration = {
    id: Date.now(),
    image: image.preview,
    ornaments,
    varieties:    varieties    || [],
    palette:      palette      || null,
    topper:       topper       || null,
    lightStrands: lightStrands || [],
    hasLights:    hasLights    || false,
    analysis,
    timestamp: new Date().toISOString(),
  }
  const saved = JSON.parse(localStorage.getItem('decorations') || '[]')
  saved.unshift(decoration)
  localStorage.setItem('decorations', JSON.stringify(saved.slice(0, 5)))
}

const loadDecorations = () => {
  try { return JSON.parse(localStorage.getItem('decorations') || '[]') } catch { return [] }
}

function saveToMyOrnaments(o) {
  const ornament = {
    id:        `orn-${Date.now()}`,
    name:      o.name,
    color:     o.color,
    shape:     o.shape,
    type:      o.type || null,
    retailers: {
      walmart: { price: o.walmart?.price || '' },
      amazon:  { price: o.amazon?.price  || '' },
      etsy:    { price: o.etsy?.price    || '' },
    },
    source:    'saved',
    rating:    0,
    tags:      [],
    notes:     '',
    dateSaved: Date.now(),
  }
  try {
    const existing = JSON.parse(localStorage.getItem('myOrnaments') || '[]')
    const deduped  = [ornament, ...existing.filter(e => e.name !== ornament.name)]
    localStorage.setItem('myOrnaments', JSON.stringify(deduped))
  } catch { /* ignore storage errors */ }
}

function getOrnamentShape(name = '') {
  const n = name.toLowerCase()
  if (n.includes('snowflake'))                           return 'snowflake'
  if (n.includes('star'))                                return 'star'
  if (n.includes('pinecone') || n.includes('pine cone')) return 'pinecone'
  if (n.includes('drop') || n.includes('teardrop'))      return 'drop'
  return 'ball'
}

function buildQuery(name, shape) {
  // o.name is already a rich product description from the AI prompt
  // Add shape only if not already mentioned in the name
  const parts = [name, shape && !name.toLowerCase().includes(shape) ? shape : '']
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() + ' christmas ornament'
}

function getSearchUrl(retailer, name, shape) {
  if (!name) return null
  const q = encodeURIComponent(buildQuery(name, shape))
  if (retailer === 'walmart') return `https://www.walmart.com/search?q=${q}`
  if (retailer === 'amazon')  return `https://www.amazon.com/s?k=${q}`
if (retailer === 'etsy')    return `https://www.etsy.com/search?q=${q}`
  return null
}

export default function TreeAdvisor() {
  const [image,          setImage]          = useState(null)
  const [result,         setResult]         = useState('')
  const [error,          setError]          = useState('')
  const [dragging,       setDragging]       = useState(false)
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [ornaments,      setOrnaments]      = useState([])
  const [varieties,      setVarieties]      = useState([])
  const [palette,        setPalette]        = useState(null)
  const [topper,         setTopper]         = useState(null)
  const [lightStrands,   setLightStrands]   = useState([])
  const [hasLights,      setHasLights]      = useState(false)
  const [shareLoading,    setShareLoading]    = useState(false)
  const [recentTrees,     setRecentTrees]     = useState(() => loadDecorations())
  const [savedIds,        setSavedIds]        = useState(new Set())
  const fileInputRef   = useRef(null)
  const overlayRef     = useRef(null)
  const shopRef        = useRef(null)
  const treeBoundsRef  = useRef({})   // stores AI-detected bounding box for placement

  // Scroll helper — offsets for sticky header height so element isn't hidden behind it
  const smoothScrollTo = useCallback((ref, delay = 120) => {
    setTimeout(() => {
      if (!ref.current) return
      const top = ref.current.getBoundingClientRect().top + window.scrollY - 88
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }, delay)
  }, [])

  // Bracket-depth scanner — finds the outermost instance of opener/closer in text.
  function scanBalanced(text, opener, closer) {
    let i = 0
    while (i < text.length) {
      const start = text.indexOf(opener, i)
      if (start === -1) break
      let depth = 0, j = start, inString = false, escape = false
      while (j < text.length) {
        const ch = text[j]
        if (escape)           { escape = false }
        else if (ch === '\\') { escape = true }
        else if (ch === '"')  { inString = !inString }
        else if (!inString) {
          if      (ch === opener) depth++
          else if (ch === closer) { depth--; if (depth === 0) break }
        }
        j++
      }
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, j + 1))
          return parsed
        } catch {}
      }
      i = start + 1
    }
    return null
  }

  // Extract {palette, ornaments} from new single-object response format.
  // Falls back to bare [...] array for backward compatibility.
  function extractOrnamentResponse(text) {
    console.log('[overlay] extractOrnamentResponse: scanning', text.length, 'chars')

    // Try outermost {...} object first
    const obj = scanBalanced(text, '{', '}')
    if (obj && Array.isArray(obj.ornaments) && obj.ornaments.length > 0) {
      console.log('[overlay] found object with palette:', obj.palette, 'and', obj.ornaments.length, 'ornaments')
      console.log('[overlay] topper:', obj.topper || null)
      return { palette: obj.palette || null, ornaments: obj.ornaments, topper: obj.topper || null }
    }

    // Fallback: bare [...] array (old format)
    const arr = scanBalanced(text, '[', ']')
    if (Array.isArray(arr) && arr.length > 0) {
      console.log('[overlay] fallback: found bare array of', arr.length, 'items')
      return { palette: null, ornaments: arr, topper: null }
    }

    throw new Error('No valid ornament response found')
  }

  // Scroll to reveal section after modal dismisses
  useEffect(() => {
    if (!overlayLoading && result) {
      const t = setTimeout(() => smoothScrollTo(overlayRef, 120), 100)
      return () => clearTimeout(t)
    }
  }, [overlayLoading])


  const processFile = (file) => {
    if (!file?.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, or WebP).')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setImage({ preview: reader.result, base64: reader.result.split(',')[1], mediaType: file.type })
      setResult('')
      setError('')
      setOrnaments([]); setVarieties([]); setPalette(null); setTopper(null); setLightStrands([]); setHasLights(false)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleAnalyze = async () => {
    if (!image) return
    setOverlayLoading(true)   // show modal immediately — everything happens behind it
    setResult('')
    setError('')
    setOrnaments([]); setVarieties([]); setPalette(null); setTopper(null); setLightStrands([]); setHasLights(false)
    treeBoundsRef.current = {}

    let analysisText = ''
    let rawOrnaments = ''

    try {
      // Run all three calls in parallel — detection and analysis are independent
      await Promise.all([

        // A — Tree bounding box detection (silent failure)
        (async () => {
          try {
            let detectRaw = ''
            await streamChat({
              messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                { type: 'text', text: DETECT_PROMPT },
              ]}],
              maxTokens: 200,
              onText: (t) => { detectRaw += t },
            })
            const s = detectRaw.indexOf('{'), e = detectRaw.lastIndexOf('}')
            if (s !== -1 && e !== -1) treeBoundsRef.current = JSON.parse(detectRaw.slice(s, e + 1))
          } catch { /* bounds failure is silent — placement uses defaults */ }
        })(),

        // B — Styling analysis text (failure surfaces as user-visible error)
        streamChat({
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: getAnalysisPrompt() },
          ]}],
          maxTokens: 1000,
          onText: (t) => { analysisText += t },
        }),

        // C — Ornament generation (silent failure, retry with 6)
        (async () => {
          try {
            await streamChat({
              messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                { type: 'text', text: buildOrnamentListPrompt(OVERLAY_VARIETIES) },
              ]}],
              maxTokens: 2500,
              onText: (t) => { rawOrnaments += t },
            })
          } catch {
            rawOrnaments = ''
            try {
              await streamChat({
                messages: [{ role: 'user', content: [
                  { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                  { type: 'text', text: buildOrnamentListPrompt(6) },
                ]}],
                maxTokens: 2500,
                onText: (t) => { rawOrnaments += t },
              })
            } catch { /* ornament failure is silent */ }
          }
        })(),
      ])

      // Analysis text is the only required result
      setResult(analysisText)

      // Parse ornaments + place overlay — both silent on failure
      if (rawOrnaments) {
        try {
          const { palette: pal, ornaments: meta, topper: top } = extractOrnamentResponse(rawOrnaments)
          setPalette(pal)
          setVarieties(meta.slice(0, 12))
          setTopper(top || null)

          const heightFt = treeBoundsRef.current?.treeHeightFt
          const OVERLAY_COUNT = !heightFt ? 70 : heightFt < 4 ? 40 : heightFt < 6 ? 60 : heightFt < 8 ? 80 : 100
          const positions = generateClusteredPlacements(OVERLAY_COUNT, treeBoundsRef.current)
          const placed = assignOrnamentsToPositions(positions, meta)
          setOrnaments(placed)

          // Generate light strands unless the tree already has lights
          const treeHasLights = !!treeBoundsRef.current?.hasLights
          setHasLights(treeHasLights)
          const strands = treeHasLights ? [] : generateLightStrands(treeBoundsRef.current, pal)
          setLightStrands(strands)

          if (image && analysisText) {
            saveDecoration(image, placed, analysisText, meta.slice(0, 12), pal, top, strands, treeHasLights)
            setRecentTrees(loadDecorations())
          }
        } catch (err) {
          console.warn('[overlay] ornament parse/placement failed (silent):', err.message)
        }
      }
    } catch (err) {
      // Only surfaces if the analysis (Branch B) threw — ornament failures are silent above
      setResult(analysisText) // show whatever text arrived before the error
      const msg = err.message || ''
      const isNetworkError = /load failed|failed to fetch|network/i.test(msg)
      setError(isNetworkError
        ? 'Connection error. Please check your internet and try again.'
        : 'Something went wrong with the analysis. Please try again.')
    } finally {
      setOverlayLoading(false)
    }
  }

  const handleDeleteRecent = (id) => {
    const updated = recentTrees.filter(d => d.id !== id)
    setRecentTrees(updated)
    localStorage.setItem('decorations', JSON.stringify(updated))
  }

  const handleRetry = async () => {
    if (!image) return
    // Build a "different palette" instruction using the previous palette colors
    const prevColors = palette
      ? `Avoid these previously suggested colors: ${[palette.base, palette.secondary, palette.accent].filter(Boolean).join(', ')}.`
      : ''
    const differentLook = `\n\nIMPORTANT: The user wants a completely different style direction. Choose a different color palette and ornament style than before. ${prevColors} Suggest something that feels like a fresh, unexpected alternative.`

    setOverlayLoading(true)
    setResult('')
    setError('')
    setOrnaments([]); setVarieties([]); setPalette(null); setTopper(null); setLightStrands([]); setHasLights(false)
    treeBoundsRef.current = {}

    let analysisText = ''
    let rawOrnaments = ''

    try {
      await Promise.all([
        // A — bounds detection (silent)
        (async () => {
          try {
            let detectRaw = ''
            await streamChat({
              messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                { type: 'text', text: DETECT_PROMPT },
              ]}],
              maxTokens: 200,
              onText: (t) => { detectRaw += t },
            })
            const s = detectRaw.indexOf('{'), e = detectRaw.lastIndexOf('}')
            if (s !== -1 && e !== -1) treeBoundsRef.current = JSON.parse(detectRaw.slice(s, e + 1))
          } catch { }
        })(),

        // B — analysis with "different look" instruction
        streamChat({
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: getAnalysisPrompt() + differentLook },
          ]}],
          maxTokens: 1000,
          onText: (t) => { analysisText += t },
        }),

        // C — ornament generation with different palette instruction
        (async () => {
          try {
            await streamChat({
              messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                { type: 'text', text: buildOrnamentListPrompt(OVERLAY_VARIETIES) + (prevColors ? `\n\nIMPORTANT: ${prevColors} Use a completely different palette.` : '') },
              ]}],
              maxTokens: 2500,
              onText: (t) => { rawOrnaments += t },
            })
          } catch {
            rawOrnaments = ''
            try {
              await streamChat({
                messages: [{ role: 'user', content: [
                  { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                  { type: 'text', text: buildOrnamentListPrompt(6) },
                ]}],
                maxTokens: 2500,
                onText: (t) => { rawOrnaments += t },
              })
            } catch { }
          }
        })(),
      ])

      setResult(analysisText)

      if (rawOrnaments) {
        try {
          const { palette: pal, ornaments: meta, topper: top } = extractOrnamentResponse(rawOrnaments)
          setPalette(pal)
          setVarieties(meta.slice(0, 12))
          setTopper(top || null)
          const heightFt = treeBoundsRef.current?.treeHeightFt
          const OVERLAY_COUNT = !heightFt ? 70 : heightFt < 4 ? 40 : heightFt < 6 ? 60 : heightFt < 8 ? 80 : 100
          const positions = generateClusteredPlacements(OVERLAY_COUNT, treeBoundsRef.current)
          const placed = assignOrnamentsToPositions(positions, meta)
          setOrnaments(placed)
          const treeHasLights = !!treeBoundsRef.current?.hasLights
          setHasLights(treeHasLights)
          const strands = treeHasLights ? [] : generateLightStrands(treeBoundsRef.current, pal)
          setLightStrands(strands)
          if (image && analysisText) {
            saveDecoration(image, placed, analysisText, meta.slice(0, 12), pal, top, strands, treeHasLights)
            setRecentTrees(loadDecorations())
          }
        } catch (err) {
          console.warn('[retry] ornament parse failed (silent):', err.message)
        }
      }
    } catch (err) {
      setResult(analysisText)
      const msg = err.message || ''
      const isNetworkError = /load failed|failed to fetch|network/i.test(msg)
      setError(isNetworkError
        ? 'Connection error. Please check your internet and try again.'
        : 'Something went wrong. Please try again.')
    } finally {
      setOverlayLoading(false)
    }
  }

  const handleViewAgain = (decoration) => {
    setImage({ preview: decoration.image, base64: null, mediaType: 'image/jpeg' })
    setResult(decoration.analysis)
    setError('')
    setOrnaments(decoration.ornaments || [])
    setVarieties(decoration.varieties || [])
    setPalette(decoration.palette || null)
    setTopper(decoration.topper || null)
    setLightStrands(decoration.lightStrands || [])
    setHasLights(decoration.hasLights || false)
    smoothScrollTo(overlayRef, 80)
  }

  const handleShare = useCallback(async () => {
    if (!image || !ornaments.length || shareLoading) return
    setShareLoading(true)

    // Inline SVG markup for each ornament shape (mirrors the React components)
    const ornamentSVG = (shape, color) => {
      const g = '#c9a84c'
      switch (shape) {
        case 'drop':
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 84"><rect x="26" y="0" width="8" height="13" rx="3.5" fill="${g}"/><path d="M30,13 C18,13 7,27 7,45 C7,62 17,76 30,76 C43,76 53,62 53,45 C53,27 42,13 30,13 Z" fill="${color}"/><ellipse cx="21" cy="32" rx="6" ry="10" fill="rgba(255,255,255,0.44)" transform="rotate(-15 21 32)"/></svg>`
        case 'star':
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 74"><rect x="26" y="0" width="8" height="14" rx="3.5" fill="${g}"/><polygon points="30,28 35,42 49,42 38,51 42,64 30,56 18,64 22,51 11,42 25,42" fill="${color}"/><ellipse cx="23" cy="37" rx="4" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-30 23 37)"/></svg>`
        case 'snowflake':
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><g stroke="${color}" stroke-width="4.5" stroke-linecap="round"><line x1="30" y1="6" x2="30" y2="54"/><line x1="7" y1="19" x2="53" y2="41"/><line x1="53" y1="19" x2="7" y2="41"/><line x1="23" y1="17" x2="37" y2="17"/><line x1="23" y1="43" x2="37" y2="43"/><line x1="14" y1="22" x2="22" y2="14"/><line x1="38" y1="46" x2="46" y2="38"/><line x1="46" y1="22" x2="38" y2="14"/><line x1="22" y1="46" x2="14" y2="38"/></g><circle cx="30" cy="30" r="4" fill="${color}"/></svg>`
        case 'pinecone':
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"><rect x="26" y="0" width="8" height="12" rx="3" fill="${g}"/><ellipse cx="30" cy="48" rx="18" ry="28" fill="${color}"/><path d="M13,62 Q30,54 47,62" stroke="rgba(255,255,255,0.18)" stroke-width="2" fill="none"/><path d="M14,52 Q30,44 46,52" stroke="rgba(255,255,255,0.18)" stroke-width="2" fill="none"/><path d="M15,42 Q30,34 45,42" stroke="rgba(255,255,255,0.18)" stroke-width="2" fill="none"/><path d="M17,32 Q30,24 43,32" stroke="rgba(255,255,255,0.18)" stroke-width="2" fill="none"/><path d="M20,22 Q30,15 40,22" stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none"/></svg>`
        default: // ball
          return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 74"><rect x="26" y="0" width="8" height="14" rx="3.5" fill="${g}"/><circle cx="30" cy="46" r="26" fill="${color}"/><ellipse cx="21" cy="35" rx="8" ry="6" fill="rgba(255,255,255,0.48)" transform="rotate(-20 21 35)"/></svg>`
      }
    }

    // height/width ratio of each SVG viewBox
    const svgAspect = { ball: 74/60, drop: 84/60, star: 74/60, snowflake: 1, pinecone: 80/60 }

    try {
      // Draw the tree photo onto a canvas at full resolution
      const treeImg = new Image()
      treeImg.src = image.preview
      await new Promise(resolve => { treeImg.onload = resolve })
      const W = treeImg.naturalWidth
      const H = treeImg.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      ctx.drawImage(treeImg, 0, 0)

      // Sort back→front so front-layer ornaments render on top
      const sorted = [...ornaments].sort((a, b) => (a.z ?? 55) - (b.z ?? 55))

      for (const o of sorted) {
        const z = o.z ?? 55
        const yPerspective = 0.74 + (o.y / 100) * 0.48
        let depthScale, opacity
        if      (z < 34) { depthScale = 0.70; opacity = 0.50 }
        else if (z < 67) { depthScale = 1.00; opacity = 0.75 }
        else             { depthScale = 1.10; opacity = 1.00 }

        const ow = (o.r * 2 * yPerspective * depthScale / 100) * W
        const oh = ow * (svgAspect[o.shape] ?? svgAspect.ball)
        const ox = (o.x / 100) * W - ow / 2
        const oy = (o.y / 100) * H - oh / 2

        const svg  = ornamentSVG(o.shape, o.color)
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url  = URL.createObjectURL(blob)
        const oi   = new Image()
        await new Promise((res, rej) => { oi.onload = res; oi.onerror = rej; oi.src = url })
        ctx.globalAlpha = opacity
        ctx.drawImage(oi, ox, oy, ow, oh)
        ctx.globalAlpha = 1
        URL.revokeObjectURL(url)
      }

      const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      const file     = new File([jpegBlob], 'my-decorated-tree.jpg', { type: 'image/jpeg' })
      const shareData = { files: [file], title: 'My Decorated Christmas Tree' }

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('Share image failed:', err)
    } finally {
      setShareLoading(false)
    }
  }, [image, ornaments, shareLoading])

  const handleShareLink = useCallback(async () => {
    const payload = {
      text: 'I just styled my Christmas tree with Deck My Tree ✨ Check it out:',
      url:  'https://deck-my-tree.vercel.app',
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
      } else {
        await navigator.clipboard.writeText(`${payload.text} ${payload.url}`)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('Share link failed:', err)
    }
  }, [])

  return (
    <div className="tab-content">
      {/* Upload section — hidden once results are ready or loading */}
      {!result && !overlayLoading && (
        <div className="section-header">
          <h2>🌲 Tree Advisor</h2>
          <p>Upload a photo of your Christmas tree and your stylist will craft a personalized decoration plan — then show you exactly how it could look, fully decorated.</p>
        </div>
      )}

      {!result && !overlayLoading && (
        <>
          <div
            className={`upload-zone${dragging ? ' drag-over' : ''}${image ? ' has-image' : ''}`}
            onClick={() => !image && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {image ? (
              <img src={image.preview} alt="Your tree" className="tree-preview" />
            ) : (
              <div className="upload-prompt">
                <span className="upload-icon">📸</span>
                <p>Drop your tree photo here or <span className="upload-link">click to browse</span></p>
                <span className="upload-hint">JPG · PNG · WebP</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => processFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>

          {image && (
            <div className="action-row">
              <button className="btn-secondary" onClick={() => { setImage(null); setResult(''); setOrnaments([]); setVarieties([]); setPalette(null); setTopper(null); setLightStrands([]); setHasLights(false) }}>
                Remove Photo
              </button>
              <button className="btn-analyze" onClick={handleAnalyze} disabled={overlayLoading}>
                ✨ Analyze My Tree
              </button>
            </div>
          )}

          {/* Recent Trees */}
          {recentTrees.length > 0 && (
            <div className="recent-trees-section">
              <h3 className="recent-trees-title">✦ My Recent Trees</h3>
              <div className="recent-trees-grid">
                {recentTrees.map((d) => (
                  <div key={d.id} className="recent-tree-card">
                    <button
                      className="btn-delete-recent"
                      onClick={() => handleDeleteRecent(d.id)}
                      title="Remove"
                      aria-label="Remove this tree"
                    >✕</button>
                    <div className="recent-tree-thumb-wrap">
                      <img src={d.image} alt="Decorated tree" className="recent-tree-thumb" />
                      <div className="recent-tree-ornament-dots">
                        {d.ornaments.slice(0, 5).map((o, i) => (
                          <span key={i} className="recent-dot" style={{ background: o.color }} />
                        ))}
                      </div>
                    </div>
                    <div className="recent-tree-meta">
                      <span className="recent-tree-date">
                        {new Date(d.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="recent-tree-count">{d.ornaments.length} ornaments</span>
                    </div>
                    <button className="btn-view-again" onClick={() => handleViewAgain(d)}>
                      View Again
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {error && <div className="error-card">⚠️ {error}</div>}

      {/* Single modal for the entire loading phase */}
      <CurationModal visible={overlayLoading} />

      {/* ── Complete reveal — everything at once after modal dismisses ── */}
      {result && !overlayLoading && (
        <div className="overlay-section reveal-fade" ref={overlayRef}>

          {/* 1 — Decorated tree image (no header above it) */}
          {ornaments.length > 0 && image && (
            <StyledOverlayView image={image} ornaments={ornaments} topper={topper} bounds={treeBoundsRef.current} lightStrands={lightStrands} />
          )}

          {/* 2 — Style direction header + palette reasoning card */}
          <div className="overlay-label-row" style={{ marginTop: 20 }}>
            <span className="overlay-eyebrow">✦ YOUR STYLE DIRECTION</span>
            {image?.base64 ? (
              <button className="btn-secondary btn-sm" onClick={handleRetry}>
                Try a New Look
              </button>
            ) : (
              <button className="btn-secondary btn-sm" onClick={() => {
                setResult(''); setOrnaments([]); setVarieties([]); setPalette(null); setTopper(null); setLightStrands([]); setHasLights(false)
                setImage(null); setError('')
              }}>
                New Tree
              </button>
            )}
          </div>

          {palette?.description && (
            <div className="palette-card">
              <span className="palette-card-label">YOUR STYLIST SAYS</span>
              <p className="palette-description">
                <span className="palette-flourish">✦</span> {palette.description}
                {hasLights && ' Your tree\'s existing lights are already perfect for this palette.'}
              </p>
            </div>
          )}

          {/* Share row */}
          <div className="share-row" style={{ marginTop: 12 }}>
            {ornaments.length > 0 && (
              <button className="btn-share" onClick={handleShare} disabled={shareLoading}>
                {shareLoading ? <><span className="spin">✦</span> Preparing…</> : '✦ Share Image'}
              </button>
            )}
            <button className="btn-share" onClick={handleShareLink}>Share Link</button>
          </div>

          {/* 3 — Topper card (first) */}
          {topper && (
            <div className="ornament-shop-section" ref={shopRef}>
              <h3 className="shop-section-header">✦ Top It Off</h3>
              <div className="ornament-shop-card topper-card">
                <div className="shop-card-top">
                  <div className="shop-ornament-preview topper-preview">
                    <TopperSVG type={topper.type || 'star'} color={topper.color || '#c9a84c'} />
                  </div>
                  <div className="shop-card-info">
                    <span className="shop-card-num topper-tag">TOPPER</span>
                    <h4 className="shop-card-name">{topper.label}</h4>
                    <p className="shop-card-fullname">{topper.name}</p>
                  </div>
                </div>
                <div className="shop-card-retailers">
                  {RETAILERS.map(r => {
                    const url = getSearchUrl(r.key, topper.name, topper.type)
                    if (!url) return null
                    return (
                      <a key={r.key} href={url} target="_blank" rel="noopener noreferrer" className="btn-retailer">
                        <div className="retailer-top">
                          <span className="retailer-dot" style={{ background: r.color }} />
                          <span className="retailer-name" style={{ color: r.color }}>{r.label}</span>
                          {topper[r.key]?.price && <span className="retailer-price">{topper[r.key].price}</span>}
                        </div>
                        <span className="deck-it-cta">Deck it. Buy it.</span>
                      </a>
                    )
                  })}
                </div>
                <button
                  className={`btn-save-ornament${savedIds.has('topper') ? ' saved' : ''}`}
                  onClick={() => {
                    saveToMyOrnaments({ name: topper.name, color: topper.color, shape: topper.type, type: 'Topper', walmart: topper.walmart, amazon: topper.amazon, etsy: topper.etsy, source: 'saved' })
                    setSavedIds(prev => new Set([...prev, 'topper']))
                  }}
                  disabled={savedIds.has('topper')}
                >
                  {savedIds.has('topper') ? '✓ Saved to My Ornaments' : '+ Save to My Ornaments'}
                </button>
              </div>
            </div>
          )}

          {/* 4 — Ornament shopping cards (12 unique varieties only) */}
          {varieties.length > 0 && (
            <div className="ornament-shop-section" ref={topper ? undefined : shopRef}>
              <h3 className="shop-section-header">✦ Sleigh It — Shop the Look</h3>
              <div className="ornament-shop-list">
                {varieties.map((o, i) => (
                  <div key={i} className="ornament-shop-card">
                    <div className="shop-card-top">
                      <div className="shop-ornament-preview">
                        <OrnamentShape shape={o.shape || getOrnamentShape(o.name || o.label)} color={o.color} />
                      </div>
                      <div className="shop-card-info">
                        <span className="shop-card-num">{String(i + 1).padStart(2, '0')}</span>
                        <h4 className="shop-card-name">{o.label}</h4>
                        <p className="shop-card-fullname">{o.name}</p>
                      </div>
                    </div>
                    <div className="shop-card-retailers">
                      {RETAILERS.map(r => {
                        const url = getSearchUrl(r.key, o.name, o.shape)
                        if (!url) return null
                        return (
                          <a key={r.key} href={url} target="_blank" rel="noopener noreferrer" className="btn-retailer">
                            <div className="retailer-top">
                              <span className="retailer-dot" style={{ background: r.color }} />
                              <span className="retailer-name" style={{ color: r.color }}>{r.label}</span>
                              {o[r.key]?.price && <span className="retailer-price">{o[r.key].price}</span>}
                            </div>
                            <span className="deck-it-cta">Deck it. Buy it.</span>
                          </a>
                        )
                      })}
                    </div>
                    <button
                      className={`btn-save-ornament${savedIds.has(i) ? ' saved' : ''}`}
                      onClick={() => { saveToMyOrnaments(o); setSavedIds(prev => new Set([...prev, i])) }}
                      disabled={savedIds.has(i)}
                    >
                      {savedIds.has(i) ? '✓ Saved to My Ornaments' : '+ Save to My Ornaments'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
