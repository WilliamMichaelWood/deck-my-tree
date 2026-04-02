import { useState, useEffect } from 'react'
import { streamChat } from '../lib/stream'

const TREE_STYLES = [
  { id: 'classic',      label: 'Classic',      icon: '🎄' },
  { id: 'modern',       label: 'Modern',       icon: <svg width="20" height="20" viewBox="0 0 20 20" style={{display:'block'}}><polygon points="10,2 17.3,6 17.3,14 10,18 2.7,14 2.7,6" fill="none" stroke="#5c606e" strokeWidth="1.8"/></svg> },
  { id: 'rustic',       label: 'Rustic',       icon: '🪵' },
  { id: 'whimsical',    label: 'Whimsical',    icon: '🦄' },
  { id: 'elegant',      label: 'Elegant',      icon: <svg width="20" height="20" viewBox="0 0 20 20" style={{display:'block'}}><path d="M2,14.5 L2,9 L6.5,13 L10,2.5 L13.5,13 L18,9 L18,14.5 Z" fill="#9b59b6"/><rect x="2" y="15.2" width="16" height="2.3" rx="0.9" fill="#9b59b6"/></svg> },
  { id: 'scandinavian', label: 'Scandinavian', icon: '❄️' },
  { id: 'coastal',      label: 'Coastal',      icon: '🐚' },
  { id: 'maximalist',   label: 'Maximalist',   icon: '🌟' },
]

const PALETTES = [
  { id: 'traditional',   label: 'Traditional Red & Green', preview: ['#c0392b', '#2d7a4f', '#d4a843'] },
  { id: 'bluesilver',    label: 'Blue & Silver',           preview: ['#2980b9', '#bdc3c7', '#ecf0f1'] },
  { id: 'goldwhite',     label: 'Gold & White',            preview: ['#d4a843', '#f5f5f0', '#b8860b'] },
  { id: 'pinkrose',      label: 'Pink & Rose Gold',        preview: ['#e91e8c', '#c9a87c', '#f8bbd0'] },
  { id: 'purplesilver',  label: 'Purple & Silver',         preview: ['#8e44ad', '#bdc3c7', '#d7bde2'] },
  { id: 'natural',       label: 'Natural & Earthy',        preview: ['#795548', '#8bc34a', '#d4a843'] },
  { id: 'rainbow',       label: 'Rainbow & Bright',        preview: ['#e74c3c', '#f39c12', '#27ae60'] },
  { id: 'blackgold',     label: 'Black & Gold',            preview: ['#1a1a1a', '#d4a843', '#8b7536'] },
]

const BUDGETS = ['Under $50', '$50–$150', '$150–$300', '$300–$500', '$500+']
const SIZES   = ['Tabletop (under 3ft)', 'Small (3–5ft)', 'Medium (6–7ft)', 'Large (8–9ft)', 'XL (10ft+)']

const RETAILERS = [
  { key: 'walmart', label: 'Walmart', color: '#0071ce' },
  { key: 'amazon',  label: 'Amazon',  color: '#ff9900' },
]

const buildPrompt = ({ style, palette, budget, size, extraContext }) =>
  `You are a professional Christmas decorator. Create a curated ornament shopping list.

Output ONLY a valid JSON array — no markdown, no explanation, no code fences. Start with [ and end with ].

Each item must use exactly this structure:
{
  "name": "Ornament Name",
  "description": "One vivid sentence describing this ornament",
  "shape": "ball | drop | star | snowflake | pinecone",
  "color": "#hexcolor",
  "quantity": "X pieces",
  "whyPerfect": "One sentence why this suits their palette and style",
  "walmart": { "price": "$X–$XX" },
  "amazon":  { "price": "$X–$XX" }
}

shape must be exactly one of: ball, drop, star, snowflake, pinecone — match the actual ornament type.
color must be a hex color that matches the ornament's primary color.
Use a variety of shapes across the 8 items — do not make them all balls.

Tree Style:    ${style}
Color Palette: ${palette}
Budget:        ${budget}
Tree Size:     ${size}
${extraContext ? `Notes: ${extraContext}` : ''}

Return exactly 8 items. Output only the JSON array.`

function getOrnamentShape(name = '') {
  const n = name.toLowerCase()
  if (n.includes('snowflake'))                          return 'snowflake'
  if (n.includes('star'))                               return 'star'
  if (n.includes('pinecone') || n.includes('pine cone')) return 'pinecone'
  if (n.includes('drop') || n.includes('teardrop'))     return 'drop'
  return 'ball'
}

function getSearchUrl(retailer, name) {
  const q = encodeURIComponent(name + ' christmas ornament')
  if (retailer === 'walmart') return `https://www.walmart.com/search?q=${q}`
  if (retailer === 'amazon')  return `https://www.amazon.com/s?k=${q}`
}

function OrnamentSVG({ shape, color }) {
  switch (shape) {
    case 'drop':
      return (
        <svg viewBox="0 0 60 84" width="46" height="54" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="13" rx="3.5" fill="#c9a84c"/>
          <path d="M30,13 C18,13 7,27 7,45 C7,62 17,76 30,76 C43,76 53,62 53,45 C53,27 42,13 30,13 Z" fill={color}/>
          <ellipse cx="21" cy="32" rx="6" ry="10" fill="rgba(255,255,255,0.44)" transform="rotate(-15 21 32)"/>
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 60 74" width="54" height="54" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="14" rx="3.5" fill="#c9a84c"/>
          <polygon points="30,28 35,42 49,42 38,51 42,64 30,56 18,64 22,51 11,42 25,42" fill={color}/>
          <ellipse cx="23" cy="37" rx="4" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-30 23 37)"/>
        </svg>
      )
    case 'snowflake':
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" fill="none" aria-hidden="true">
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
          <circle cx="30" cy="30" r="4" fill={color}/>
        </svg>
      )
    case 'pinecone':
      return (
        <svg viewBox="0 0 60 80" width="46" height="54" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="12" rx="3" fill="#c9a84c"/>
          <ellipse cx="30" cy="48" rx="18" ry="28" fill={color}/>
          <path d="M13,62 Q30,54 47,62" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
          <path d="M14,52 Q30,44 46,52" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
          <path d="M15,42 Q30,34 45,42" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
          <path d="M17,32 Q30,24 43,32" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
          <path d="M20,22 Q30,15 40,22" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none"/>
        </svg>
      )
    default: // ball
      return (
        <svg viewBox="0 0 60 74" width="54" height="54" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="14" rx="3.5" fill="#c9a84c"/>
          <circle cx="30" cy="46" r="26" fill={color}/>
          <ellipse cx="21" cy="35" rx="8" ry="6" fill="rgba(255,255,255,0.48)" transform="rotate(-20 21 35)"/>
        </svg>
      )
  }
}

function OrnamentPlaceholder({ shape, color }) {
  return (
    <div
      className="product-image-placeholder"
      style={{ background: `linear-gradient(135deg, ${color}22 0%, #172a4088 100%)` }}
    >
      <OrnamentSVG shape={shape} color={color} />
    </div>
  )
}

function ProductCard({ retailer, price, ornamentName, shape, color }) {
  const r = RETAILERS.find(x => x.key === retailer)
  return (
    <div className="product-card">
      <div className="product-retailer-badge">
        <span className="retailer-dot" style={{ background: r.color }} />
        <span style={{ color: r.color }}>{r.label}</span>
      </div>
      <OrnamentPlaceholder shape={shape} color={color} />
      <div className="product-price">{price ?? '—'}</div>
      <a
        href={getSearchUrl(retailer, ornamentName)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-deck-it"
      >
        Deck it. Buy it.
      </a>
    </div>
  )
}

function RecommendationCard({ item, index }) {
  return (
    <div className="recommendation-card">
      <div className="rec-card-header">
        <span className="rec-number">{String(index + 1).padStart(2, '0')}</span>
        <div className="rec-info">
          <h3 className="rec-name">{item.name}</h3>
          <p className="rec-desc">{item.description}</p>
          <div className="rec-tags">
            {item.type     && <span className="rec-tag">{item.type}</span>}
            {item.quantity && <span className="rec-tag">{item.quantity}</span>}
          </div>
        </div>
      </div>
      {item.whyPerfect && <p className="rec-why">✦ {item.whyPerfect}</p>}
      <div className="product-cards-grid">
        {RETAILERS.map(r => (
          <ProductCard
            key={r.key}
            retailer={r.key}
            price={item[r.key]?.price}
            ornamentName={item.name}
            shape={getOrnamentShape(item.name)}
            color={item.color || '#c9a84c'}
          />
        ))}
      </div>
    </div>
  )
}

export default function SleighTheLook() {
  const [style,        setStyle]        = useState('')
  const [palette,      setPalette]      = useState('')
  const [budget,       setBudget]       = useState('')
  const [size,         setSize]         = useState('')
  const [extraContext, setExtraContext] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [rawResult,    setRawResult]    = useState('')
  const [products,     setProducts]     = useState([])
  const [error,        setError]        = useState('')

  const canGenerate = style && palette && budget && size

  useEffect(() => {
    if (!rawResult || loading) return
    try {
      const cleaned = rawResult.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
      const start = cleaned.indexOf('[')
      const end   = cleaned.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error('No array found')
      setProducts(JSON.parse(cleaned.slice(start, end + 1)))
    } catch {
      setError('Your stylist had trouble formatting the list. Please try again.')
    }
  }, [rawResult, loading])

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setRawResult('')
    setProducts([])
    setError('')
    try {
      await streamChat({
        messages: [{ role: 'user', content: buildPrompt({ style, palette, budget, size, extraContext }) }],
        onText: (text) => setRawResult(prev => prev + text),
      })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setProducts([]); setRawResult(''); setError('') }

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2><svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', marginBottom: '3px' }}><path d="M11,0.5 L12.8,9.2 L21.5,11 L12.8,12.8 L11,21.5 L9.2,12.8 L0.5,11 L9.2,9.2 Z" fill="#c9a84c"/><circle cx="17.5" cy="4.5" r="1" fill="#c9a84c" opacity="0.5"/><circle cx="4.5" cy="17.5" r="1" fill="#c9a84c" opacity="0.5"/><circle cx="17.5" cy="17.5" r="1" fill="#c9a84c" opacity="0.38"/><circle cx="4.5" cy="4.5" r="1" fill="#c9a84c" opacity="0.38"/></svg>Sleigh the Look</h2>
        <p>Tell your stylist about your tree and they'll curate a personalized ornament shopping list — shoppable on Walmart and Amazon.</p>
      </div>

      <div className="shop-form">
        <div className="form-section">
          <h3 className="form-section-title">Tree Style</h3>
          <div className="style-grid">
            {TREE_STYLES.map(s => (
              <button
                key={s.id}
                data-style={s.id}
                className={`style-btn${style === s.label ? ' selected' : ''}`}
                onClick={() => { setStyle(s.label); reset() }}
              >
                <span className="style-icon">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Color Palette</h3>
          <div className="palette-grid">
            {PALETTES.map(p => (
              <button
                key={p.id}
                className={`palette-btn${palette === p.label ? ' selected' : ''}`}
                onClick={() => { setPalette(p.label); reset() }}
              >
                <div className="palette-swatches">
                  {p.preview.map((c, i) => (
                    <span key={i} className="swatch" style={{ background: c }} />
                  ))}
                </div>
                <span className="palette-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-section">
            <h3 className="form-section-title">Tree Size</h3>
            <div className="pill-group">
              {SIZES.map(s => (
                <button
                  key={s}
                  className={`pill-btn${size === s ? ' selected' : ''}`}
                  onClick={() => { setSize(s); reset() }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Budget</h3>
            <div className="pill-group">
              {BUDGETS.map(b => (
                <button
                  key={b}
                  className={`pill-btn${budget === b ? ' selected' : ''}`}
                  onClick={() => { setBudget(b); reset() }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">
            Additional Context <span className="optional-label">(optional)</span>
          </h3>
          <textarea
            className="form-textarea"
            placeholder="e.g. Mid-century modern living room, already have lights and a star topper, it's for a child's room…"
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            rows={3}
          />
        </div>

        <button
          className="btn-primary btn-full btn-lg"
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
        >
          {loading
            ? <><span className="spin">✦</span> Curating your picks…</>
            : canGenerate
              ? '✨ Build My Shopping List'
              : '← Complete selections above to continue'}
        </button>
      </div>

      {error && <div className="error-card">⚠️ {error}</div>}

      {loading && !products.length && (
        <div className="curation-loading">
          <span className="spin">✦</span>
          <div>
            <p className="loading-title">Your stylist is curating…</p>
            <p className="loading-sub">Sourcing ornaments across Walmart &amp; Amazon</p>
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="recommendations-list">
          {products.map((item, i) => (
            <RecommendationCard key={i} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
