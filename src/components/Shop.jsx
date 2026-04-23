import { useState } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'

const TREE_STYLES = [
  { id: 'classic', label: 'Classic', icon: '🎄' },
  { id: 'modern', label: 'Modern', icon: <svg width="20" height="20" viewBox="0 0 20 20" style={{display:'block'}}><polygon points="10,2 17.3,6 17.3,14 10,18 2.7,14 2.7,6" fill="none" stroke="#5c606e" strokeWidth="1.8"/></svg> },
  { id: 'rustic', label: 'Rustic', icon: '🪵' },
  { id: 'whimsical', label: 'Whimsical', icon: '🦄' },
  { id: 'elegant', label: 'Elegant', icon: '✦' },
  { id: 'scandinavian', label: 'Scandinavian', icon: '❄️' },
  { id: 'coastal', label: 'Coastal', icon: '🐚' },
  { id: 'maximalist', label: 'Maximalist', icon: '🌟' },
]

const PALETTES = [
  { id: 'traditional', label: 'Traditional Red & Green', preview: ['#c0392b', '#2d7a4f', '#d4a843'] },
  { id: 'bluesilver', label: 'Blue & Silver', preview: ['#2980b9', '#bdc3c7', '#ecf0f1'] },
  { id: 'goldwhite', label: 'Gold & White', preview: ['#d4a843', '#f5f5f0', '#b8860b'] },
  { id: 'pinkrose', label: 'Pink & Rose Gold', preview: ['#e91e8c', '#c9a87c', '#f8bbd0'] },
  { id: 'purplesilver', label: 'Purple & Silver', preview: ['#8e44ad', '#bdc3c7', '#d7bde2'] },
  { id: 'natural', label: 'Natural & Earthy', preview: ['#795548', '#8bc34a', '#d4a843'] },
  { id: 'rainbow', label: 'Rainbow & Bright', preview: ['#e74c3c', '#f39c12', '#27ae60'] },
  { id: 'blackgold', label: 'Black & Gold', preview: ['#1a1a1a', '#d4a843', '#8b7536'] },
]

const BUDGETS = ['Under $50', '$50–$150', '$150–$300', '$300–$500', '$500+']
const SIZES = ['Tabletop (under 3ft)', 'Small (3–5ft)', 'Medium (6–7ft)', 'Large (8–9ft)', 'XL (10ft+)']

const buildPrompt = ({ style, palette, budget, size, extraContext }) => `You are a professional Christmas decorator and luxury holiday gift curator. Create a curated, shoppable ornament collection for the following:

**Tree Style**: ${style}
**Color Palette**: ${palette}
**Budget**: ${budget}
**Tree Size**: ${size}
${extraContext ? `**Additional context**: ${extraContext}` : ''}

Please provide exactly 8–10 specific ornament recommendations. For each use this format:

### [Creative Ornament Name]
- **Type**: [ball, drop, figure, clip-on, icicle, etc.]
- **Description**: [vivid 1-sentence description]
- **Colors/Finish**: [specific details]
- **Size**: [diameter/height]
- **Quantity**: [how many for this tree]
- **Price Range**: [$X–$XX per piece / per set]
- **Why it's perfect**: [1 sentence tailored to their palette and style]

---

After the ornament list:

## 🛒 Shopping Strategy
The smartest order to buy these items and where to shop (department stores, specialty shops, online marketplaces).

## 💰 Budget Breakdown
How to allocate the ${budget} budget across the recommendations for the best visual impact.

## 🎄 Final Look
A vivid 2–3 sentence description of what the finished tree will look like.`

export default function Shop() {
  const [style, setStyle] = useState('')
  const [palette, setPalette] = useState('')
  const [budget, setBudget] = useState('')
  const [size, setSize] = useState('')
  const [extraContext, setExtraContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const canGenerate = style && palette && budget && size

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setResult('')
    setError('')

    try {
      await streamChat({
        messages: [{ role: 'user', content: buildPrompt({ style, palette, budget, size, extraContext }) }],
        onText: (text) => setResult(prev => prev + text),
      })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>🛍️ Stylist's Picks</h2>
        <p>Tell your stylist about your tree and they'll curate a personalized ornament shopping list with specific product picks, quantities, and a budget breakdown.</p>
      </div>

      <div className="shop-form">
        <div className="form-section">
          <h3 className="form-section-title">Tree Style</h3>
          <div className="style-grid">
            {TREE_STYLES.map(s => (
              <button
                key={s.id}
                className={`style-btn${style === s.label ? ' selected' : ''}`}
                onClick={() => { setStyle(s.label); setResult('') }}
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
                onClick={() => { setPalette(p.label); setResult('') }}
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
                  onClick={() => { setSize(s); setResult('') }}
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
                  onClick={() => { setBudget(b); setResult('') }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Additional Context <span className="optional-label">(optional)</span></h3>
          <textarea
            className="form-textarea"
            placeholder="e.g. Mid-century modern living room, I already have lights and a star topper, allergic to tinsel, it's for a child's room…"
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
            ? <><span className="spin">✦</span> Curating your collection…</>
            : canGenerate
              ? '🛍️ Generate My Shopping List'
              : '← Complete selections above to continue'}
        </button>
      </div>

      {error && <div className="error-card">⚠️ {error}</div>}

      {(result || loading) && (
        <div className="result-card">
          <div className="result-header">
            <span>🎄 Your Curated Collection</span>
            {loading && <span className="streaming-badge">Curating…</span>}
          </div>
          <div className="result-body">
            <MarkdownContent text={result} />
            {loading && <span className="cursor">▌</span>}
          </div>
        </div>
      )}
    </div>
  )
}
