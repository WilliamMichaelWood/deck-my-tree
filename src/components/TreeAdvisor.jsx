import { useState, useEffect, useRef, useCallback } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'

const ANALYSIS_PROMPT = `You are a personal holiday stylist. Study this specific photo carefully before responding — look at the actual tree shape (full/sparse/narrow/wide), the real colors already on the tree, the existing ornaments and decorations visible, the tree type (real/artificial, needle type), and the lighting conditions in the room.

Give exactly 5 bullet points about THIS tree — not a generic tree. Each bullet must reference something you can actually see in the image: name specific colors, describe the actual shape, call out existing ornaments by what they look like, note the real gaps or problem areas visible. If the tree already has decorations, your advice should build on or contrast with what is already there.

Write like a stylist texting a friend — casual, direct, 1–2 complete sentences per bullet. No headers. No generic advice that could apply to any tree. Every sentence must be complete.`

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

  // r sizing scaled to apparent tree size in frame
  // rLg reduced 15% from previous (1.20 → 1.02) — anchors were too dominant
  const rBase = Math.max(1.5, Math.min(3.0, hw * 0.13))
  const rSm   = +(rBase * 0.54).toFixed(1)   // small accent
  const rMd   = +rBase.toFixed(1)             // medium standard
  const rLg   = +(rBase * 1.02).toFixed(1)   // large anchor (15% smaller than before)

  // Per-zone x midpoints for anti-stripe stagger hints
  const midTop = Math.round(tipY  + (topEnd - tipY)  / 2)
  const midMid = Math.round(topEnd + (midEnd - topEnd) / 2)
  const midLow = Math.round(midEnd + (baseY  - midEnd) / 2)

  return `You are a professional Christmas tree decorator with 15 years of editorial experience. Study this specific photo — note the tree's actual colors, shape, density, and any existing decorations — before placing ornaments.

Output ONLY a valid JSON array. No markdown, no explanation, no code fences. Start with [ and end with ].

═══ TREE BOUNDARIES (hard walls — no ornament may exceed these) ═══
Top zone:    y=${tipY}–${topEnd}%,   x=${txl}–${txr}%
Middle zone: y=${topEnd}–${midEnd}%, x=${mxl}–${mxr}%
Lower zone:  y=${midEnd}–${baseY}%,  x=${lxl}–${lxr}%
Approx zone centers: top y≈${midTop}, middle y≈${midMid}, lower y≈${midLow}

═══ EXACTLY 30 ORNAMENTS — SIZE DISTRIBUTION ═══
Sizes:  18 MEDIUM r=${rMd}  |  6 LARGE r=${rLg}  |  6 SMALL r=${rSm}

Zone assignments — ALL THREE ZONES MUST BE FULLY POPULATED:
Top zone    (10 ornaments): 4 small r=${rSm}, 6 medium r=${rMd}           — fill the upper tree fully, spread across full x range
Middle zone (12 ornaments): 1 small r=${rSm}, 8 medium r=${rMd}, 3 large r=${rLg}  — densest zone
Lower zone  (8 ornaments):  1 small r=${rSm}, 4 medium r=${rMd}, 3 large r=${rLg}  — heaviest anchors

Size rules:
- LARGE r=${rLg}: MIDDLE and LOWER zones only — never top zone
- Bottom zone has MORE large ornaments (3) than middle zone (2) — stability rule
- Small accents r=${rSm}: scatter throughout ALL zones, bury deep in branches (z=8–35)
- Slightly vary r within each size class ±0.1 for natural look

TRUNK RULE — CRITICAL: no ornament may have y > ${baseY}%. The tree trunk begins there.
Any ornament at or below the trunk base looks wrong and breaks the illusion.

═══ THREE DEPTH LAYERS — assign z deliberately ═══
z=0–33   BACK LAYER   (buried in tree — rendered 30% smaller, 50% opacity, darker)
z=34–66  MIDDLE LAYER (mid-depth — rendered normal size, 75% opacity)
z=67–100 FRONT LAYER  (near surface — rendered 10% larger, full opacity, shadow)

Every zone MUST contain ornaments from ALL THREE layers:
Top zone (10):   3 back (z=10–30), 5 middle (z=38–60), 2 front (z=70–88)
Middle zone (12): 4 back (z=8–32),  5 middle (z=35–65), 3 front (z=68–95)
Lower zone (8):  2 back (z=12–30),  3 middle (z=38–62), 3 front (z=70–95)

Depth + color rule: darker/matte ornaments → back layer (low z). Bright/glitter → front (high z).

═══ ANTI-STRIPE — diagonal scatter is mandatory ═══
FORBIDDEN: 3 or more ornaments within ±5% of the same y value.
FORBIDDEN: uniform horizontal rows — this is the #1 amateur mistake.
REQUIRED: ornaments must form diagonal visual lines when you connect them.
Strategy: within each zone, vary y values wildly. If one ornament is at y=${midMid}%,
the next in that zone must differ by at least 5% in y. Stagger: high-low-mid-high-low.
Also stagger x: alternate left-of-center and right-of-center throughout.

═══ COLOR PLACEMENT — diagonal distribution ═══
1. Choose 3–4 complementary colors matching this tree's existing palette
2. Each color MUST appear across ALL three zones (no color blocks)
3. Primary color in triangular pattern: upper-left → mid-right → lower-left (or mirror)
4. FORBIDDEN: same hex color 3+ consecutive positions in array
5. FORBIDDEN: same color twice in same zone without a different color between
6. Include 2–3 metallics (gold #c9a84c, silver #c0c0c0, champagne #f5e6c8) as "glue"

═══ SHAPE VARIETY — max 30% any single type ═══
With 30 ornaments, maximum 9 of any one shape (30% cap).
Required distribution (all 5 types must be used):
  "ball":      7  (classic — spread evenly across all zones)
  "drop":      6  (elegant — mostly middle/lower)
  "star":      6  (statement — at least one in each zone)
  "snowflake": 6  (delicate — prefer front layer, high z)
  "pinecone":  5  (rustic — prefer back layer, low z)
FORBIDDEN: same shape in 2+ consecutive array positions.

═══ CLUSTERING — 2–3 tight groups of 3 ═══
- Form 2–3 clusters of 3 ornaments (x/y within 6–12% of each other)
- Vary depth (z) within each cluster — never all same layer
- Between clusters: deliberate negative space >15% — sparse zones make clusters pop
- Slight x asymmetry: skew more ornaments 5–8% toward one side of center

═══ VERIFICATION (check all before returning) ═══
- Total = exactly 30 ✓
- 18 medium, 6 large, 6 small ✓
- Top zone has 10 ornaments, middle 12, lower 8 ✓
- No ornament y > ${baseY}% (trunk rule) ✓
- No shape > 9 occurrences ✓
- No same shape consecutive ✓
- No 3+ ornaments at same y ±5% ✓
- Each zone has back + middle + front layer ornaments ✓
- Each color in 2+ zones ✓
- Bottom zone (3 large) has more large ornaments than middle (3 large) ✓

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
  "walmart":     { "price": "$X–$XX" },
  "amazon":      { "price": "$X–$XX" },
  "potterybarn": { "price": "$X–$XX" }
}

Return exactly 30 items as a JSON array.`
}

const RETAILERS = [
  { key: 'walmart',     label: 'Walmart',      color: '#0071ce' },
  { key: 'amazon',      label: 'Amazon',       color: '#ff9900' },
  { key: 'potterybarn', label: 'Pottery Barn', color: '#8b6914' },
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

function getOrnamentShape(name = '') {
  const n = name.toLowerCase()
  if (n.includes('snowflake'))                           return 'snowflake'
  if (n.includes('star'))                                return 'star'
  if (n.includes('pinecone') || n.includes('pine cone')) return 'pinecone'
  if (n.includes('drop') || n.includes('teardrop'))      return 'drop'
  return 'ball'
}

function getSearchUrl(retailer, name) {
  const q = encodeURIComponent(name + ' christmas ornament')
  if (retailer === 'walmart')     return `https://www.walmart.com/search?q=${q}`
  if (retailer === 'amazon')      return `https://www.amazon.com/s?k=${q}`
  if (retailer === 'potterybarn') return `https://www.potterybarn.com/search/results.html?words=${q}`
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

  // Parse ornament JSON once overlay stream finishes
  useEffect(() => {
    if (!rawOverlay || overlayLoading) return
    try {
      const start = rawOverlay.indexOf('[')
      const end   = rawOverlay.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error('No array')
      setOrnaments(JSON.parse(rawOverlay.slice(start, end + 1)))
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
            { type: 'text', text: ANALYSIS_PROMPT },
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
                    <OrnamentShape shape={getOrnamentShape(o.name || o.label)} color={o.color} />
                  </div>
                  <div className="shop-card-info">
                    <span className="shop-card-num">{String(i + 1).padStart(2, '0')}</span>
                    <h4 className="shop-card-name">{o.label}</h4>
                    <p className="shop-card-fullname">{o.name}</p>
                  </div>
                </div>
                <div className="shop-card-retailers">
                  {RETAILERS.map(r => (
                    <a
                      key={r.key}
                      href={getSearchUrl(r.key, o.name)}
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
