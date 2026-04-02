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
  const tipY  = Math.round(top + h * 0.05)   // avoid the very tip
  const topEnd = Math.round(top + h * 0.30)
  const midEnd = Math.round(top + h * 0.70)
  const baseY  = Math.round(top + h * 0.94)  // avoid the very base

  // x constraints per zone — tree tapers toward top (triangular silhouette)
  const xRange = (frac, pad = 0.83) => {
    const spread = Math.round(hw * frac * pad)
    return { xl: Math.round(cx - spread), xr: Math.round(cx + spread) }
  }
  const { xl: txl, xr: txr } = xRange(0.24)   // top zone: narrow
  const { xl: mxl, xr: mxr } = xRange(0.62)   // middle zone: wide
  const { xl: lxl, xr: lxr } = xRange(0.88)   // lower zone: widest

  // r sizing scaled to apparent tree size in frame
  const rBase = Math.max(1.5, Math.min(3.0, hw * 0.13))
  const rSm   = +(rBase * 0.54).toFixed(1)   // small accent (10%)
  const rMd   = +rBase.toFixed(1)             // medium standard (70%)
  const rLg   = +(rBase * 1.20).toFixed(1)   // large anchor (20%)

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

═══ EXACTLY 22 ORNAMENTS — 70/20/10 SIZE RULE ═══
Sizes:  15 MEDIUM r=${rMd}  |  5 LARGE r=${rLg}  |  2 SMALL r=${rSm}

Zone assignments (bottom-weighted for visual stability):
Top zone    (5 ornaments):  2 small r=${rSm}, 3 medium r=${rMd}           — sparse, open
Middle zone (10 ornaments): 8 medium r=${rMd}, 2 large r=${rLg}           — DENSEST zone
Lower zone  (7 ornaments):  4 medium r=${rMd}, 3 large r=${rLg}           — heaviest anchors

Size rules:
- LARGE r=${rLg}: MIDDLE and LOWER zones only — never top zone
- Bottom zone must have MORE large ornaments than middle zone (stability rule)
- Slightly vary r within each size class ±0.1–0.2 for natural look

═══ THREE DEPTH LAYERS — assign z deliberately ═══
z=0–33   BACK LAYER   (buried in tree — rendered 30% smaller, 50% opacity, darker)
z=34–66  MIDDLE LAYER (mid-depth — rendered normal size, 75% opacity)
z=67–100 FRONT LAYER  (near surface — rendered 10% larger, full opacity, shadow)

Every zone MUST contain ornaments from ALL THREE layers:
Top zone (5):    2 back (z=10–30), 2 middle (z=38–60), 1 front (z=70–88)
Middle zone (10): 3 back (z=8–32),  4 middle (z=35–65), 3 front (z=68–95)
Lower zone (7):  2 back (z=12–30),  3 middle (z=38–62), 2 front (z=70–95)

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
With 22 ornaments, maximum 6 of any one shape (30% cap).
Required distribution (all 5 types must be used):
  "ball":      5  (classic — spread evenly, not clustered)
  "drop":      5  (elegant — mostly middle/lower)
  "star":      4  (statement — one per zone minimum)
  "snowflake": 4  (delicate — prefer front layer, high z)
  "pinecone":  4  (rustic — prefer back layer, low z)
FORBIDDEN: same shape in 2+ consecutive array positions.

═══ CLUSTERING — 2–3 tight groups of 3 ═══
- Form 2–3 clusters of 3 ornaments (x/y within 6–12% of each other)
- Vary depth (z) within each cluster — never all same layer
- Between clusters: deliberate negative space >15% — sparse zones make clusters pop
- Slight x asymmetry: skew more ornaments 5–8% toward one side of center

═══ VERIFICATION (check all before returning) ═══
- Total = exactly 22 ✓
- 15 medium, 5 large, 2 small ✓
- No shape > 6 occurrences ✓
- No same shape consecutive ✓
- No 3+ ornaments at same y ±5% ✓
- Each zone has back + middle + front layer ornaments ✓
- Each color in 2+ zones ✓
- Bottom zone has more large ornaments than middle zone ✓

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

Return exactly 22 items as a JSON array.`
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
        maxTokens: 5500,
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

          <div className="tree-overlay-wrap">
            <img src={image.preview} alt="Your decorated tree" className="tree-overlay-img" />
            {ornaments.map((o, i) => {
              // y-based perspective: ornaments lower on tree appear naturally larger
              const yPerspective = 0.74 + (o.y / 100) * 0.48
              const z = o.z ?? 55

              // Three discrete depth layers matching prompt specification
              let depthScale, opacity, filter, zIndex
              if (z < 34) {
                // Back layer: 30% smaller, half opacity, darker (branches obscure)
                depthScale = 0.70
                opacity    = 0.50
                filter     = 'brightness(0.62)'
                zIndex     = 10 + Math.round(z * 0.7)
              } else if (z < 67) {
                // Middle layer: normal size, 75% opacity, no filter
                depthScale = 1.00
                opacity    = 0.75
                filter     = undefined
                zIndex     = 40 + Math.round((z - 34) * 0.9)
              } else {
                // Front layer: slightly larger, full opacity, subtle shadow
                depthScale = 1.10
                opacity    = 1.00
                filter     = 'drop-shadow(0 3px 10px rgba(0,0,0,0.52))'
                zIndex     = 70 + Math.round((z - 67) * 0.9)
              }

              const size = `${o.r * 2 * yPerspective * depthScale}%`
              return (
                <div
                  key={i}
                  className="ornament-pin"
                  title={o.label}
                  style={{
                    left:   `${o.x}%`,
                    top:    `${o.y}%`,
                    width:  size,
                    opacity,
                    zIndex,
                    filter,
                  }}
                >
                  <OrnamentShape shape={o.shape} color={o.color} />
                </div>
              )
            })}
          </div>

          <div className="ornament-legend">
            {ornaments.map((o, i) => (
              <div key={i} className="legend-item">
                <span className="legend-dot" style={{ background: o.color }} />
                <span>{o.label}</span>
              </div>
            ))}
          </div>

          {!showShop && (
            <button className="btn-sleigh-it" onClick={handleSleighIt}>
              Sleigh It — Shop the Look
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'inline',verticalAlign:'middle',marginLeft:'8px'}}>
                <path d="M3.5 9H14.5M14.5 9L9.5 4M14.5 9L9.5 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
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
                    <div
                      className="shop-ornament-ball"
                      style={{
                        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, ${o.color}dd 38%, ${o.color} 100%)`,
                      }}
                    />
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
