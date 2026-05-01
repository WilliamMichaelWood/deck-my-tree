import { useState, useEffect, useRef, useMemo } from 'react'
import { streamChat } from '../lib/stream'
import CurationModal from './CurationModal'
import SleighTheLookTree from './SleighTheLookTree'
import SparkleIcon from './icons/SparkleIcon'
import smallLayout from '../data/treeLayouts/small_layout.json'
import largeLayout from '../data/treeLayouts/large_layout.json'
import xlargeLayout from '../data/treeLayouts/xlarge_layout.json'
import treeConfigsData from '../data/treeConfigs.json'
import { generateStyleLayout } from '../utils/generateStyleLayout'
import { curatedCollections } from '../data/curatedCollections'

// Phase 1: medium uses the dynamic generator; other sizes still use frozen layouts
const TREE_LAYOUTS = { small: smallLayout, large: largeLayout, xlarge: xlargeLayout }
const TREE_APEX = { small: { x: 49.5, y: 29.0 }, medium: { x: 50.2, y: 6.0 }, large: { x: 50.4, y: 5.4 }, xlarge: { x: 48.7, y: 2.8 } }

const TREE_STYLES = [
  { id: 'classic',      label: 'Classic'      },
  { id: 'modern',       label: 'Modern'       },
  { id: 'rustic',       label: 'Rustic'       },
  { id: 'whimsical',    label: 'Whimsical'    },
  { id: 'elegant',      label: 'Elegant'      },
  { id: 'scandinavian', label: 'Scandinavian' },
  { id: 'coastal',      label: 'Coastal'      },
  { id: 'maximalist',   label: 'Maximalist'   },
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
  { key: 'etsy',    label: 'Etsy',    color: '#F1641E' },
]

// ─── Static ornament position templates (x/y as % of image) ─────
// Hand-tuned for the specific tree photo in public/trees/.
// x/y mark ornament center. size is container width as fraction (0–1).
// All four sizes use the same photo for now — same coords, same template.

function getSizeKey(size = '') {
  const s = size.toLowerCase()
  if (s.includes('tabletop') || (s.includes('small') && !s.includes('large'))) return 'small'
  if (s.includes('xl') || s.includes('10ft')) return 'xlarge'
  if (s.includes('large') || s.includes('8') || s.includes('9')) return 'large'
  return 'medium'
}

const buildPrompt = ({ style, palette, budget, size, extraContext }) =>
  `You are a professional Christmas decorator. Create a curated ornament shopping list and topper recommendation.

MANDATORY ORNAMENT TYPE DISTRIBUTION — return exactly these counts, in this order:
1. Ball ornaments (Type 1): 5 items — the backbone. Vary finish across the 5: one each of matte, satin, glitter, mercury glass, velvet/fabric. No two identical finishes.
2. Textural objects (Type 2): 2 items — wood, rope, woven, felt, burlap, or fabric. Must feel tactile, not shiny.
3. Statement shapes (Type 3): 2 items — stars, animals, sculptural, novelty. Bold and specific, not generic.
4. Reflective accents (Type 4): 2 items — metallics, glitter glass, mirror finish, or mercury glass. These are your sparkle layer.
5. Wildcard (Type 5): 1 item — one unexpected element that makes this tree memorable. Surprise the client.
Total: exactly 12 ornament items. Deviation from these counts is an error.

Output ONLY a valid JSON object — no markdown, no explanation, no code fences:

{"ornaments":[EXACTLY 12 ITEMS],"topper":{"name":"Specific searchable topper product name","label":"Short label","type":"star|angel|bow|lantern|monogram","color":"#hexcolor","walmart":{"price":"$X–$XX"},"amazon":{"price":"$X–$XX"},"etsy":{"price":"$X–$XX"}}}

Each ornament must use exactly this structure:
{"name":"Specific searchable product name","description":"One vivid sentence","type":"ball|textural|statement|reflective|wildcard","shape":"ball|drop|star|snowflake|pinecone","color":"#hexcolor","quantity":"X pieces","whyPerfect":"One sentence why","walmart":{"price":"$X–$XX"},"amazon":{"price":"$X–$XX"},"etsy":{"price":"$X–$XX"}}

Field rules:
- type: exactly one of ball, textural, statement, reflective, wildcard
- shape: exactly one of ball, drop, star, snowflake, pinecone — match the actual ornament shape
- color: hex color matching the ornament's primary color
- topper type: choose based on style — elegant/classic → star or angel, rustic → lantern or bow, whimsical → bow, modern → geometric star

Tree Style:    ${style}
Color Palette: ${palette}
Budget:        ${budget}
Tree Size:     ${size}
${extraContext ? `Notes: ${extraContext}` : ''}

Return exactly 12 ornaments in type order plus one topper. Output only the JSON object.`

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
      <polygon points="30,28 35,42 49,42 38,51 42,64 30,56 18,64 22,51 11,42 25,42" fill={color}/>
      <ellipse cx="23" cy="37" rx="4" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-30 23 37)"/>
    </svg>
  )
}

function SnowflakeOrnament({ color }) {
  return (
    <svg width="100%" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
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
}

function PineconeOrnament({ color }) {
  const brown = color || '#7a4a22'
  return (
    <svg width="100%" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="0" width="8" height="12" rx="3" fill="#c9a84c"/>
      <ellipse cx="30" cy="48" rx="18" ry="28" fill={brown}/>
      <path d="M13,62 Q30,54 47,62" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M14,52 Q30,44 46,52" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M15,42 Q30,34 45,42" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M17,32 Q30,24 43,32" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M20,22 Q30,15 40,22" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none"/>
      <ellipse cx="21" cy="36" rx="5" ry="4" fill="rgba(255,255,255,0.12)" transform="rotate(-10 21 36)"/>
    </svg>
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

function getOrnamentShape(name = '') {
  const n = name.toLowerCase()
  if (n.includes('snowflake'))                          return 'snowflake'
  if (n.includes('star'))                               return 'star'
  if (n.includes('pinecone') || n.includes('pine cone')) return 'pinecone'
  if (n.includes('drop') || n.includes('teardrop'))     return 'drop'
  return 'ball'
}

function buildQuery(name, shape, description) {
  // name from the AI is already rich ("Gold Mercury Glass Ball Ornament Set of 6")
  // shape adds clarity when not already in the name; description is skipped (too long)
  const parts = [name, shape && !name.toLowerCase().includes(shape) ? shape : '']
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() + ' christmas ornament'
}

function getSearchUrl(retailer, name, shape, description) {
  if (!name) return null
  const q = encodeURIComponent(buildQuery(name, shape, description))
  if (retailer === 'walmart') return `https://www.walmart.com/search?q=${q}`
  if (retailer === 'amazon')  return `https://www.amazon.com/s?k=${q}`
if (retailer === 'etsy')    return `https://www.etsy.com/search?q=${q}`
  return null
}

function OrnamentSVG({ shape, color }) {
  switch (shape) {
    case 'drop':
      return (
        <svg viewBox="0 0 60 84" width="100%" height="100%" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="13" rx="3.5" fill="#c9a84c"/>
          <path d="M30,13 C18,13 7,27 7,45 C7,62 17,76 30,76 C43,76 53,62 53,45 C53,27 42,13 30,13 Z" fill={color}/>
          <ellipse cx="21" cy="32" rx="6" ry="10" fill="rgba(255,255,255,0.44)" transform="rotate(-15 21 32)"/>
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 60 74" width="100%" height="100%" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="14" rx="3.5" fill="#c9a84c"/>
          <polygon points="30,28 35,42 49,42 38,51 42,64 30,56 18,64 22,51 11,42 25,42" fill={color}/>
          <ellipse cx="23" cy="37" rx="4" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-30 23 37)"/>
        </svg>
      )
    case 'snowflake':
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" aria-hidden="true">
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
        <svg viewBox="0 0 60 80" width="100%" height="100%" fill="none" aria-hidden="true">
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
        <svg viewBox="0 0 60 74" width="100%" height="100%" fill="none" aria-hidden="true">
          <rect x="26" y="0" width="8" height="14" rx="3.5" fill="#c9a84c"/>
          <circle cx="30" cy="46" r="26" fill={color}/>
          <ellipse cx="21" cy="35" rx="8" ry="6" fill="rgba(255,255,255,0.48)" transform="rotate(-20 21 35)"/>
        </svg>
      )
  }
}

function TopperSVG({ type, color }) {
  const c = color || '#c9a84c'
  if (type === 'angel') return (
    <svg viewBox="0 0 40 48" width="40" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="8" rx="6" ry="6" fill={c}/>
      <ellipse cx="20" cy="8" rx="4" ry="4" fill="rgba(255,255,255,0.25)"/>
      <path d="M12,14 Q6,20 8,32 L32,32 Q34,20 28,14 Z" fill={c}/>
      <path d="M8,32 Q4,36 6,42 L34,42 Q36,36 32,32 Z" fill={c} opacity="0.7"/>
      <path d="M12,16 Q4,12 2,22 Q8,20 12,26 Z" fill={c} opacity="0.5"/>
      <path d="M28,16 Q36,12 38,22 Q32,20 28,26 Z" fill={c} opacity="0.5"/>
    </svg>
  )
  if (type === 'bow') return (
    <svg viewBox="0 0 48 32" width="48" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24,16 Q16,4 4,6 Q8,16 4,26 Q16,28 24,16 Z" fill={c}/>
      <path d="M24,16 Q32,4 44,6 Q40,16 44,26 Q32,28 24,16 Z" fill={c}/>
      <ellipse cx="24" cy="16" rx="5" ry="5" fill={c}/>
      <ellipse cx="24" cy="16" rx="3" ry="3" fill="rgba(255,255,255,0.3)"/>
    </svg>
  )
  if (type === 'lantern') return (
    <svg viewBox="0 0 32 44" width="32" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="13" y="0" width="6" height="8" rx="2" fill={c}/>
      <rect x="8"  y="8" width="16" height="4" rx="2" fill={c}/>
      <rect x="10" y="12" width="12" height="22" rx="4" fill="none" stroke={c} strokeWidth="2"/>
      <line x1="10" y1="23" x2="22" y2="23" stroke={c} strokeWidth="1.5" opacity="0.5"/>
      <ellipse cx="16" cy="23" rx="3" ry="3" fill={c} opacity="0.6"/>
      <rect x="8" y="34" width="16" height="4" rx="2" fill={c}/>
    </svg>
  )
  // Default: star
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12,2 L14.9,9.5 L22.5,9.5 L16.6,14.5 L18.9,22 L12,17.5 L5.1,22 L7.4,14.5 L1.5,9.5 L9.1,9.5 Z" fill={c}/>
    </svg>
  )
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

function ProductCard({ retailer, price, ornamentName, ornamentShape, ornamentDescription }) {
  const r = RETAILERS.find(x => x.key === retailer)
  const url = getSearchUrl(retailer, ornamentName, ornamentShape, ornamentDescription)
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-retailer">
      <div className="retailer-top">
        <span className="retailer-dot" style={{ background: r.color }} />
        <span className="retailer-name" style={{ color: r.color }}>{r.label}</span>
        {price && <span className="retailer-price">{price}</span>}
      </div>
      <span className="deck-it-cta">Deck it. Buy it.</span>
    </a>
  )
}

function OrnamentTypeIcon({ shape, size = 28 }) {
  const s = String(shape || 'ball').toLowerCase()
  const stroke = '#c9a84c'
  const sw = 1.5
  if (s === 'drop') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="12" y="1" width="4" height="5" rx="2" fill={stroke}/>
      <path d="M14 6 C8 6 5 13 5 18 a9 9 0 0 0 18 0 C23 13 20 6 14 6Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  )
  if (s === 'star') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <polygon points="14,3 17,10 25,10 19,15 21,23 14,18 7,23 9,15 3,10 11,10" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  )
  if (s === 'snowflake') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <g stroke={stroke} strokeWidth={sw} strokeLinecap="round">
        <line x1="14" y1="3"  x2="14" y2="25"/>
        <line x1="4"  y1="9"  x2="24" y2="19"/>
        <line x1="24" y1="9"  x2="4"  y2="19"/>
      </g>
      <circle cx="14" cy="14" r="2" fill={stroke}/>
    </svg>
  )
  if (s === 'pinecone') return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="12" y="1" width="4" height="5" rx="2" fill={stroke}/>
      <ellipse cx="14" cy="19" rx="7" ry="9" stroke={stroke} strokeWidth={sw}/>
      <line x1="7" y1="15" x2="21" y2="15" stroke={stroke} strokeWidth="1" opacity="0.5"/>
      <line x1="8" y1="19" x2="20" y2="19" stroke={stroke} strokeWidth="1" opacity="0.5"/>
      <line x1="9" y1="23" x2="19" y2="23" stroke={stroke} strokeWidth="1" opacity="0.5"/>
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="12" y="1" width="4" height="5" rx="2" fill={stroke}/>
      <circle cx="14" cy="20" r="9" stroke={stroke} strokeWidth={sw}/>
    </svg>
  )
}

function RecommendationCard({ item, index }) {
  const shape = item.shape || getOrnamentShape(item.name)
  return (
    <div className="ornament-shop-card">
      <div className="shop-card-top">
        <div className="shop-ornament-preview">
          <OrnamentShape shape={shape} color={item.color || '#c9a84c'} />
        </div>
        <div className="shop-card-info">
          <span className="shop-card-num">{String(index + 1).padStart(2, '0')}</span>
          <h4 className="shop-card-name">{item.label || item.name}</h4>
          <p className="shop-card-fullname">{item.name}</p>
        </div>
      </div>
      <div className="shop-card-retailers">
        {RETAILERS.map(r => (
          <ProductCard
            key={r.key}
            retailer={r.key}
            price={item[r.key]?.price}
            ornamentName={item.name}
            ornamentShape={shape}
            ornamentDescription={item.description}
          />
        ))}
      </div>
    </div>
  )
}

function StylePreview({ products, topper, size, palette }) {
  const sizeKey = getSizeKey(size)
  const apex    = TREE_APEX[sizeKey]

  // Phase 1 — hardcoded to Gilded Ever After for medium tree.
  // Regenerates when styleId or palette changes; stable otherwise.
  const styleId = 'gilded-ever-after'
  const generatedLayout = useMemo(
    () => generateStyleLayout(styleId, treeConfigsData.medium, palette),
    [styleId, palette]
  )

  const layout = sizeKey === 'medium'
    ? generatedLayout
    : TREE_LAYOUTS[sizeKey]

  // Medium: generator bakes in colors — don't pass colors prop
  // Other sizes: pass product palette so they still reflect AI recommendations
  const productColors = sizeKey !== 'medium'
    ? products.map(p => p.color).filter(Boolean)
    : []

  return (
    <div className="ornament-shop-section style-preview-section">
      <h3 className="shop-section-header"><SparkleIcon size={20} /> Your Style Preview</h3>
      <p className="preview-caption">Here's how your selections come together. Make it yours below.</p>
      <div className="style-preview-shell">
        <div className="style-preview-wrap">
          <SleighTheLookTree
            layout={layout}
            imageSrc={`/trees/tree-${sizeKey}.jpg`}
            colors={productColors}
          />
          {topper && (
            <div
              className="preview-topper"
              style={{ left: `${apex.x}%`, top: `${apex.y}%` }}
            >
              <TopperSVG type={topper.type || 'star'} color={topper.color || '#c9a84c'} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CuratedCollections() {
  return (
    <div className="curated-section">
      <div className="curated-header">
        <h2><SparkleIcon size={18} /> Curated Collections</h2>
      </div>
      <p className="curated-subhead">Designer-styled trees, ready to shop</p>

      <div className="curated-card-row">
        {curatedCollections.map(col => (
          <div key={col.id} className="curated-card">
            <div className="curated-card-hero">
              <span className="curated-card-hero-label">{col.name}</span>
            </div>
            <div className="curated-card-body">
              <p className="curated-card-name">{col.name}</p>
              <p className="curated-card-author">Curated by {col.author}</p>
              <p className="curated-card-price">
                {col.bundlePriceRange ?? 'Complete the look — coming soon'}
              </p>
              <div className="curated-card-cta">
                <button
                  className="btn-primary btn-full"
                  onClick={() => console.log('See the Look:', col.id)}
                >
                  See the Look
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr className="curated-divider" />
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
  const [topper,       setTopper]       = useState(null)
  const [error,        setError]        = useState('')

  const resultsRef = useRef(null)
  const canGenerate = style && palette && budget && size

  useEffect(() => {
    if (!rawResult || loading) return
    try {
      const cleaned = rawResult.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
      // Try object format first: {"ornaments":[...],"topper":{...}}
      const objStart = cleaned.indexOf('{')
      const objEnd   = cleaned.lastIndexOf('}')
      if (objStart !== -1 && objEnd !== -1) {
        const parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1))
        if (Array.isArray(parsed.ornaments) && parsed.ornaments.length > 0) {
          setProducts(parsed.ornaments)
          setTopper(parsed.topper || null)
          return
        }
      }
      // Fallback: bare array
      const start = cleaned.indexOf('[')
      const end   = cleaned.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error('No array found')
      setProducts(JSON.parse(cleaned.slice(start, end + 1)))
      setTopper(null)
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
    const startTime = Date.now()
    try {
      await streamChat({
        messages: [{ role: 'user', content: buildPrompt({ style, palette, budget, size, extraContext }) }],
        onText: (text) => setRawResult(prev => prev + text),
      })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again in a moment.')
    } finally {
      // Keep modal visible for at least 3 s so users actually see it
      const elapsed = Date.now() - startTime
      const remaining = 3000 - elapsed
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
      setLoading(false)
      setTimeout(() => {
        const element = resultsRef.current
        if (element) {
          const yOffset = -100
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      }, 300)
    }
  }

  const reset = () => { setProducts([]); setRawResult(''); setError(''); setTopper(null) }

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2><svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', marginBottom: '3px' }}><path d="M11,0.5 L12.8,9.2 L21.5,11 L12.8,12.8 L11,21.5 L9.2,12.8 L0.5,11 L9.2,9.2 Z" fill="#c9a84c"/><circle cx="17.5" cy="4.5" r="1" fill="#c9a84c" opacity="0.5"/><circle cx="4.5" cy="17.5" r="1" fill="#c9a84c" opacity="0.5"/><circle cx="17.5" cy="17.5" r="1" fill="#c9a84c" opacity="0.38"/><circle cx="4.5" cy="4.5" r="1" fill="#c9a84c" opacity="0.38"/></svg>Sleigh the Look</h2>
        <p>Tell your stylist about your tree and they'll curate a personalized ornament shopping list — shoppable on Walmart, Amazon, and Etsy.</p>
      </div>

      <CuratedCollections />

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
                {s.label}
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
              ? <><SparkleIcon size={18} color="#0f1f35" /> Build My Shopping List</>
              : '← Complete selections above to continue'}
        </button>
      </div>

      <CurationModal visible={loading} />

      {error && <div className="error-card">⚠️ {error}</div>}

      {(topper || products.length > 0) && (
        <div ref={resultsRef}>
          {products.length > 0 && (
            <StylePreview products={products} topper={topper} size={size} palette={palette} />
          )}
          {topper && (
            <div className="ornament-shop-section">
              <h3 className="shop-section-header"><SparkleIcon size={20} /> Top It Off</h3>
              <div className="ornament-shop-card topper-card">
                <div className="shop-card-top">
                  <div className="shop-ornament-preview topper-preview">
                    <TopperSVG type={topper.type || 'star'} color={topper.color || '#c9a84c'} />
                  </div>
                  <div className="shop-card-info">
                    <span className="shop-card-num topper-tag">TOPPER</span>
                    <h4 className="shop-card-name">{topper.label}</h4>
                    <p className="shop-card-fullname">{topper.name}</p>
                  </div>
                </div>
                <div className="shop-card-retailers">
                  {RETAILERS.map(r => {
                    const url = getSearchUrl(r.key, topper.name, topper.type)
                    if (!url) return null
                    return (
                      <a key={r.key} href={url} target="_blank" rel="noopener noreferrer" className="btn-retailer">
                        <div className="retailer-top">
                          <span className="retailer-dot" style={{ background: r.color }} />
                          <span className="retailer-name" style={{ color: r.color }}>{r.label}</span>
                          {topper[r.key]?.price && <span className="retailer-price">{topper[r.key].price}</span>}
                        </div>
                        <span className="deck-it-cta">Deck it. Buy it.</span>
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {products.length > 0 && (
            <div className="ornament-shop-section">
              <h3 className="shop-section-header"><SparkleIcon size={20} /> Sleigh It — Shop the Look</h3>
              <div className="recommendations-list">
                {products.map((item, i) => (
                  <RecommendationCard key={i} item={item} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
