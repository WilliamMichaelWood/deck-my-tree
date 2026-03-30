import { useState, useEffect } from 'react'
import { streamChat } from '../lib/stream'

const TREE_STYLES = [
  { id: 'classic',       label: 'Classic',       icon: '🎄' },
  { id: 'modern',        label: 'Modern',         icon: '◆'  },
  { id: 'rustic',        label: 'Rustic',         icon: '🪵' },
  { id: 'whimsical',     label: 'Whimsical',      icon: '🦄' },
  { id: 'elegant',       label: 'Elegant',        icon: '✦'  },
  { id: 'scandinavian',  label: 'Scandinavian',   icon: '❄️' },
  { id: 'coastal',       label: 'Coastal',        icon: '🐚' },
  { id: 'maximalist',    label: 'Maximalist',     icon: '🌟' },
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
  { key: 'walmart',     label: 'Walmart',      color: '#0071ce' },
  { key: 'amazon',      label: 'Amazon',       color: '#ff9900' },
  { key: 'potterybarn', label: 'Pottery Barn', color: '#c8854a' },
]

const buildPrompt = ({ style, palette, budget, size, extraContext }) =>
  `You are a professional Christmas decorator. Create a curated ornament shopping list.

Output ONLY a valid JSON array — no markdown, no explanation, no code fences. Start with [ and end with ].

Each item must use exactly this structure:
{
  "name": "Ornament Name",
  "description": "One vivid sentence describing this ornament",
  "type": "ball | drop | figure | garland | clip-on | etc",
  "quantity": "X pieces",
  "whyPerfect": "One sentence why this suits their palette and style",
  "walmart":     { "price": "$X–$XX" },
  "amazon":      { "price": "$X–$XX" },
  "potterybarn": { "price": "$XX–$XXX" }
}

Tree Style:   ${style}
Color Palette: ${palette}
Budget:       ${budget}
Tree Size:    ${size}
${extraContext ? `Notes: ${extraContext}` : ''}

Return exactly 8 items. Pottery Barn prices should be 2–3× Walmart. Output only the JSON array.`

function getSearchUrl(retailer, name) {
  const q = encodeURIComponent(name + ' christmas ornament')
  if (retailer === 'walmart')     return `https://www.walmart.com/search?q=${q}`
  if (retailer === 'amazon')      return `https://www.amazon.com/s?k=${q}`
  return `https://www.potterybarn.com/search/results.html?words=${encodeURIComponent(name + ' ornament')}`
}

function OrnamentPlaceholder({ color }) {
  return (
    <div
      className="product-image-placeholder"
      style={{ background: `linear-gradient(135deg, ${color}18 0%, #172a4088 100%)` }}
    >
      <svg viewBox="0 0 80 80" width="54" height="54" aria-hidden="true">
        <rect x="35" y="3" width="10" height="16" rx="3.5" fill={color} opacity="0.55"/>
        <circle cx="40" cy="51" r="25" fill={color} opacity="0.14"/>
        <circle cx="40" cy="51" r="25" fill="none" stroke={color} strokeWidth="1.2" opacity="0.28"/>
        <ellipse cx="31" cy="41" rx="7" ry="5" fill="rgba(255,255,255,0.11)" transform="rotate(-25 31 41)"/>
      </svg>
    </div>
  )
}

function ProductCard({ retailer, price, ornamentName }) {
  const r = RETAILERS.find(x => x.key === retailer)
  return (
    <div className="product-card">
      <div className="product-retailer-badge">
        <span className="retailer-dot" style={{ background: r.color }} />
        <span style={{ color: r.color }}>{r.label}</span>
      </div>
      <OrnamentPlaceholder color={r.color} />
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
        <div className="section-divider" />
        <h2>Sleigh the Look</h2>
        <p>Tell your stylist about your tree and they'll curate a personalized ornament shopping list — with picks across three price points.</p>
      </div>

      <div className="shop-form">
        <div className="form-section">
          <h3 className="form-section-title">Tree Style</h3>
          <div className="style-grid">
            {TREE_STYLES.map(s => (
              <button
                key={s.id}
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
            <p className="loading-sub">Sourcing ornaments across Walmart, Amazon &amp; Pottery Barn</p>
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
