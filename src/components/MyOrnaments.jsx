import { useState, useEffect, useRef } from 'react'
import './MyOrnaments.css'

const RETAILERS = [
  { key: 'walmart', label: 'Walmart', color: '#0071ce' },
  { key: 'amazon', label: 'Amazon', color: '#ff9900' },
  { key: 'potterybarn', label: 'Pottery Barn', color: '#8b6914' },
]

const STYLE_TAGS = ['Rustic', 'Modern', 'Elegant', 'Whimsical', 'Maximalist']
const BUDGET_TAGS = ['Budget', 'Mid-range', 'Premium']

function OrnamentCard({ ornament, onDelete, onEdit, onAddToCart }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const lowestPrice = Object.values(ornament.retailers)
    .map(r => parseFloat(r.price?.replace('$', '')))
    .filter(Boolean)
    .sort((a, b) => a - b)[0]

  return (
    <div className="ornament-card">
      <div className="card-image">
        <div
          className="card-thumbnail"
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, ${ornament.color}dd 38%, ${ornament.color} 100%)`
          }}
        />
        <div className="card-rating">{'★'.repeat(ornament.rating || 0)}</div>
      </div>

      <div className="card-content">
        <h3 className="card-name">{ornament.name}</h3>
        
        {ornament.tags && ornament.tags.length > 0 && (
          <div className="card-tags">
            {ornament.tags.slice(0, 2).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="card-pricing">
          {lowestPrice && (
            <div className="lowest-price">
              <span className="price-label">Best price:</span>
              <span className="price-value">${lowestPrice}</span>
            </div>
          )}
        </div>

        {ornament.notes && (
          <p className="card-notes">{ornament.notes}</p>
        )}

        <div className="card-actions">
          <button
            className="btn-add-cart"
            onClick={() => onAddToCart(ornament)}
          >
            Add to Cart
          </button>
          
          <div className="menu-container" ref={menuRef}>
            <button
              className="btn-menu"
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
            >
              ⋯
            </button>
            
            {showMenu && (
              <div className="context-menu">
                <button onClick={() => { onEdit(ornament); setShowMenu(false) }}>
                  Edit
                </button>
                <button onClick={() => { onDelete(ornament.id); setShowMenu(false) }}>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterDrawer({ onFilter, onSort, isOpen, onClose }) {
  const [priceRange, setPriceRange] = useState('')
  const [selectedRetailers, setSelectedRetailers] = useState([])
  const [selectedStyles, setSelectedStyles] = useState([])
  const [selectedBudgets, setSelectedBudgets] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')

  const handleApplyFilters = () => {
    onFilter({
      priceRange,
      retailers: selectedRetailers,
      styles: selectedStyles,
      budgets: selectedBudgets,
      search: searchTerm,
    })
    onSort(sortBy)
  }

  return (
    <>
      {isOpen && <div className="filter-overlay" onClick={onClose} />}
      
      <div className={`filter-drawer${isOpen ? ' open' : ''}`}>
        <div className="filter-header">
          <h3>Filter & Sort</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="filter-section">
          <label className="filter-label">Search</label>
          <input
            type="text"
            placeholder="Name, color, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-section">
          <label className="filter-label">Price Range</label>
          <div className="filter-options">
            {['Under $10', '$10-20', '$20-50', '$50+'].map(range => (
              <label key={range} className="checkbox">
                <input
                  type="radio"
                  name="price"
                  value={range}
                  checked={priceRange === range}
                  onChange={(e) => setPriceRange(e.target.value)}
                />
                {range}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Retailer</label>
          <div className="filter-options">
            {RETAILERS.map(r => (
              <label key={r.key} className="checkbox">
                <input
                  type="checkbox"
                  checked={selectedRetailers.includes(r.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRetailers([...selectedRetailers, r.key])
                    } else {
                      setSelectedRetailers(selectedRetailers.filter(x => x !== r.key))
                    }
                  }}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Style</label>
          <div className="filter-options">
            {STYLE_TAGS.map(style => (
              <label key={style} className="checkbox">
                <input
                  type="checkbox"
                  checked={selectedStyles.includes(style)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStyles([...selectedStyles, style])
                    } else {
                      setSelectedStyles(selectedStyles.filter(x => x !== style))
                    }
                  }}
                />
                {style}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Budget</label>
          <div className="filter-options">
            {BUDGET_TAGS.map(budget => (
              <label key={budget} className="checkbox">
                <input
                  type="checkbox"
                  checked={selectedBudgets.includes(budget)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBudgets([...selectedBudgets, budget])
                    } else {
                      setSelectedBudgets(selectedBudgets.filter(x => x !== budget))
                    }
                  }}
                />
                {budget}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-input"
          >
            <option value="recent">Most Recent</option>
            <option value="rating">Highest Rating</option>
            <option value="price-low">Lowest Price</option>
            <option value="price-high">Highest Price</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        <div className="filter-actions">
          <button 
            className="btn-primary btn-full"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </button>
          <button 
            className="btn-secondary btn-full"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

function EditModal({ ornament, onSave, onClose }) {
  const [name, setName] = useState(ornament?.name || '')
  const [notes, setNotes] = useState(ornament?.notes || '')
  const [rating, setRating] = useState(ornament?.rating || 0)
  const [tags, setTags] = useState(ornament?.tags || [])

  const toggleTag = (tag) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag))
    } else {
      setTags([...tags, tag])
    }
  }

  const handleSave = () => {
    onSave({
      ...ornament,
      name,
      notes,
      rating,
      tags,
    })
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal-header">
          <h2>Edit Ornament</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Great for small gaps"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Rating</label>
            <div className="rating-selector">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  className={`star${rating >= r ? ' active' : ''}`}
                  onClick={() => setRating(r)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tag-selector">
              {[...STYLE_TAGS, ...BUDGET_TAGS].map(tag => (
                <button
                  key={tag}
                  className={`tag-btn${tags.includes(tag) ? ' selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </>
  )
}

export default function MyOrnaments() {
  const [ornaments, setOrnaments] = useState([])
  const [filteredOrnaments, setFilteredOrnaments] = useState([])
  const [filters, setFilters] = useState({})
  const [sortBy, setSortBy] = useState('recent')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [editingOrnament, setEditingOrnament] = useState(null)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('myOrnaments')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setOrnaments(parsed)
      } catch (err) {
        console.error('Error loading ornaments:', err)
      }
    }
  }, [])

  // Apply filters & sorting
  useEffect(() => {
    let result = [...ornaments]

    // Filter by search
    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(o =>
        o.name.toLowerCase().includes(term) ||
        o.notes?.toLowerCase().includes(term)
      )
    }

    // Filter by price
    if (filters.priceRange) {
      result = result.filter(o => {
        const prices = Object.values(o.retailers)
          .map(r => parseFloat(r.price?.replace('$', '')))
          .filter(Boolean)
        const minPrice = Math.min(...prices)

        if (filters.priceRange === 'Under $10') return minPrice < 10
        if (filters.priceRange === '$10-20') return minPrice >= 10 && minPrice < 20
        if (filters.priceRange === '$20-50') return minPrice >= 20 && minPrice < 50
        if (filters.priceRange === '$50+') return minPrice >= 50
        return true
      })
    }

    // Filter by tags
    if (filters.styles?.length) {
      result = result.filter(o =>
        o.tags?.some(tag => filters.styles.includes(tag))
      )
    }
    if (filters.budgets?.length) {
      result = result.filter(o =>
        o.tags?.some(tag => filters.budgets.includes(tag))
      )
    }

    // Sort
    if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sortBy === 'price-low') {
      result.sort((a, b) => {
        const aPrice = Math.min(...Object.values(a.retailers).map(r => parseFloat(r.price?.replace('$', '') || 999)))
        const bPrice = Math.min(...Object.values(b.retailers).map(r => parseFloat(r.price?.replace('$', '') || 999)))
        return aPrice - bPrice
      })
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => {
        const aPrice = Math.max(...Object.values(a.retailers).map(r => parseFloat(r.price?.replace('$', '') || 0)))
        const bPrice = Math.max(...Object.values(b.retailers).map(r => parseFloat(r.price?.replace('$', '') || 0)))
        return bPrice - aPrice
      })
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      // recent (default)
      result.sort((a, b) => (b.dateSaved || 0) - (a.dateSaved || 0))
    }

    setFilteredOrnaments(result)
  }, [ornaments, filters, sortBy])

  const handleAddFromShopping = (ornament) => {
    const newOrnament = {
      ...ornament,
      id: ornament.id || `orn-${Date.now()}`,
      dateSaved: Date.now(),
      rating: 0,
      tags: [],
      notes: '',
    }
    const updated = [newOrnament, ...ornaments]
    setOrnaments(updated)
    localStorage.setItem('myOrnaments', JSON.stringify(updated))
  }

  const handleDelete = (id) => {
    const updated = ornaments.filter(o => o.id !== id)
    setOrnaments(updated)
    localStorage.setItem('myOrnaments', JSON.stringify(updated))
  }

  const handleEdit = (ornament) => {
    setEditingOrnament(ornament)
  }

  const handleSaveEdit = (updated) => {
    const idx = ornaments.findIndex(o => o.id === updated.id)
    if (idx !== -1) {
      const newOrnaments = [...ornaments]
      newOrnaments[idx] = updated
      setOrnaments(newOrnaments)
      localStorage.setItem('myOrnaments', JSON.stringify(newOrnaments))
    }
  }

  const handleAddToCart = (ornament) => {
    // Open first available retailer link
    const retailerLinks = Object.entries(ornament.retailers)
      .filter(([_, r]) => r.url)
      .map(([_, r]) => r.url)

    if (retailerLinks.length > 0) {
      window.open(retailerLinks[0], '_blank')
    }
  }

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>🎀 My Ornaments</h2>
        <p>Your personal ornament library. Save, organize, and shop smarter.</p>
      </div>

      {ornaments.length === 0 ? (
        <div className="empty-state">
          <p>✨ No ornaments saved yet.</p>
          <p>Start a decoration and tap "Add to Collection" on ornaments you love.</p>
        </div>
      ) : (
        <>
          <div className="library-controls">
            <button
              className="btn-secondary"
              onClick={() => setFilterDrawerOpen(true)}
            >
              🔍 Filter & Sort
            </button>
            <span className="ornament-count">
              {filteredOrnaments.length} of {ornaments.length}
            </span>
          </div>

          <div className="ornament-grid">
            {filteredOrnaments.map(ornament => (
              <OrnamentCard
                key={ornament.id}
                ornament={ornament}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </>
      )}

      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onFilter={setFilters}
        onSort={setSortBy}
      />

      {editingOrnament && (
        <EditModal
          ornament={editingOrnament}
          onSave={handleSaveEdit}
          onClose={() => setEditingOrnament(null)}
        />
      )}
    </div>
  )
}
