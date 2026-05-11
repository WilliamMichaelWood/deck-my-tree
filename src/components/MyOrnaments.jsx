import { useState, useEffect, useRef, useCallback } from 'react'
import { streamChat } from '../lib/stream'
import { findOrnamentImage } from '../utils/ornamentImageLookup'
import './MyOrnaments.css'

// ─── Constants ────────────────────────────────────────────────
// Preset ornament types — maps label → internal shape key used by SVG renderer
const ORNAMENT_TYPES = [
  { label: 'Ball',          shape: 'ball'      },
  { label: 'Teardrop',      shape: 'drop'      },
  { label: 'Star',          shape: 'star'      },
  { label: 'Snowflake',     shape: 'snowflake' },
  { label: 'Pinecone',      shape: 'pinecone'  },
  { label: 'Bell',          shape: 'bell'      },
  { label: 'Bow',           shape: 'bow'       },
  { label: 'Icicle',        shape: 'drop'      },
  { label: 'Angel',         shape: 'ball'      },
  { label: 'Santa',         shape: 'ball'      },
  { label: 'Reindeer',      shape: 'ball'      },
  { label: 'Snowman',       shape: 'ball'      },
  { label: 'Gingerbread',   shape: 'ball'      },
  { label: 'Nutcracker',    shape: 'ball'      },
  { label: 'Photo Frame',   shape: 'ball'      },
  { label: 'Other / Custom', shape: 'ball'     },
]
const TYPE_LABELS  = ORNAMENT_TYPES.map(t => t.label)
// Legacy shape list — kept for filter/display but no longer the primary selector
const SHAPES    = ['ball', 'drop', 'star', 'snowflake', 'pinecone']
const MATERIALS = ['Glass', 'Metal', 'Wood', 'Fabric', 'Plastic', 'Ceramic', 'Paper', 'Mixed']
const STYLE_TAGS  = ['Rustic', 'Modern', 'Elegant', 'Whimsical', 'Maximalist', 'Scandinavian']
const BUDGET_TAGS = ['Budget', 'Mid-range', 'Premium']
const BLANK_FORM  = { name: '', colorDesc: '', colorHex: '', typeLabel: 'Ball', customType: '', shape: 'ball', material: 'Glass', size: 'medium', notes: '' }

// Returns the display label for a saved ornament (preset or custom)
function getTypeDisplay(ornament) {
  if (ornament.customType) return ornament.customType
  if (ornament.typeLabel)  return ornament.typeLabel
  if (ornament.type && ornament.type !== 'Topper') return ornament.type
  return null
}

const RETAILER_SEARCH = {
  walmart: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  amazon:  (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  etsy:    (q) => `https://www.etsy.com/search?q=${encodeURIComponent(q)}`,
}
const RETAILER_ORDER = ['walmart', 'amazon', 'etsy']

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

const extractPrice = (priceStr) => {
  if (!priceStr) return null
  const m = String(priceStr).match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

// ─── OrnamentSVG ─────────────────────────────────────────────
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
    default:
      return (
        <svg viewBox="0 0 60 72" width="58" height="58" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="13" rx="3.5" fill="#8a6520"/>
          <circle cx="30" cy="43" r="24" fill={c}/>
          <ellipse cx="21" cy="33" rx="7" ry="5" fill="rgba(255,255,255,0.45)" transform="rotate(-25 21 33)"/>
        </svg>
      )
  }
}

// ─── Empty state illustration (stroke only, no fill) ─────────
function EmptyIllustration() {
  return (
    <svg width="80" height="96" viewBox="0 0 60 80" fill="none" aria-hidden="true">
      <rect x="26" y="1" width="8" height="12" rx="3.5" stroke="#c9a84c" strokeWidth="1.5"/>
      <circle cx="30" cy="51" r="26" stroke="#c9a84c" strokeWidth="1.5"/>
      <ellipse cx="20" cy="39" rx="7" ry="5" stroke="rgba(201,168,76,0.4)" strokeWidth="1" transform="rotate(-25 20 39)"/>
      <ellipse cx="30" cy="51" rx="10" ry="16" stroke="rgba(201,168,76,0.18)" strokeWidth="1"/>
    </svg>
  )
}

// ─── SavedOrnamentImage ───────────────────────────────────────
// Full-bleed image area for Saved cards, with SVG fallback.
function SavedOrnamentImage({ shape, color, style, svgColor }) {
  const [useSvg, setUseSvg] = useState(false)
  const libraryPath = findOrnamentImage({ shape, color, style })

  if (useSvg || !libraryPath) {
    return (
      <div
        className="myo-saved-img-area myo-saved-svg-area"
        style={{ background: `radial-gradient(circle at 40% 35%, ${svgColor}44 0%, ${svgColor}18 60%, #0a1525 100%)` }}
      >
        <OrnamentSVG shape={shape} color={svgColor} />
      </div>
    )
  }

  return (
    <div className="myo-saved-img-area">
      <img
        src={libraryPath}
        alt=""
        className="myo-saved-img"
        loading="lazy"
        onError={() => setUseSvg(true)}
      />
    </div>
  )
}

// ─── OrnamentCard ─────────────────────────────────────────────
function OrnamentCard({ ornament, onEdit }) {
  const color   = ornament.colorHex || ornament.color || '#c9a84c'
  const shape   = ornament.shape || 'ball'
  const isSaved = ornament.source === 'saved'

  const handleShop = (e) => {
    e.stopPropagation()
    const q = buildSearchQuery(ornament)
    for (const key of RETAILER_ORDER) {
      if (ornament.retailers?.[key]?.price && RETAILER_SEARCH[key]) {
        window.open(RETAILER_SEARCH[key](q), '_blank')
        return
      }
    }
    window.open(RETAILER_SEARCH.amazon(q), '_blank')
  }

  // ── Saved card — image-first with text strip below ──
  if (isSaved) {
    const bestPrice = (() => {
      for (const key of RETAILER_ORDER) {
        const p = ornament.retailers?.[key]?.price
        if (p) return p
      }
      return null
    })()

    return (
      <div className="myo-card myo-card--saved" onClick={() => onEdit(ornament)}>
        {ornament.photo
          ? <div className="myo-saved-img-area">
              <img src={ornament.photo} alt={ornament.name} className="myo-saved-img" />
            </div>
          : <SavedOrnamentImage shape={shape} color={color} style={ornament.style} svgColor={color} />
        }
        <div className="myo-saved-info">
          <p className="myo-saved-name">{ornament.name}</p>
          <div className="myo-saved-actions">
            {bestPrice && <span className="myo-saved-price">{bestPrice}</span>}
            <button className="myo-saved-buy-btn" onClick={handleShop}>Deck it. Buy it.</button>
          </div>
        </div>
        <button
          className="myo-card-menu-btn"
          onClick={(e) => { e.stopPropagation(); onEdit(ornament) }}
          aria-label="Edit ornament"
        >
          ···
        </button>
      </div>
    )
  }

  // ── Owned card — overlay layout ──
  return (
    <div className="myo-card" onClick={() => onEdit(ornament)}>
      <div className="myo-card-media">
        {ornament.photo
          ? <img src={ornament.photo} alt={ornament.name} className="myo-card-photo" />
          : (
            <div
              className="myo-card-svg-bg"
              style={{ background: `radial-gradient(circle at 40% 35%, ${color}44 0%, ${color}18 60%, transparent 100%)` }}
            >
              <OrnamentSVG shape={shape} color={color} />
            </div>
          )
        }
        <div className="myo-card-vignette" />
        <span className="myo-card-badge">Owned</span>
        <button
          className="myo-card-menu-btn"
          onClick={(e) => { e.stopPropagation(); onEdit(ornament) }}
          aria-label="Edit ornament"
        >
          ···
        </button>
        <div className="myo-card-footer">
          <span className="myo-card-name">{ornament.name}</span>
        </div>
      </div>
    </div>
  )
}

// ─── AddModal (slide-up) ──────────────────────────────────────
function AddModal({ onClose, onSave }) {
  const [form,       setForm]       = useState(BLANK_FORM)
  const [photo,      setPhoto]      = useState(null)
  const [analyzing,  setAnalyzing]  = useState(false)
  const [analyzeErr, setAnalyzeErr] = useState('')
  const photoInputRef = useRef(null)

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
          // Map AI shape → preset typeLabel
          const detectedType = ORNAMENT_TYPES.find(t => t.shape === d.shape && !['Angel','Santa','Reindeer','Snowman','Gingerbread','Nutcracker','Photo Frame','Other / Custom'].includes(t.label))
          setForm(f => ({
            ...f,
            name:      d.name      || f.name,
            colorDesc: d.colorDesc || f.colorDesc,
            colorHex:  d.colorHex  || f.colorHex,
            typeLabel: detectedType ? detectedType.label : f.typeLabel,
            shape:     detectedType ? detectedType.shape : f.shape,
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
    const isCustom = form.typeLabel === 'Other / Custom'
    onSave({
      ...form,
      customType: isCustom ? form.customType.trim().slice(0, 30) : '',
      photo,
      id: `orn-${Date.now()}`,
      source: 'owned',
      rating: 0,
      tags: [],
      retailers: {},
      dateSaved: Date.now(),
    })
  }

  return (
    <>
      <div className="myo-backdrop" onClick={onClose} />
      <div className="myo-add-modal">
        <div className="myo-drag-handle" />
        <div className="myo-add-modal-scroll">

          {/* Photo capture */}
          <div
            className="myo-photo-tap"
            onClick={() => photoInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && photoInputRef.current?.click()}
          >
            {photo ? (
              <div className="myo-photo-preview">
                <img src={photo} alt="Ornament" className="myo-photo-img" />
                {analyzing && (
                  <div className="myo-analyzing-overlay">
                    <span className="spin">✦</span>
                    <span>Analyzing…</span>
                  </div>
                )}
                <div className="myo-photo-retake">Tap to retake</div>
              </div>
            ) : (
              <div className="myo-photo-empty">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span className="myo-photo-label">Photograph your ornament</span>
                <span className="myo-photo-sub">Tap to open camera or library</span>
              </div>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoSelect(e.target.files[0])}
          />
          {analyzeErr && <p className="myo-analyze-err">{analyzeErr}</p>}

          {/* Name */}
          <div className="myo-field">
            <label className="myo-field-label">Name</label>
            <input
              className="myo-field-input"
              placeholder="e.g. Gold Glitter Star, Red Ball Set"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Type chip grid */}
          <div className="myo-field">
            <label className="myo-field-label">Type</label>
            <div className="myo-type-grid">
              {ORNAMENT_TYPES.map(t => (
                <button
                  key={t.label}
                  className={`myo-type-chip${form.typeLabel === t.label ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, typeLabel: t.label, shape: t.shape, customType: t.label !== 'Other / Custom' ? '' : f.customType }))}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {form.typeLabel === 'Other / Custom' && (
              <input
                className="myo-field-input myo-custom-type-input"
                placeholder="Describe your ornament type (e.g., Vintage Glass, Cowboy Boot)"
                maxLength={30}
                value={form.customType}
                onChange={(e) => setForm(f => ({ ...f, customType: e.target.value }))}
                autoFocus
              />
            )}
          </div>

          {/* Color */}
          <div className="myo-field">
            <label className="myo-field-label">Color / Finish</label>
            <div className="myo-color-row">
              {form.colorHex && (
                <span className="myo-color-dot" style={{ background: form.colorHex }} />
              )}
              <input
                className="myo-field-input"
                placeholder="e.g. Deep burgundy with gold glitter"
                value={form.colorDesc}
                onChange={(e) => setForm(f => ({ ...f, colorDesc: e.target.value }))}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="myo-field">
            <label className="myo-field-label">
              Notes <span className="myo-optional">(optional)</span>
            </label>
            <textarea
              className="myo-field-input myo-field-textarea"
              placeholder="e.g. Set of 6, heirloom piece, large 4-inch"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <button
            className="btn-primary btn-full"
            onClick={handleSave}
            disabled={!form.name.trim() || analyzing}
            style={{ marginTop: 8 }}
          >
            {analyzing
              ? <><span className="spin">✦</span> Analyzing photo…</>
              : 'Add Ornament'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── EditModal ────────────────────────────────────────────────
function EditModal({ ornament, onSave, onClose, onDelete }) {
  const [name,       setName]       = useState(ornament?.name      || '')
  const [notes,      setNotes]      = useState(ornament?.notes     || '')
  const [rating,     setRating]     = useState(ornament?.rating    || 0)
  const [tags,       setTags]       = useState(ornament?.tags      || [])
  const [typeLabel,  setTypeLabel]  = useState(ornament?.typeLabel || (() => {
    // Migrate legacy shape-only ornaments to the nearest preset label
    const match = ORNAMENT_TYPES.find(t => t.shape === (ornament?.shape || 'ball') && !['Angel','Santa','Reindeer','Snowman','Gingerbread','Nutcracker','Photo Frame','Other / Custom'].includes(t.label))
    return match?.label || 'Ball'
  })())
  const [customType, setCustomType] = useState(ornament?.customType || '')
  const [colorDesc,  setColorDesc]  = useState(ornament?.colorDesc || ornament?.color || '')

  const toggleTag = (tag) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const save = () => {
    const isCustom = typeLabel === 'Other / Custom'
    const selectedType = ORNAMENT_TYPES.find(t => t.label === typeLabel) || ORNAMENT_TYPES[0]
    onSave({ ...ornament, name, notes, rating, tags, shape: selectedType.shape, typeLabel, customType: isCustom ? customType.trim().slice(0, 30) : '', colorDesc })
    onClose()
  }

  return (
    <>
      <div className="myo-backdrop" onClick={onClose} />
      <div className="myo-edit-modal">
        <div className="myo-edit-modal-header">
          <h2>Edit Ornament</h2>
          <button className="myo-btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="myo-edit-modal-body">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Color / Description</label>
            <input className="form-input" value={colorDesc} onChange={(e) => setColorDesc(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="myo-type-grid">
              {ORNAMENT_TYPES.map(t => (
                <button
                  key={t.label}
                  className={`myo-type-chip${typeLabel === t.label ? ' selected' : ''}`}
                  onClick={() => { setTypeLabel(t.label); if (t.label !== 'Other / Custom') setCustomType('') }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {typeLabel === 'Other / Custom' && (
              <input
                className="form-input myo-custom-type-input"
                placeholder="Describe your ornament type (e.g., Vintage Glass, Cowboy Boot)"
                maxLength={30}
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                autoFocus
              />
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={notes} rows={3}
              placeholder="e.g. Great for small gaps, set of 6"
              style={{ resize: 'vertical', minHeight: 70, fontFamily: 'inherit' }}
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
        <div className="myo-edit-modal-footer">
          {onDelete && (
            <button className="btn-danger" onClick={() => { onDelete(ornament.id); onClose() }}>Remove</button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save Changes</button>
        </div>
      </div>
    </>
  )
}

// ─── FilterDrawer ─────────────────────────────────────────────
function FilterDrawer({ isOpen, onClose, onFilter, onSort }) {
  const [priceRange,      setPriceRange]      = useState('')
  const [selectedStyles,  setSelectedStyles]  = useState([])
  const [selectedBudgets, setSelectedBudgets] = useState([])
  const [selectedTypes,   setSelectedTypes]   = useState([])
  const [searchTerm,      setSearchTerm]      = useState('')
  const [sortBy,          setSortBy]          = useState('recent')

  const toggle = (list, setList, val) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const apply = () => {
    onFilter({ priceRange, styles: selectedStyles, budgets: selectedBudgets, types: selectedTypes, search: searchTerm })
    onSort(sortBy)
    onClose()
  }

  const reset = () => {
    setPriceRange(''); setSelectedStyles([]); setSelectedBudgets([]); setSelectedTypes([]); setSearchTerm(''); setSortBy('recent')
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
            <label className="myo-filter-label">Type</label>
            <div className="myo-filter-type-grid">
              {TYPE_LABELS.map(l => (
                <button
                  key={l}
                  className={`myo-filter-type-chip${selectedTypes.includes(l) ? ' selected' : ''}`}
                  onClick={() => toggle(selectedTypes, setSelectedTypes, l)}
                >
                  {l}
                </button>
              ))}
            </div>
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
            <label className="myo-filter-label">Sort By</label>
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rating</option>
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

// ─── Main Component ───────────────────────────────────────────
export default function MyOrnaments() {
  const [ornaments,         setOrnaments]   = useState(() => load())
  const [filteredOrnaments, setFiltered]    = useState([])
  const [filters,           setFilters]     = useState({})
  const [sortBy,            setSortBy]      = useState('recent')
  const [filterDrawerOpen,  setFilterDrawer] = useState(false)
  const [editingOrnament,   setEditing]     = useState(null)
  const [addModalOpen,      setAddModal]    = useState(false)
  const [activeTab,         setActiveTab]   = useState('owned')

  useEffect(() => { persist(ornaments) }, [ornaments])

  useEffect(() => {
    let result = [...ornaments]
    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(o =>
        o.name.toLowerCase().includes(term) || o.notes?.toLowerCase().includes(term)
      )
    }
    if (filters.priceRange) {
      result = result.filter(o => {
        const prices = Object.values(o.retailers || {})
          .map(r => extractPrice(r.price)).filter(p => p != null)
        if (!prices.length) return true
        const min = Math.min(...prices)
        if (filters.priceRange === 'Under $10') return min < 10
        if (filters.priceRange === '$10–$20')   return min >= 10 && min < 20
        if (filters.priceRange === '$20–$50')   return min >= 20 && min < 50
        if (filters.priceRange === '$50+')      return min >= 50
        return true
      })
    }
    if (filters.types?.length) {
      result = result.filter(o => {
        const label = getTypeDisplay(o) || ''
        return filters.types.some(ft => {
          if (ft === 'Other / Custom') return !!(o.customType)
          return (o.typeLabel === ft) || (o.type === ft) || label.toLowerCase() === ft.toLowerCase()
        })
      })
    }
    if (filters.styles?.length)  result = result.filter(o => o.tags?.some(t => filters.styles.includes(t)))
    if (filters.budgets?.length) result = result.filter(o => o.tags?.some(t => filters.budgets.includes(t)))

    if      (sortBy === 'rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (sortBy === 'name')   result.sort((a, b) => a.name.localeCompare(b.name))
    else                          result.sort((a, b) => (b.dateSaved || 0) - (a.dateSaved || 0))

    setFiltered(result)
  }, [ornaments, filters, sortBy])

  const handleAdd = (entry) => {
    setOrnaments(prev => [entry, ...prev])
    setAddModal(false)
  }

  const handleDelete = (id) => setOrnaments(prev => prev.filter(o => o.id !== id))

  const handleSaveEdit = (updated) =>
    setOrnaments(prev => prev.map(o => o.id === updated.id ? updated : o))

  // Tab filtering: owned = source 'owned' or missing; saved = source 'saved'
  const tabFiltered = filteredOrnaments.filter(o =>
    activeTab === 'saved' ? o.source === 'saved' : (o.source === 'owned' || !o.source)
  )
  const isEmpty = tabFiltered.length === 0

  return (
    <div className="ornaments-page myo-root">

      {/* ── Hero ── */}
      <section className="ornaments-hero">
        <div className="ornaments-hero-overlay" />
        <div className="ornaments-hero-content">
          <div className="ornaments-hero-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5.5V3M10.5 4h3"/>
              <circle cx="12" cy="13" r="7.5"/>
              <circle cx="10" cy="11.5" r="0.6" fill="currentColor" stroke="none"/>
              <circle cx="14" cy="14.5" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <h1 className="ornaments-hero-title">Your Ornament Vault</h1>
          <p className="ornaments-hero-subtitle">Save ornaments you own or love.<br />Your stylist will design around<br />what inspires you.</p>
          <button className="ornaments-add-btn" onClick={() => setAddModal(true)}>
            <span className="ornaments-add-icon">+</span>
            Add Ornament
          </button>
        </div>
      </section>

      {/* ── Owned / Saved segmented control ── */}
      <div className="myo-seg-wrap">
        <div className="myo-seg">
          <button
            className={`myo-seg-btn${activeTab === 'owned' ? ' active' : ''}`}
            onClick={() => setActiveTab('owned')}
          >Owned</button>
          <button
            className={`myo-seg-btn${activeTab === 'saved' ? ' active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >Saved</button>
        </div>
        {!isEmpty && (
          <button className="myo-filter-btn" onClick={() => setFilterDrawer(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filter &amp; Sort
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {isEmpty ? (
        <div className="myo-empty">
          {/* Open box with sparkles */}
          <svg width="120" height="106" viewBox="0 0 120 106" fill="none" aria-hidden="true">
            {/* Sparkle stars */}
            <path d="M60,4 L61.8,9.8 L67.6,11.6 L61.8,13.4 L60,19.2 L58.2,13.4 L52.4,11.6 L58.2,9.8 Z" fill="#c9a84c"/>
            <path d="M34,9 L35.2,12.6 L38.8,13.8 L35.2,15 L34,18.6 L32.8,15 L29.2,13.8 L32.8,12.6 Z" fill="#c9a84c"/>
            <path d="M86,9 L87.2,12.6 L90.8,13.8 L87.2,15 L86,18.6 L84.8,15 L81.2,13.8 L84.8,12.6 Z" fill="#c9a84c"/>
            <path d="M18,22 L18.8,24.7 L21.5,25.5 L18.8,26.3 L18,29 L17.2,26.3 L14.5,25.5 L17.2,24.7 Z" fill="#c9a84c"/>
            <path d="M102,18 L102.7,20.4 L105.1,21.1 L102.7,21.8 L102,24.2 L101.3,21.8 L98.9,21.1 L101.3,20.4 Z" fill="#c9a84c"/>
            {/* Box body */}
            <rect x="16" y="58" width="88" height="44" rx="2" stroke="#c9a84c" strokeWidth="1.5"/>
            {/* Left flap (open, angled upper-left) */}
            <path d="M16,58 L3,36 L56,33 L60,58" stroke="#c9a84c" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
            {/* Right flap (open, angled upper-right) */}
            <path d="M104,58 L117,36 L64,33 L60,58" stroke="#c9a84c" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
            {/* Center seam between flaps */}
            <line x1="60" y1="33" x2="60" y2="58" stroke="#c9a84c" strokeWidth="1.5"/>
          </svg>
          <p className="myo-empty-title">Your vault is empty</p>
          <p className="myo-empty-sub">Add your first ornament<br/>or save one from a look.</p>
        </div>
      ) : (
        <div className="myo-grid">
          {tabFiltered.map(o => (
            <OrnamentCard key={o.id} ornament={o} onEdit={setEditing} />
          ))}
        </div>
      )}

      {/* ── Modals / drawers ── */}
      {addModalOpen && (
        <AddModal onClose={() => setAddModal(false)} onSave={handleAdd} />
      )}

      {editingOrnament && (
        <EditModal
          ornament={editingOrnament}
          onSave={handleSaveEdit}
          onClose={() => setEditing(null)}
          onDelete={handleDelete}
        />
      )}

      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawer(false)}
        onFilter={setFilters}
        onSort={setSortBy}
      />
    </div>
  )
}
