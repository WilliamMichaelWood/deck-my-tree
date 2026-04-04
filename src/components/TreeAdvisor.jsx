import { useState, useEffect, useRef, useCallback } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'

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

const DETECT_PROMPT = `Analyze this image and return ONLY a JSON object with the Christmas tree bounding box coordinates as percentages of the image dimensions: {"treeTop": number, "treeBottom": number, "treeLeft": number, "treeRight": number, "treeCenterX": number}. No other text, just the JSON.`

function buildOverlayPrompt(b) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const top = clamp(b.treeTop,     0,  55)
  const bot = clamp(b.treeBottom,  45, 100)
  const lft = clamp(b.treeLeft,    0,  48)
  const rgt = clamp(b.treeRight,   52, 100)
  const cx  = clamp(b.treeCenterX, 10, 90)

  const h  = bot - top
  const hw = (rgt - lft) / 2

  // Zone y boundaries: top 30% / middle 40% / bottom 30%
  const tipY   = Math.round(top + h * 0.05)   // avoid the very tip
  const topEnd = Math.round(top + h * 0.30)
  const midEnd = Math.round(top + h * 0.70)
  const baseY  = Math.round(top + h * 0.88)  // stop well above trunk base

  // x constraints per zone — tree tapers toward top (triangular silhouette)
  const xRange = (frac, pad = 0.83) => {
    const spread = Math.round(hw * frac * pad)
    return { xl: Math.round(cx - spread), xr: Math.round(cx + spread) }
  }
  const { xl: txl, xr: txr } = xRange(0.24)   // top zone: narrow
  const { xl: mxl, xr: mxr } = xRange(0.62)   // middle zone: wide
  const { xl: lxl, xr: lxr } = xRange(0.88)   // lower zone: widest

  // r sizing — three distinct sizes for three depth zones
  const rBase = Math.max(1.5, Math.min(3.0, hw * 0.13))
  const rSm   = +(rBase * 0.52).toFixed(1)   // Zone A: deliberately small, buried near trunk
  const rMd   = +(rBase * 0.88).toFixed(1)   // Zone B: standard mid-branch
  const rLg   = +(rBase * 1.30).toFixed(1)   // Zone C: hero pieces, outer tips — visibly larger

  // Zone A x: near center (trunk depth)
  const zaXl = Math.round(cx - hw * 0.22)
  const zaXr = Math.round(cx + hw * 0.22)
  // Zone B x: mid-range
  const zbXl = Math.round(cx - hw * 0.58)
  const zbXr = Math.round(cx + hw * 0.58)
  // Zone C minimum distance from center (outer tips)
  const zcMinDist = Math.round(hw * 0.48)

  return `You are a professional Christmas tree decorator. Study this specific photo — note the tree's actual colors, shape, density, and any existing decorations — before placing ornaments.

Output ONLY a valid JSON array. No markdown, no explanation, no code fences. Start with [ and end with ].

═══ TREE BOUNDARIES (hard walls) ═══
Top vertical zone:    y=${tipY}–${topEnd}%,   x=${txl}–${txr}%
Middle vertical zone: y=${topEnd}–${midEnd}%, x=${mxl}–${mxr}%
Lower vertical zone:  y=${midEnd}–${baseY}%,  x=${lxl}–${lxr}%
Tree center x: ${cx}%  |  TRUNK RULE: no ornament y > ${baseY}%

═══ EXACTLY 17 ORNAMENTS — THREE-ZONE PLACEMENT SYSTEM ═══
Ornament placement is determined by depth zone (A/B/C). Each zone has a fixed size and x range.

──── ZONE A — Deep / Near Trunk (6 ornaments, 35%) ────
z = 5–28   (back layer — rendered smaller, 50% opacity, darkened)
r = ${rSm}  (small — these are intentionally subtle, shadow-creating)
x = ${zaXl}–${zaXr}% (close to trunk/center — do not place near tree edges)
Colors: matte and dark only — deep greens, burgundy, brown, navy, charcoal, forest
Purpose: create visual depth and shadow richness inside the tree body
Vertical spread: 2 in top zone, 2 in middle zone, 2 in lower zone

──── ZONE B — Mid-Branch (6 ornaments, 35%) ────
z = 35–62  (middle layer — rendered at full opacity, normal size)
r = ${rMd}  (medium — the structural backbone of the arrangement)
x = ${zbXl}–${zbXr}% (mid-range from center — within vertical zone x limits)
Colors: mixed textures — glass tones, wood colors, soft metallics, satin finishes
Purpose: bridges deep and outer zones, provides structural visual rhythm
Vertical spread: 2 in top zone, 2 in middle zone, 2 in lower zone

──── ZONE C — Outer Tips / Hero Pieces (5 ornaments, 30%) ────
z = 68–95  (front layer — rendered larger, full opacity, drop shadow)
r = ${rLg}  (large — these are the ornaments people actually see and remember)
x: must be ≥${zcMinDist}% away from center (x=${cx}%) toward tree edges — within vertical zone x limits
Colors: your boldest and brightest — glitter, mercury glass, metallic gold/silver, vivid saturated tones
Purpose: outer tips are what the eye lands on first — make every one count
Vertical spread: 1 in top zone, 2 in middle zone, 2 in lower zone

═══ ANTI-STRIPE — diagonal scatter required ═══
FORBIDDEN: 2 or more ornaments within ±4% of the same y value
FORBIDDEN: any pattern that reads as a horizontal row
REQUIRED: alternate left/right of center (cx=${cx}%) throughout — no two consecutive ornaments on the same side
REQUIRED: vary y by ≥5% between consecutive ornaments in the same vertical zone

═══ COLOR SYSTEM ═══
Choose 3–4 colors from this tree's existing palette. Structure:
- Base color: ~60% of ornaments
- Secondary: ~25% of ornaments
- Accent: ~10–15% of ornaments
Zone A colors must be darker/matte versions. Zone C gets the boldest versions + 1–2 metallics (gold #c9a84c, silver #c0c0c0).
FORBIDDEN: same hex color in 3+ consecutive array positions

═══ SHAPE DISTRIBUTION (all 5 types required) ═══
ball: 6  — spread across all three depth zones
drop: 4  — prefer Zone B and C
star: 3  — prefer Zone C (statement pieces on outer tips)
snowflake: 2 — prefer Zone C (delicate, visible)
pinecone:  2 — prefer Zone A (rustic, buried deep)
FORBIDDEN: same shape in 2+ consecutive positions

═══ VERIFICATION (check before returning) ═══
- Total = exactly 17 ✓
- Zone A: 6 ornaments, z=5–28, r=${rSm}, x=${zaXl}–${zaXr}% ✓
- Zone B: 6 ornaments, z=35–62, r=${rMd}, x=${zbXl}–${zbXr}% ✓
- Zone C: 5 ornaments, z=68–95, r=${rLg}, x ≥${zcMinDist}% from center ✓
- No ornament y > ${baseY}% ✓
- No 2+ ornaments at same y ±4% ✓
- No same shape consecutive ✓
- No same color in 3+ consecutive positions ✓

Each ornament must use exactly this JSON structure:
{
  "name": "Specific searchable product name (e.g. 'Shiny ruby red mercury glass ball ornament set of 6')",
  "label": "Short display label (e.g. 'Ruby Mercury Ball')",
  "color": "#hexcolor",
  "shape": "ball",
  "x": number,
  "y": number,
  "r": number,
  "z": number,
  "walmart": { "price": "$X–$XX" },
  "amazon":  { "price": "$X–$XX" },
  "target":  { "price": "$X–$XX" }
}

Return exactly 17 items as a JSON array.`
}

const RETAILERS = [
  { key: 'walmart', label: 'Walmart', color: '#0071ce' },
  { key: 'amazon',  label: 'Amazon',  color: '#ff9900' },
  { key: 'target',  label: 'Target',  color: '#cc0000' },
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

const LOADER_STEPS = [
  '✨ Your stylist is studying your tree…',
  '🎄 Selecting the perfect ornaments…',
  '✦ Placing them just for you…',
]

function MagicLoader() {
  const [step,   setStep]   = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setStep(s => (s + 1) % LOADER_STEPS.length)
        setFading(false)
      }, 380)
    }, 2200)
    return () => clearInterval(timer)
  }, [])

  const progress = Math.round(((step + 1) / LOADER_STEPS.length) * 100)

  return (
    <div className="magic-loader">
      <p className={`magic-message${fading ? ' fading' : ''}`}>{LOADER_STEPS[step]}</p>
      <div className="magic-progress-track">
        <div className="magic-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
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

function renderOrnamentLayer(ornaments) {
  return ornaments.map((o, i) => {
    const z  = o.z ?? 55
    const yp = 0.74 + (o.y / 100) * 0.48
    let ds, op, fl, zi
    if      (z < 34) { ds = 0.70; op = 0.50; fl = 'brightness(0.62)';                        zi = 10 + Math.round(z * 0.7) }
    else if (z < 67) { ds = 1.00; op = 0.75; fl = undefined;                                 zi = 40 + Math.round((z - 34) * 0.9) }
    else             { ds = 1.10; op = 1.00; fl = 'drop-shadow(0 3px 10px rgba(0,0,0,0.52))'; zi = 70 + Math.round((z - 67) * 0.9) }
    return (
      <div key={i} className="ornament-pin" title={o.label} style={{
        left: `${o.x}%`, top: `${o.y}%`,
        width: `${o.r * 2 * yp * ds}%`,
        opacity: op, zIndex: zi, filter: fl,
      }}>
        <OrnamentShape shape={o.shape} color={o.color} />
      </div>
    )
  })
}

function BeforeAfterSlider({ image, ornaments }) {
  const [pct, setPct]       = useState(38)
  const [active, setActive] = useState(false)
  const containerRef = useRef(null)
  const activeRef    = useRef(false)

  // Animate intro slide so user discovers the interaction
  useEffect(() => {
    const t = setTimeout(() => setPct(50), 480)
    return () => clearTimeout(t)
  }, [])

  const getX = (e) => e.touches ? e.touches[0].clientX : e.clientX

  const onMove = useCallback((e) => {
    if (!activeRef.current || !containerRef.current) return
    if (e.cancelable) e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    setPct(Math.max(2, Math.min(98, ((getX(e) - rect.left) / rect.width) * 100)))
  }, [])

  const onStop = useCallback(() => { activeRef.current = false; setActive(false) }, [])

  const onStart = useCallback((e) => {
    activeRef.current = true
    setActive(true)
    if (e.cancelable) e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) setPct(Math.max(2, Math.min(98, ((getX(e) - rect.left) / rect.width) * 100)))
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onStop)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onStop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onStop)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onStop)
    }
  }, [onMove, onStop])

  const ease = active ? 'none' : 'clip-path 0.55s cubic-bezier(0.4,0,0.2,1)'
  const posEase = active ? 'none' : 'left 0.55s cubic-bezier(0.4,0,0.2,1)'

  return (
    <div ref={containerRef} className="ba-slider" onMouseDown={onStart} onTouchStart={onStart}>

      {/* Before — base layer, defines container height */}
      <div className="ba-before">
        <img src={image.preview} alt="Before" className="ba-img" draggable={false} />
        <span className="ba-label ba-label-before">Before</span>
      </div>

      {/* After — clipped to slider position */}
      <div className="ba-after" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, transition: ease }}>
        <img src={image.preview} alt="After" className="ba-img ba-img-after" draggable={false} />
        {renderOrnamentLayer(ornaments)}
        <span className="ba-label ba-label-after">After ✦</span>
      </div>

      {/* Gold divider line + circular handle */}
      <div className="ba-divider" style={{ left: `${pct}%`, transition: posEase }}>
        <div className="ba-handle">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M8 4L2 11L8 18M14 4L20 11L14 18" stroke="#0f1f35" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

const saveDecoration = (image, ornaments, analysis) => {
  const decoration = {
    id: Date.now(),
    image: image.preview,
    ornaments,
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
    retailers: {
      walmart: { price: o.walmart?.price || '' },
      amazon:  { price: o.amazon?.price  || '' },
      target:  { price: o.target?.price  || '' },
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
  if (retailer === 'walmart')     return `https://www.walmart.com/search?q=${q}`
  if (retailer === 'amazon')      return `https://www.amazon.com/s?k=${q}`
  if (retailer === 'target')  return `https://www.target.com/s?searchTerm=${q}`
  return null
}

export default function TreeAdvisor() {
  const [image,          setImage]          = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [result,         setResult]         = useState('')
  const [error,          setError]          = useState('')
  const [dragging,       setDragging]       = useState(false)
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [rawOverlay,     setRawOverlay]     = useState('')
  const [ornaments,      setOrnaments]      = useState([])
  const [showShop,       setShowShop]       = useState(false)
  const [overlayError,   setOverlayError]   = useState('')
  const [shareLoading,   setShareLoading]   = useState(false)
  const [recentTrees,    setRecentTrees]    = useState(() => loadDecorations())
  const [savedIds,       setSavedIds]       = useState(new Set())
  const fileInputRef = useRef(null)
  const shopRef      = useRef(null)
  const overlayRef   = useRef(null)
  const resultRef    = useRef(null)
  const loaderRef    = useRef(null)

  // Scroll helper — offsets for sticky header height so element isn't hidden behind it
  const smoothScrollTo = useCallback((ref, delay = 120) => {
    setTimeout(() => {
      if (!ref.current) return
      const top = ref.current.getBoundingClientRect().top + window.scrollY - 88
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }, delay)
  }, [])

  // Parse ornament JSON once overlay stream finishes, then persist
  useEffect(() => {
    if (!rawOverlay || overlayLoading) return
    try {
      const start = rawOverlay.indexOf('[')
      const end   = rawOverlay.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error('No array')
      const parsed = JSON.parse(rawOverlay.slice(start, end + 1))
      setOrnaments(parsed)
      if (image && result) {
        saveDecoration(image, parsed, result)
        setRecentTrees(loadDecorations())
      }
    } catch {
      setOverlayError('Your stylist had trouble placing ornaments. Try analyzing again.')
    }
  }, [rawOverlay, overlayLoading])

  // Auto-trigger tree detection + ornament placement after analysis text is ready
  useEffect(() => {
    if (!loading && result && image && !ornaments.length && !overlayLoading && !rawOverlay) {
      handleDetectAndDecorate()
    }
  }, [loading, result])

  // Scroll to MagicLoader the moment overlay loading starts
  useEffect(() => {
    if (overlayLoading) smoothScrollTo(loaderRef, 80)
  }, [overlayLoading])

  // Scroll to decorated tree the moment ornaments are ready
  useEffect(() => {
    if (ornaments.length > 0) smoothScrollTo(overlayRef, 150)
  }, [ornaments.length])

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
      setOrnaments([])
      setRawOverlay('')
      setOverlayError('')
      setShowShop(false)
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
    setLoading(true)
    setResult('')
    setError('')
    setOrnaments([])
    setRawOverlay('')
    setOverlayError('')
    setShowShop(false)
    smoothScrollTo(resultRef, 160) // scroll to result card as soon as it mounts
    try {
      await streamChat({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: getAnalysisPrompt() },
          ],
        }],
        maxTokens: 1000,
        onText: (text) => setResult(prev => prev + text),
      })
    } catch (err) {
      const msg = err.message || ''
      const isNetworkError = /load failed|failed to fetch|network/i.test(msg)
      setError(isNetworkError
        ? 'Connection error. Please check your internet and try again.'
        : 'Something went wrong. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const handleDetectAndDecorate = async () => {
    if (!image) return
    setOverlayLoading(true)
    setRawOverlay('')
    setOverlayError('')

    try {
      // Step 1 — detect tree bounding box
      let detectRaw = ''
      await streamChat({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: DETECT_PROMPT },
          ],
        }],
        maxTokens: 200,
        onText: (t) => { detectRaw += t },
      })

      // Parse bounds — fall back to full-image safe defaults on failure
      let bounds = { treeTop: 5, treeBottom: 90, treeLeft: 10, treeRight: 90, treeCenterX: 50 }
      try {
        const s = detectRaw.indexOf('{'), e = detectRaw.lastIndexOf('}')
        if (s !== -1 && e !== -1) bounds = { ...bounds, ...JSON.parse(detectRaw.slice(s, e + 1)) }
      } catch { /* use defaults */ }

      // Step 2 — place ornaments using detected bounds
      await streamChat({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: buildOverlayPrompt(bounds) },
          ],
        }],
        maxTokens: 6500,
        onText: (text) => setRawOverlay(prev => prev + text),
      })
    } catch {
      setOverlayError('Your stylist had trouble placing ornaments. Try analyzing again.')
    } finally {
      setOverlayLoading(false)
    }
  }

  const handleDeleteRecent = (id) => {
    const updated = recentTrees.filter(d => d.id !== id)
    setRecentTrees(updated)
    localStorage.setItem('decorations', JSON.stringify(updated))
  }

  const handleViewAgain = (decoration) => {
    setImage({ preview: decoration.image, base64: null, mediaType: 'image/jpeg' })
    setResult(decoration.analysis)
    setRawOverlay('')
    setOverlayError('')
    setError('')
    setShowShop(false)
    setOrnaments(decoration.ornaments)
    setTimeout(() => overlayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleSleighIt = () => {
    setShowShop(true)
    setTimeout(() => shopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
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
      <div className="section-header">
        <h2>🌲 Tree Advisor</h2>
        <p>Upload a photo of your Christmas tree and your stylist will craft a personalized decoration plan — then show you exactly how it could look, fully decorated.</p>
      </div>

      {/* Upload zone — hide once we have ornaments to keep focus on the overlay */}
      {!ornaments.length && (
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
              <button className="btn-secondary" onClick={() => { setImage(null); setResult(''); setOrnaments([]); setRawOverlay(''); setShowShop(false) }}>
                Remove Photo
              </button>
              <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
                {loading ? <><span className="spin">✦</span> Analyzing…</> : '✨ Analyze My Tree'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Recent Trees — shown only when no active decoration */}
      {!ornaments.length && recentTrees.length > 0 && (
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

      {error && <div className="error-card">⚠️ {error}</div>}

      {/* Analysis result */}
      {(result || loading) && !ornaments.length && (
        <div className="result-card" ref={resultRef}>
          <div className="result-header">
            <span>🎄 Your Personalized Decoration Plan</span>
            {loading && <span className="streaming-badge">Generating…</span>}
          </div>
          <div className="result-body">
            <MarkdownContent text={result} />
            {loading && <span className="cursor">▌</span>}
          </div>
        </div>
      )}

      {/* Overlay loading state */}
      {overlayLoading && <div ref={loaderRef}><MagicLoader /></div>}

      {overlayError && <div className="error-card">⚠️ {overlayError}</div>}

      {/* Decorated tree overlay */}
      {ornaments.length > 0 && image && (
        <div className="overlay-section" ref={overlayRef}>

          <div className="overlay-label-row">
            <span className="overlay-eyebrow">✦ Your tree, decorated</span>
            <button className="btn-ghost-sm" onClick={() => { setOrnaments([]); setRawOverlay(''); setShowShop(false) }}>
              Start over
            </button>
          </div>

          <BeforeAfterSlider image={image} ornaments={ornaments} />

          <div className="ornament-legend">
            {ornaments
              .filter((o, i, arr) => arr.findIndex(x => x.shape === o.shape && x.color === o.color) === i)
              .slice(0, 8)
              .map((o, i) => (
              <div key={i} className="legend-item">
                <span className="legend-dot" style={{ background: o.color }} />
                <span>{o.label}</span>
              </div>
            ))}
          </div>

          <div className="overlay-actions">
            {!showShop && (
              <button className="btn-sleigh-it" onClick={handleSleighIt}>
                Sleigh It — Shop the Look
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'inline',verticalAlign:'middle',marginLeft:'8px'}}>
                  <path d="M3.5 9H14.5M14.5 9L9.5 4M14.5 9L9.5 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <div className="share-row">
              <button className="btn-share" onClick={handleShare} disabled={shareLoading}>
                {shareLoading ? <><span className="spin">✦</span> Preparing…</> : '✦ Share Image'}
              </button>
              <button className="btn-share" onClick={handleShareLink}>
                ✦ Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopping list */}
      {showShop && ornaments.length > 0 && (
        <div className="ornament-shop-section" ref={shopRef}>
          <div className="shop-section-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{display:'inline',verticalAlign:'middle',marginRight:'8px',marginBottom:'2px'}}>
                <path d="M10,1 L11.6,8.4 L19,10 L11.6,11.6 L10,19 L8.4,11.6 L1,10 L8.4,8.4 Z" fill="#c9a84c"/>
              </svg>
              Your Ornament Shopping List
            </h3>
            <p className="shop-section-sub">{ornaments.length} ornaments · Tap to shop on your favourite retailer</p>
          </div>

          <div className="ornament-shop-list">
            {ornaments.map((o, i) => (
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
                      <a
                        key={r.key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-retailer"
                      >
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
                  onClick={() => {
                    saveToMyOrnaments(o)
                    setSavedIds(prev => new Set([...prev, i]))
                  }}
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
  )
}
