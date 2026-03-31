import { useState, useEffect } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'

const STYLES = ['Classic', 'Modern', 'Rustic', 'Vintage', 'Whimsical', 'Elegant', 'Scandinavian', 'Handmade']
const MATERIALS = ['Glass', 'Metal', 'Wood', 'Fabric', 'Plastic', 'Ceramic', 'Paper', 'Mixed']

const buildPrompt = (ornaments) => `You are a professional Christmas tree stylist with a gift for creating cohesive, beautiful holiday displays.

Here is my ornament collection:
${ornaments.map((o, i) => `${i + 1}. **${o.name}** — Color: ${o.color}, Style: ${o.style}, Material: ${o.material}${o.notes ? `, Notes: ${o.notes}` : ''}`).join('\n')}

Please provide a detailed analysis:

## 🎨 Design Theme Analysis
Identify the primary design theme(s) present in my collection and explain how the pieces relate.

## ✅ Compatibility Check
Which ornaments work beautifully together? Note any that clash stylistically and why.

## 🌟 Collection Strengths
What does this collection do especially well? What's its standout quality?

## ⚠️ Gaps & Recommendations
What types of ornaments are missing to complete the look? Be specific — include color, style, material, and quantity suggestions.

## 🎄 Arrangement Strategy
How should I arrange these ornaments on the tree for maximum impact? Use clock positions (12 o'clock = top, 3 = right, 6 = bottom, 9 = left) and suggest placement for specific pieces.

## 💡 Pro Styling Tips
3 expert tips to elevate this collection and make the tree look professionally decorated.`

export default function MyOrnaments() {
  const [ornaments, setOrnaments] = useState(() => {
    try { return JSON.parse(localStorage.getItem('deck-my-tree-ornaments')) || [] } catch { return [] }
  })
  const [form, setForm] = useState({ name: '', color: '', style: 'Classic', material: 'Glass', notes: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    localStorage.setItem('deck-my-tree-ornaments', JSON.stringify(ornaments))
  }, [ornaments])

  const addOrnament = () => {
    if (!form.name.trim() || !form.color.trim()) return
    setOrnaments(prev => [...prev, { ...form, id: Date.now() }])
    setForm({ name: '', color: '', style: 'Classic', material: 'Glass', notes: '' })
    setResult('')
  }

  const removeOrnament = (id) => {
    setOrnaments(prev => prev.filter(o => o.id !== id))
    setResult('')
  }

  const handleAnalyze = async () => {
    if (ornaments.length < 2) return
    setLoading(true)
    setResult('')
    setError('')

    try {
      await streamChat({
        messages: [{ role: 'user', content: buildPrompt(ornaments) }],
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

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2><svg width="18" height="22" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', marginBottom: '2px' }}><rect x="7.5" y="0" width="3" height="5.5" rx="1.2" fill="#8a6520"/><circle cx="9" cy="13.5" r="8.5" fill="#c9a84c"/><ellipse cx="6.5" cy="10.5" rx="2" ry="1.4" fill="rgba(255,255,255,0.32)" transform="rotate(-20 6.5 10.5)"/></svg>My Ornaments</h2>
        <p>Tell us about the ornaments you already own, and your stylist will check compatibility, identify your design themes, and suggest what's missing.</p>
      </div>

      <div className="form-card">
        <h3 className="form-card-title">Add an Ornament</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Ornament Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Gold star, Snowman, Red ball set"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addOrnament()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color / Finish *</label>
            <input
              className="form-input"
              placeholder="e.g. Deep red with gold glitter"
              value={form.color}
              onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Style</label>
            <select className="form-select" value={form.style} onChange={(e) => setForm(f => ({ ...f, style: e.target.value }))}>
              {STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Material</label>
            <select className="form-select" value={form.material} onChange={(e) => setForm(f => ({ ...f, material: e.target.value }))}>
              {MATERIALS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group form-group-full">
            <label className="form-label">Notes (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Heirloom from grandma, set of 12, large 4-inch"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <button className="btn-primary btn-full" onClick={addOrnament} disabled={!form.name.trim() || !form.color.trim()}>
          + Add to Collection
        </button>
      </div>

      {ornaments.length > 0 && (
        <div className="collection-section">
          <div className="collection-header">
            <h3>My Collection <span className="badge">{ornaments.length}</span></h3>
            <button className="btn-ghost" onClick={() => { setOrnaments([]); setResult('') }}>Clear all</button>
          </div>
          <div className="ornament-grid">
            {ornaments.map(o => (
              <div key={o.id} className="ornament-card">
                <button className="ornament-remove" onClick={() => removeOrnament(o.id)}>×</button>
                <div className="ornament-name">{o.name}</div>
                <div className="ornament-meta">
                  <span className="ornament-tag ornament-tag-color">{o.color}</span>
                  <span className="ornament-tag ornament-tag-style">{o.style}</span>
                  <span className="ornament-tag ornament-tag-mat">{o.material}</span>
                </div>
                {o.notes && <div className="ornament-notes">{o.notes}</div>}
              </div>
            ))}
          </div>

          {ornaments.length >= 2 && (
            <button className="btn-primary btn-full" onClick={handleAnalyze} disabled={loading}>
              {loading ? <><span className="spin">✦</span> Analyzing…</> : `✨ Analyze My Collection (${ornaments.length} pieces)`}
            </button>
          )}
          {ornaments.length === 1 && (
            <p className="hint-text">Add at least one more ornament to run the compatibility check.</p>
          )}
        </div>
      )}

      {ornaments.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🎄</span>
          <p>Add your ornaments above to get started</p>
        </div>
      )}

      {error && <div className="error-card">⚠️ {error}</div>}

      {(result || loading) && (
        <div className="result-card">
          <div className="result-header">
            <span>🎨 Collection Analysis</span>
            {loading && <span className="streaming-badge">Generating…</span>}
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
