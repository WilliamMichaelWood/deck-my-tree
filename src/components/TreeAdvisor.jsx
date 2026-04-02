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
  // Large r reduced 25% vs previous (1.52 → 1.14) to avoid oversized anchors
  const rBase = Math.max(1.5, Math.min(3.0, hw * 0.13))
  const rSm   = +(rBase * 0.54).toFixed(1)
  const rMd   = +rBase.toFixed(1)
  const rLg   = +(rBase * 1.14).toFixed(1)

  return `You are a professional Christmas tree decorator with 15 years of editorial experience. Study this specific photo — note the tree's actual colors, shape, density, and any existing decorations — before placing ornaments.

Output ONLY a valid JSON array. No markdown, no explanation, no code fences. Start with [ and end with ].

═══ TREE BOUNDARIES (hard walls — no ornament may exceed these) ═══
Top zone:    y=${tipY}–${topEnd}%,   x=${txl}–${txr}%   (narrow — tree tapers here)
Middle zone: y=${topEnd}–${midEnd}%, x=${mxl}–${mxr}%   (widest, most prominent zone)
Lower zone:  y=${midEnd}–${baseY}%,  x=${lxl}–${lxr}%   (wide, anchoring zone)

═══ EXACTLY 9 ORNAMENTS — zone assignments ═══
Top zone (2 ornaments):
  - 1 small filler  r=${rSm}  z=20–45
  - 1 medium        r=${rMd}  z=40–65

Middle zone (4 ornaments) — THE MONEY ZONE, richest variety:
  - 1 small filler  r=${rSm}  z=15–40
  - 2 medium        r=${rMd}  z=40–72
  - 1 large anchor  r=${rLg}  z=62–85

Lower zone (3 ornaments) — heavier than top, creates visual stability:
  - 1 medium        r=${rMd}  z=45–70
  - 1 medium        r=${rMd}  z=48–72
  - 1 large anchor  r=${rLg}  z=65–90

═══ SIZE RULES ═══
- Large ornaments (r=${rLg}): MIDDLE and LOWER zones only — never top zone
- Bottom zone ornaments should use r values LARGER than same-zone medium (stability rule)
- Top zone: small and medium only — large ornaments in top = top-heavy, amateur
- The 2 large anchors go one in middle, one in lower — never both in same zone

═══ DEPTH (z) — the difference between flat and professional ═══
z=0 means buried inside tree (back). z=100 means hanging on surface tip of branch.
- Small ornaments:  z=15–45 (buried deep — create visual fullness from front)
- Medium ornaments: z=38–72 (mid-layer — transition pieces)
- Large ornaments:  z=60–90 (near surface — statement focal points)
- Darker/matte colors → lower z. Bright/glitter/reflective colors → higher z.
- This layering is what separates professional from amateur flat decoration.

═══ COLOR PLACEMENT — diagonal distribution required ═══
1. Choose 3–4 complementary colors that match this tree's existing palette
2. Each color MUST appear in ALL three zones (vertical distribution, not blocks)
3. Primary color: place in triangular pattern across zones (e.g. upper-left, mid-right, lower-left)
4. FORBIDDEN: same hex color in 3+ ornaments in the same zone
5. FORBIDDEN: same color appearing in 3+ consecutive array positions
6. Include 2–3 neutral/metallic ornaments (gold #c9a84c, silver #c0c0c0, champagne #f5e6c8) as "glue"
7. Never place same color touching — always break with a neutral or different color between

═══ CLUSTERING — odd numbers = professional ═══
- Form exactly 2–3 clusters of 3 ornaments with tight spacing (x/y within 5–11% of each other)
- Between clusters: leave deliberate negative space (>15% gap) — sparse areas make clusters pop
- FORBIDDEN: uniform grid spacing, horizontal stripes (same y ±3%), left-right mirror symmetry
- FORBIDDEN: two ornaments sharing the same y within ±2.5% (creates amateur horizontal line)
- Slight asymmetry in x distribution (more ornaments pushed 5–10% off-center toward one side)

═══ SHAPE VARIETY — strict rules ═══
MAXIMUM 3 "ball" ornaments (≤40% of total) — the rest MUST be other shapes.
Required non-ball shapes (choose at least 3 of these 4 types):
  "drop":      2 (elegant elongated — middle/lower zones)
  "star":      2 (statement pieces — scatter across all zones)
  "snowflake": 1 (delicate — high z, near surface)
  "pinecone":  1 (rustic texture — low z, buried deep)
FORBIDDEN: 4+ ball ornaments. FORBIDDEN: two ornaments of same shape adjacent in array.
Alternate shapes as you move through the tree — never place same shape back to back.

═══ VERIFICATION CHECKLIST (check before returning) ═══
- Bottom zone average r > top zone average r ✓
- No same color 3+ consecutive positions ✓
- No two ornaments at same y ±2.5% ✓
- All 5 shapes used, no same shape back-to-back ✓
- ball count ≤ 3 (max 40% of 9) ✓
- Each color appears in 2+ different zones ✓
- Total count = exactly 9 ✓

Each ornament must use exactly this JSON structure:
{
  "name": "Specific searchable product name for shopping (e.g. 'Shiny ruby red mercury glass ball ornament set of 6')",
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

Return exactly 9 items as a JSON array.`
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
        maxTokens: 2400,
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
              // y-based perspective: lower on tree = larger (natural foreshortening)
              const yScale = 0.72 + (o.y / 100) * 0.52
              // z-based depth: deep in tree (low z) = smaller and dimmer; surface (high z) = full size
              const z = o.z ?? 70
              const zScale = 0.74 + (z / 100) * 0.26
              const totalScale = yScale * zScale
              const size = `${o.r * 2 * totalScale}%`
              // Deeper ornaments appear slightly faded (obscured by branches)
              const opacity = 0.58 + (z / 100) * 0.42
              const shadowBlur   = Math.round((5 + z * 0.05) * zScale)
              const shadowOffset = Math.round(2 * zScale)
              const shadowAlpha  = (0.28 + zScale * 0.38).toFixed(2)
              return (
                <div
                  key={i}
                  className="ornament-pin"
                  title={o.label}
                  style={{
                    left:    `${o.x}%`,
                    top:     `${o.y}%`,
                    width:   size,
                    opacity,
                    zIndex:  Math.round(z),
                    filter:  `drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`,
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
