import { useState, useEffect, useRef, useCallback } from 'react'
import { streamChat } from '../lib/stream'
import './MyOrnaments.css'

// ─── Constants ────────────────────────────────────────────────
const SHAPES    = ['ball', 'star', 'snowflake', 'drop', 'pinecone']
const MATERIALS = ['Glass', 'Metal', 'Wood', 'Fabric', 'Plastic', 'Ceramic', 'Paper', 'Mixed']
const STYLE_TAGS  = ['Rustic', 'Modern', 'Elegant', 'Whimsical', 'Maximalist', 'Scandinavian']
const BUDGET_TAGS = ['Budget', 'Mid-range', 'Premium']
const BLANK_FORM  = { name: '', colorDesc: '', colorHex: '', shape: 'ball', material: 'Glass', size: 'medium', notes: '' }

const RETAILER_SEARCH = {
  walmart:     (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  amazon:      (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  potterybarn: (q) => `https://www.potterybarn.com/search/results.html?words=${encodeURIComponent(q)}`,
}

// Build a rich search query from all available ornament descriptors
function buildSearchQuery(ornament) {
  const parts = [
    ornament.colorDesc || '',
    ornament.material  || '',
    ornament.shape     || '',
    ornament.name      || '',
    'christmas ornament',
  ]
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

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

const persist = (list) => localStorage.setItem('myOrnaments', JSON.stringify(list))
const load    = ()     => { try { return JSON.parse(localStorage.getItem('myOrnaments') || '[]') } catch { return [] } }

// Extract the first number from a price string — handles ranges like "$6–$12" correctly
const extractPrice = (priceStr) => {
  if (!priceStr) return null
  const m = String(priceStr).match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

// ─── Ornament SVG shapes ─────────────────────────────────────
function OrnamentSVG({ shape, color }) {
  const c = color || '#c9a84c'
  switch (shape) {
    case 'drop':
      return (
        <svg viewBox="0 0 60 84" width="52" height="64" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="13" rx="3.5" fill="#8a6520"/>
          <path d="M30,13 C18,13 7,27 7,45 C7,62 17,76 30,76 C43,76 53,62 53,45 C53,27 42,13 30,13 Z" fill={c}/>
          <ellipse cx="21" cy="32" rx="6" ry="10" fill="rgba(255,255,255,0.44)" transform="rotate(-15 21 32)"/>
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 60 74" width="58" height="58" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="14" rx="3.5" fill="#8a6520"/>
          <polygon points="30,28 35,42 49,42 38,51 42,64 30,56 18,64 22,51 11,42 25,42" fill={c}/>
          <ellipse cx="23" cy="37" rx="4" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-30 23 37)"/>
        </svg>
      )
    case 'snowflake':
      return (
        <svg viewBox="0 0 60 60" width="58" height="58" fill="none" aria-hidden="true">
          <g stroke={c} strokeWidth="4.5" strokeLinecap="round">
            <line x1="30" y1="6"  x2="30" y2="54"/>
            <line x1="7"  y1="19" x2="53" y2="41"/>
            <line x1="53" y1="19" x2="7"  y2="41"/>
            <line x1="23" y1="17" x2="37" y2="17"/>
            <line x1="23" y1="43" x2="37" y2="43"/>
            <line x1="12" y1="27" x2="18" y2="37"/>
            <line x1="48" y1="27" x2="42" y2="37"/>
            <line x1="12" y1="33" x2="18" y2="23"/>
            <line x1="48" y1="33" x2="42" y2="23"/>
          </g>
        </svg>
      )
    case 'pinecone':
      return (
        <svg viewBox="0 0 60 80" width="48" height="64" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="11" rx="3.5" fill="#8a6520"/>
          <ellipse cx="30" cy="50" rx="18" ry="26" fill={c}/>
          <ellipse cx="30" cy="32" rx="12" ry="8"  fill={c}/>
          <line x1="30" y1="20" x2="30" y2="74" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5"/>
          <line x1="14" y1="36" x2="46" y2="36" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2"/>
          <line x1="12" y1="46" x2="48" y2="46" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2"/>
          <line x1="14" y1="56" x2="46" y2="56" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2"/>
          <line x1="18" y1="66" x2="42" y2="66" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2"/>
          <ellipse cx="22" cy="34" rx="4" ry="2.5" fill="rgba(255,255,255,0.28)" transform="rotate(-20 22 34)"/>
        </svg>
      )
    default: // ball
      return (
        <svg viewBox="0 0 60 72" width="58" height="58" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="13" rx="3.5" fill="#8a6520"/>
          <circle cx="30" cy="43" r="24" fill={c}/>
          <ellipse cx="21" cy="33" rx="7" ry="5" fill="rgba(255,255,255,0.45)" transform="rotate(-25 21 33)"/>
        </svg>
      )
  }
}

// ─── Sub-components ──────────────────────────────────────────
function OrnamentIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', marginBottom: '2px' }}>
      <rect x="7.5" y="0" width="3" height="5.5" rx="1.2" fill="#8a6520"/>
      <circle cx="9" cy="13.5" r="8.5" fill="#c9a84c"/>
      <ellipse cx="6.5" cy="10.5" rx="2" ry="1.4" fill="rgba(255,255,255,0.32)" transform="rotate(-20 6.5 10.5)"/>
    </svg>
  )
}

function OrnamentCard({ ornament, onDelete, onEdit }) {
  const thumbColor = ornament.colorHex || ornament.color || '#c9a84c'
  const shape = ornament.shape || 'ball'

  const bestPrice = ornament.retailers
    ? Object.values(ornament.retailers)
        .map(r => extractPrice(r.price))
        .filter(p => p != null)
        .sort((a, b) => a - b)[0]
    : null

  const handleDeckIt = () => {
    const q = buildSearchQuery(ornament)
    const RETAILER_ORDER = ['walmart', 'amazon', 'potterybarn']
    for (const key of RETAILER_ORDER) {
      const entry = ornament.retailers?.[key]
      if (entry?.price && RETAILER_SEARCH[key]) {
        window.open(RETAILER_SEARCH[key](q), '_blank')
        return
      }
    }
    window.open(RETAILER_SEARCH.amazon(q), '_blank')
  }

  return (
    <div className="myo-card">
      <div className="myo-card-image">
        {ornament.photo
          ? <img src={ornament.photo} alt={ornament.name} className="myo-card-thumb-photo" />
          : (
            <div className="myo-card-thumb-svg">
              <OrnamentSVG shape={shape} color={thumbColor} />
            </div>
          )
        }
        {ornament.rating > 0 && (
          <div className="myo-card-rating">{'★'.repeat(ornament.rating)}</div>
        )}
      </div>

      <div className="myo-card-body">
        <h3 className="myo-card-name">{ornament.name}</h3>

        <div className="myo-card-tags">
          {ornament.shape    && <span className="myo-tag myo-tag-shape">{ornament.shape}</span>}
          {ornament.material && <span className="myo-tag myo-tag-mat">{ornament.material}</span>}
          {ornament.tags?.slice(0, 2).map(t => <span key={t} className="myo-tag myo-tag-label">{t}</span>)}
        </div>

        {bestPrice != null && (
          <p className="myo-best-price">From <strong>${bestPrice}</strong></p>
        )}
        {ornament.notes && <p className="myo-card-notes">{ornament.notes}</p>}

        <div className="myo-card-actions">
          <button className="myo-deck-it" onClick={handleDeckIt}>Shop Similar</button>
          <button className="myo-btn-edit" onClick={() => onEdit(ornament)} title="Edit">✎</button>
          <button className="myo-btn-delete" onClick={() => onDelete(ornament.id)} title="Delete">✕</button>
        </div>
      </div>
    </div>
  )
}

function FilterDrawer({ isOpen, onClose, onFilter, onSort }) {
  const [priceRange,        setPriceRange]        = useState('')
  const [selectedStyles,    setSelectedStyles]    = useState([])
  const [selectedBudgets,   setSelectedBudgets]   = useState([])
  const [searchTerm,        setSearchTerm]        = useState('')
  const [sortBy,            setSortBy]            = useState('recent')

  const toggle = (list, setList, val) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const apply = () => {
    onFilter({ priceRange, styles: selectedStyles, budgets: selectedBudgets, search: searchTerm })
    onSort(sortBy)
    onClose()
  }

  const reset = () => {
    setPriceRange(''); setSelectedStyles([]); setSelectedBudgets([]); setSearchTerm(''); setSortBy('recent')
    onFilter({}); onSort('recent')
  }

  return (
    <>
      {isOpen && <div className="myo-overlay" onClick={onClose} />}
      <div className={`myo-drawer${isOpen ? ' open' : ''}`}>
        <div className="myo-drawer-header">
          <h3>Filter &amp; Sort</h3>
          <button className="myo-btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="myo-drawer-body">
          <div className="myo-filter-section">
            <label className="myo-filter-label">Search</label>
            <input className="form-input" placeholder="Name, color, note…" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="myo-filter-section">
            <label className="myo-filter-label">Price Range</label>
            {['Under $10', '$10–$20', '$20–$50', '$50+'].map(r => (
              <label key={r} className="myo-check">
                <input type="radio" name="price" value={r} checked={priceRange === r}
                  onChange={(e) => setPriceRange(e.target.value)} />
                {r}
              </label>
            ))}
          </div>

          <div className="myo-filter-section">
            <label className="myo-filter-label">Style</label>
            {STYLE_TAGS.map(s => (
              <label key={s} className="myo-check">
                <input type="checkbox" checked={selectedStyles.includes(s)}
                  onChange={() => toggle(selectedStyles, setSelectedStyles, s)} />
                {s}
              </label>
            ))}
          </div>

          <div className="myo-filter-section">
            <label className="myo-filter-label">Budget</label>
            {BUDGET_TAGS.map(b => (
              <label key={b} className="myo-check">
                <input type="checkbox" checked={selectedBudgets.includes(b)}
                  onChange={() => toggle(selectedBudgets, setSelectedBudgets, b)} />
                {b}
              </label>
            ))}
          </div>

          <div className="myo-filter-section">
            <label className="myo-filter-label">Sort By</label>
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rating</option>
              <option value="price-low">Lowest Price</option>
              <option value="price-high">Highest Price</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        <div className="myo-drawer-footer">
          <button className="btn-secondary" onClick={reset}>Reset</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={apply}>Apply</button>
        </div>
      </div>
    </>
  )
}

function EditModal({ ornament, onSave, onClose }) {
  const [name,    setName]    = useState(ornament?.name     || '')
  const [notes,   setNotes]   = useState(ornament?.notes    || '')
  const [rating,  setRating]  = useState(ornament?.rating   || 0)
  const [tags,    setTags]    = useState(ornament?.tags      || [])
  const [shape,   setShape]   = useState(ornament?.shape    || 'ball')
  const [colorDesc, setColorDesc] = useState(ornament?.colorDesc || ornament?.color || '')

  const toggleTag = (tag) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const save = () => {
    onSave({ ...ornament, name, notes, rating, tags, shape, colorDesc })
    onClose()
  }

  return (
    <>
      <div className="myo-modal-overlay" onClick={onClose} />
      <div className="myo-modal">
        <div className="myo-modal-header">
          <h2>Edit Ornament</h2>
          <button className="myo-btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="myo-modal-body">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Color / Description</label>
            <input className="form-input" value={colorDesc} onChange={(e) => setColorDesc(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Shape</label>
            <select className="form-select" value={shape} onChange={(e) => setShape(e.target.value)}>
              {SHAPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input myo-textarea" value={notes} rows={3}
              placeholder="e.g. Great for small gaps, set of 6"
              onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Rating</label>
            <div className="myo-rating-row">
              {[1,2,3,4,5].map(r => (
                <button key={r} className={`myo-star${rating >= r ? ' active' : ''}`} onClick={() => setRating(r)}>★</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <div className="myo-tag-grid">
              {[...STYLE_TAGS, ...BUDGET_TAGS].map(t => (
                <button key={t} className={`myo-tag-btn${tags.includes(t) ? ' selected' : ''}`} onClick={() => toggleTag(t)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="myo-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save Changes</button>
        </div>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function MyOrnaments() {
  const [ornaments,       setOrnaments]       = useState(() => load())
  const [filteredOrnaments, setFiltered]      = useState([])
  const [filters,         setFilters]         = useState({})
  const [sortBy,          setSortBy]          = useState('recent')
  const [filterDrawerOpen, setFilterDrawer]   = useState(false)
  const [editingOrnament, setEditing]         = useState(null)

  // Add form state
  const [form,        setForm]        = useState(BLANK_FORM)
  const [photo,       setPhoto]       = useState(null)
  const [analyzing,   setAnalyzing]   = useState(false)
  const [analyzeErr,  setAnalyzeErr]  = useState('')

  const cameraRef  = useRef(null)
  const libraryRef = useRef(null)

  // Persist on change
  useEffect(() => { persist(ornaments) }, [ornaments])

  // Filter + sort
  useEffect(() => {
    let result = [...ornaments]

    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(o => o.name.toLowerCase().includes(term) || o.notes?.toLowerCase().includes(term))
    }
    if (filters.priceRange) {
      result = result.filter(o => {
        const prices = Object.values(o.retailers || {})
          .map(r => extractPrice(r.price)).filter(p => p != null)
        if (!prices.length) return true
        const min = Math.min(...prices)
        if (filters.priceRange === 'Under $10')  return min < 10
        if (filters.priceRange === '$10–$20')    return min >= 10 && min < 20
        if (filters.priceRange === '$20–$50')    return min >= 20 && min < 50
        if (filters.priceRange === '$50+')       return min >= 50
        return true
      })
    }
    if (filters.styles?.length)  result = result.filter(o => o.tags?.some(t => filters.styles.includes(t)))
    if (filters.budgets?.length) result = result.filter(o => o.tags?.some(t => filters.budgets.includes(t)))

    if (sortBy === 'rating')     result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (sortBy === 'name')  result.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'price-low' || sortBy === 'price-high') {
      result.sort((a, b) => {
        const price = (o) => {
          const vals = Object.values(o.retailers || {}).map(r => extractPrice(r.price)).filter(p => p != null)
          return vals.length ? (sortBy === 'price-low' ? Math.min(...vals) : Math.max(...vals)) : (sortBy === 'price-low' ? 9999 : 0)
        }
        return sortBy === 'price-low' ? price(a) - price(b) : price(b) - price(a)
      })
    } else result.sort((a, b) => (b.dateSaved || 0) - (a.dateSaved || 0))

    setFiltered(result)
  }, [ornaments, filters, sortBy])

  // Photo capture + AI analysis
  const handlePhotoSelect = useCallback(async (file) => {
    if (!file?.type.startsWith('image/')) return
    setAnalyzeErr('')
    const reader = new FileReader()
    reader.onloadend = async () => {
      const resized = await resizePhoto(reader.result)
      setPhoto(resized)
      setAnalyzing(true)
      try {
        let raw = ''
        await streamChat({
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: resized.split(',')[1] } },
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
      } catch { setAnalyzeErr('Could not analyze photo — fill in the details manually.') }
      finally  { setAnalyzing(false) }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleSave = () => {
    if (!form.name.trim()) return
    const entry = { ...form, photo, id: `orn-${Date.now()}`, rating: 0, tags: [], retailers: {}, dateSaved: Date.now() }
    setOrnaments(prev => [entry, ...prev])
    setForm(BLANK_FORM)
    setPhoto(null)
    setAnalyzeErr('')
  }

  const handleDelete = (id) => setOrnaments(prev => prev.filter(o => o.id !== id))

  const handleSaveEdit = (updated) =>
    setOrnaments(prev => prev.map(o => o.id === updated.id ? updated : o))

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2><OrnamentIcon />My Ornaments</h2>
        <p>Photograph your ornaments to build a personal library — then filter, sort, and shop smarter.</p>
      </div>

      {/* ── Add form ── */}
      <div className="form-card">
        <h3 className="form-card-title">Add an Ornament</h3>

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
        <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={(e) => handlePhotoSelect(e.target.files[0])} />
        <input ref={libraryRef} type="file" accept="image/*" style={{ display:'none' }} onChange={(e) => handlePhotoSelect(e.target.files[0])} />

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
        {analyzeErr && <p className="analyze-error">{analyzeErr}</p>}

        <div className="form-grid" style={{ marginTop: photo ? '14px' : '0' }}>
          <div className="form-group">
            <label className="form-label">Ornament Name *</label>
            <input className="form-input" placeholder="e.g. Gold Glitter Star, Red Ball Set"
              value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Color / Finish</label>
            <div className="color-input-wrap">
              {form.colorHex && <span className="color-swatch-inline" style={{ background: form.colorHex }} />}
              <input className="form-input" placeholder="e.g. Deep red with gold glitter"
                value={form.colorDesc} onChange={(e) => setForm(f => ({ ...f, colorDesc: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Shape</label>
            <select className="form-select" value={form.shape} onChange={(e) => setForm(f => ({ ...f, shape: e.target.value }))}>
              {SHAPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
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
              {['small','medium','large'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group form-group-full">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" placeholder="e.g. Set of 12, heirloom, large 4-inch"
              value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <button className="btn-primary btn-full" onClick={handleSave} disabled={!form.name.trim() || analyzing}>
          {analyzing ? <><span className="spin">✦</span> Analyzing photo…</> : '+ Add to Collection'}
        </button>
      </div>

      {/* ── Library ── */}
      {ornaments.length > 0 && (
        <>
          <div className="myo-library-controls">
            <button className="btn-secondary" onClick={() => setFilterDrawer(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filter &amp; Sort
            </button>
            <span className="myo-count">{filteredOrnaments.length} of {ornaments.length}</span>
          </div>

          <div className="myo-grid">
            {filteredOrnaments.map(o => (
              <OrnamentCard key={o.id} ornament={o} onDelete={handleDelete} onEdit={setEditing} />
            ))}
          </div>
        </>
      )}

      {ornaments.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🎄</span>
          <p>No ornaments saved yet.</p>
          <p style={{ fontSize: '0.82rem', marginTop: 6 }}>Photograph yours above, or tap <strong>Save to My Ornaments</strong> on any shopping card.</p>
        </div>
      )}

      <FilterDrawer isOpen={filterDrawerOpen} onClose={() => setFilterDrawer(false)}
        onFilter={setFilters} onSort={setSortBy} />

      {editingOrnament && (
        <EditModal ornament={editingOrnament} onSave={handleSaveEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
