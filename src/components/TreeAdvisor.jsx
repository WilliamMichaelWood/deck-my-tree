import { useState, useEffect, useRef } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'

const ANALYSIS_PROMPT = `You are a personal holiday stylist. Study this specific photo carefully before responding — look at the actual tree shape (full/sparse/narrow/wide), the real colors already on the tree, the existing ornaments and decorations visible, the tree type (real/artificial, needle type), and the lighting conditions in the room.

Give exactly 5 bullet points about THIS tree — not a generic tree. Each bullet must reference something you can actually see in the image: name specific colors, describe the actual shape, call out existing ornaments by what they look like, note the real gaps or problem areas visible. If the tree already has decorations, your advice should build on or contrast with what is already there.

Write like a stylist texting a friend — casual, direct, 1–2 complete sentences per bullet. No headers. No generic advice that could apply to any tree. Every sentence must be complete.`

const OVERLAY_PROMPT = `Study this Christmas tree photo carefully. You will suggest exactly 7 ornaments to add to this specific tree.

Output ONLY a valid JSON array — no markdown, no explanation, no code fences. Start with [ and end with ].

CRITICAL — placement rules (violations will break the UI):
Christmas trees are roughly triangular. The tree gets narrower toward the top.
- Upper third of tree (y=10–35%): x must stay within roughly 38–62% of image width (narrow zone near the tip). r must be 1.4–1.8.
- Middle third of tree (y=35–65%): x must stay within roughly 28–72% of image width. r must be 1.8–2.4.
- Lower third of tree (y=65–88%): x must stay within roughly 22–78% of image width. r must be 2.2–3.0.
- NEVER place ornaments in the sky/background, outside the green tree silhouette, on the floor, or on the trunk.
- You MUST have at least 2 ornaments in each zone (upper/middle/lower).

Each item must use exactly this structure:
{
  "name": "Specific searchable ornament name (e.g. 'Shiny red glass ball ornament set of 12')",
  "label": "Short display label (e.g. 'Red Ball')",
  "color": "#hexcolor",
  "x": 42,
  "y": 55,
  "r": 2.0,
  "walmart":     { "price": "$X–$XX" },
  "amazon":      { "price": "$X–$XX" },
  "potterybarn": { "price": "$X–$XX" }
}

Additional rules:
- Vary x placement naturally within each zone — trees aren't symmetric
- Choose colors that complement this tree's existing palette and style
- Name must be specific enough to return good search results

Return exactly 7 items.`

const RETAILERS = [
  { key: 'walmart',     label: 'Walmart',      color: '#0071ce' },
  { key: 'amazon',      label: 'Amazon',       color: '#ff9900' },
  { key: 'potterybarn', label: 'Pottery Barn', color: '#8b6914' },
]

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

  // Auto-trigger overlay after analysis text is ready
  useEffect(() => {
    if (!loading && result && image && !ornaments.length && !overlayLoading && !rawOverlay) {
      handleOverlay()
    }
  }, [loading, result])

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

  const handleOverlay = async () => {
    if (!image) return
    setOverlayLoading(true)
    setRawOverlay('')
    setOverlayError('')
    try {
      await streamChat({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: OVERLAY_PROMPT },
          ],
        }],
        maxTokens: 2000,
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
        <div className="result-card">
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
      {overlayLoading && (
        <div className="overlay-generating">
          <span className="spin">✦</span>
          <div>
            <p className="loading-title">Decorating your tree…</p>
            <p className="loading-sub">Placing ornaments on your branches</p>
          </div>
        </div>
      )}

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
              // Perspective: ornaments shrink toward the top (smaller y = higher = smaller)
              const perspectiveScale = 0.72 + (o.y / 100) * 0.55
              const diameter = `${o.r * 2 * perspectiveScale}%`
              return (
                <div
                  key={i}
                  className="ornament-pin"
                  title={o.label}
                  style={{
                    left: `${o.x}%`,
                    top:  `${o.y}%`,
                    width:         diameter,
                    paddingBottom: diameter,
                    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.58) 0%, ${o.color}e0 36%, ${o.color} 100%)`,
                    filter: `drop-shadow(0 ${Math.round(2 * perspectiveScale)}px ${Math.round(6 * perspectiveScale)}px rgba(0,0,0,0.65))`,
                  }}
                />
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
