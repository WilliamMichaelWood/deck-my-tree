import { useState, useEffect, useRef, useCallback } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'

const STYLES    = ['Classic', 'Modern', 'Rustic', 'Vintage', 'Whimsical', 'Elegant', 'Scandinavian', 'Handmade']
const MATERIALS = ['Glass', 'Metal', 'Wood', 'Fabric', 'Plastic', 'Ceramic', 'Paper', 'Mixed']
const SHAPES    = ['ball', 'star', 'snowflake', 'drop', 'pinecone']

const BLANK_FORM = { name: '', colorDesc: '', colorHex: '', shape: 'ball', style: 'Classic', material: 'Glass', size: 'medium', notes: '' }

const ANALYZE_PHOTO_PROMPT = `Analyze this Christmas ornament photo. Return ONLY a valid JSON object — no markdown, no explanation:
{
  "name": "concise descriptive name e.g. 'Red Mercury Glass Ball' or 'Gold Glitter Star'",
  "colorDesc": "short color description e.g. 'deep burgundy with gold accents'",
  "colorHex": "#hexcolor matching the ornament's primary color",
  "shape": "ball | star | snowflake | drop | pinecone",
  "material": "Glass | Metal | Wood | Fabric | Plastic | Ceramic | Paper | Mixed",
  "size": "small | medium | large",
  "notes": "one brief phrase e.g. 'matte finish' or 'hand-painted detail'"
}`

const buildPrompt = (ornaments) => `You are a Christmas tree stylist. Give a quick take on this ornament collection — exactly 3 to 4 bullet points, one sentence each, written like you're texting a friend. Be specific: name pieces, call out what works, flag what's missing, suggest one thing to buy.

Collection:
${ornaments.map(o => `• ${o.name} — ${o.colorDesc || o.color || ''}, ${o.material}${o.shape ? `, ${o.shape}` : ''}${o.size ? `, ${o.size}` : ''}`).join('\n')}

Reply with bullet points only — no headers, no long paragraphs, no more than 4 bullets.`

const resizePhoto = (dataUrl, maxPx = 400) => new Promise(resolve => {
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(img.width  * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    resolve(canvas.toDataURL('image/jpeg', 0.75))
  }
  img.src = dataUrl
})

export default function MyOrnaments() {
  const [ornaments,    setOrnaments]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('deck-my-tree-ornaments')) || [] } catch { return [] }
  })
  const [form,         setForm]         = useState(BLANK_FORM)
  const [photo,        setPhoto]        = useState(null)   // resized data URL for current add
  const [editId,       setEditId]       = useState(null)   // id of ornament being edited, or null
  const [analyzing,    setAnalyzing]    = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState('')
  const [error,        setError]        = useState('')

  const cameraRef  = useRef(null)
  const libraryRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('deck-my-tree-ornaments', JSON.stringify(ornaments))
  }, [ornaments])

  const handlePhotoSelect = useCallback(async (file) => {
    if (!file?.type.startsWith('image/')) return
    setAnalyzeError('')
    const reader = new FileReader()
    reader.onloadend = async () => {
      const resized = await resizePhoto(reader.result)
      setPhoto(resized)
      setAnalyzing(true)
      try {
        const base64 = resized.split(',')[1]
        let raw = ''
        await streamChat({
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: ANALYZE_PHOTO_PROMPT },
            ],
          }],
          maxTokens: 300,
          onText: (t) => { raw += t },
        })
        const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
        if (s !== -1 && e !== -1) {
          const d = JSON.parse(raw.slice(s, e + 1))
          setForm(f => ({
            ...f,
            name:      d.name      || f.name,
            colorDesc: d.colorDesc || f.colorDesc,
            colorHex:  d.colorHex  || f.colorHex,
            shape:     SHAPES.includes(d.shape) ? d.shape : f.shape,
            material:  MATERIALS.includes(d.material) ? d.material : f.material,
            size:      d.size      || f.size,
            notes:     d.notes     || f.notes,
          }))
        }
      } catch {
        setAnalyzeError('Could not analyze photo — fill in the details manually.')
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const startEdit = (o) => {
    setEditId(o.id)
    setPhoto(o.photo || null)
    setAnalyzeError('')
    setForm({
      name:      o.name      || '',
      colorDesc: o.colorDesc || o.color || '',
      colorHex:  o.colorHex  || '',
      shape:     o.shape     || 'ball',
      style:     o.style     || 'Classic',
      material:  o.material  || 'Glass',
      size:      o.size      || 'medium',
      notes:     o.notes     || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm(BLANK_FORM)
    setPhoto(null)
    setAnalyzeError('')
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editId) {
      setOrnaments(prev => prev.map(o =>
        o.id === editId ? { ...o, ...form, photo: photo ?? o.photo } : o
      ))
      setEditId(null)
    } else {
      setOrnaments(prev => [...prev, { ...form, photo, id: Date.now() }])
    }
    setForm(BLANK_FORM)
    setPhoto(null)
    setAnalyzeError('')
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
      setError(/load failed|failed to fetch|network/i.test(msg)
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
        <h3 className="form-card-title">{editId ? 'Edit Ornament' : 'Add an Ornament'}</h3>

        {/* Photo capture buttons */}
        <div className="photo-btn-row">
          <button className="btn-photo" onClick={() => cameraRef.current?.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Take Photo
          </button>
          <button className="btn-photo" onClick={() => libraryRef.current?.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Choose from Library
          </button>
        </div>
        <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePhotoSelect(e.target.files[0])} />
        <input ref={libraryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoSelect(e.target.files[0])} />

        {/* Photo preview + analyzing state */}
        {photo && (
          <div className="photo-preview-wrap">
            <img src={photo} alt="Ornament preview" className="photo-preview-img" />
            {analyzing && (
              <div className="photo-analyzing-overlay">
                <span className="spin">✦</span>
                <span>Analyzing ornament…</span>
              </div>
            )}
          </div>
        )}
        {analyzeError && <p className="analyze-error">{analyzeError}</p>}

        {/* Form fields */}
        <div className="form-grid" style={{ marginTop: photo ? '14px' : '0' }}>
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
            <label className="form-label">Color / Finish</label>
            <div className="color-input-wrap">
              {form.colorHex && <span className="color-swatch-inline" style={{ background: form.colorHex }} />}
              <input
                className="form-input"
                placeholder="e.g. Deep red with gold glitter"
                value={form.colorDesc}
                onChange={(e) => setForm(f => ({ ...f, colorDesc: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Shape</label>
            <select className="form-select" value={form.shape} onChange={(e) => setForm(f => ({ ...f, shape: e.target.value }))}>
              {SHAPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
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
          <div className="form-group">
            <label className="form-label">Size</label>
            <select className="form-select" value={form.size} onChange={(e) => setForm(f => ({ ...f, size: e.target.value }))}>
              {['small', 'medium', 'large'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
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
        <div className="form-save-row">
          {editId && (
            <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
          )}
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={!form.name.trim() || analyzing}
          >
            {analyzing ? <><span className="spin">✦</span> Analyzing photo…</> : editId ? 'Save Changes' : '+ Add to Collection'}
          </button>
        </div>
      </div>

      {ornaments.length > 0 && (
        <div className="collection-section">
          <div className="collection-header">
            <h3>My Collection <span className="badge">{ornaments.length}</span></h3>
            <button className="btn-ghost" onClick={() => { setOrnaments([]); setResult('') }}>Clear all</button>
          </div>
          <div className="ornament-grid">
            {ornaments.map(o => (
              <div key={o.id} className={`ornament-card${editId === o.id ? ' editing' : ''}`}>
                <button className="ornament-remove" onClick={() => removeOrnament(o.id)}>×</button>
                <button className="ornament-edit" onClick={() => startEdit(o)}>✎</button>
                {o.photo ? (
                  <img src={o.photo} alt={o.name} className="ornament-photo-thumb" />
                ) : (
                  <div className="ornament-color-dot" style={{ background: o.colorHex || '#c9a84c' }} />
                )}
                <div className="ornament-name">{o.name}</div>
                <div className="ornament-meta">
                  {(o.colorDesc || o.color) && <span className="ornament-tag ornament-tag-color">{o.colorDesc || o.color}</span>}
                  {o.shape    && <span className="ornament-tag ornament-tag-style">{o.shape}</span>}
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
