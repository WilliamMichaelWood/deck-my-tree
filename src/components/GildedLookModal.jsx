import { useEffect } from 'react'

// TODO: when more collections go live, source modal copy + pre-fill values
// from collection data (curatedCollections.js) instead of hardcoding here.
// Each collection should carry: { modalTitle, modalBody, prefill: { style, palette } }

export default function GildedLookModal({ open, onClose, onGoToDIY }) {
  // Esc key to close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div
      className={`gilded-modal-overlay${open ? ' is-open' : ''}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Gilded Ever After collection"
    >
      <div
        className="gilded-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="gilded-modal-title">Gilded Ever After</h2>
        <p className="gilded-modal-body">
          Full collection shopping launches this fall. In the meantime, your
          stylist can build a Gilded-inspired look for you below.
        </p>
        <div className="gilded-modal-actions">
          <button className="btn-primary btn-full" onClick={onGoToDIY}>
            Take Me to Design Your Own
          </button>
          <button className="gilded-modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
