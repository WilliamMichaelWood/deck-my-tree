/**
 * OrnamentTest.jsx — Temporary Phase 1 test grid
 * Navigate to: /#ornament-test  (remove hash to return to app)
 * Delete this file after migration is complete.
 */
import Ornament from './Ornament'

const SHAPES = ['ball', 'drop', 'star', 'snowflake', 'pinecone', 'bow', 'bell', 'berry']

const COLORS = [
  { hex: '#e8b942', label: 'Warm Gold' },
  { hex: '#1f3a2e', label: 'Forest Green' },
  { hex: '#7a1f2a', label: 'Deep Red' },
]

const SIZE = 80

export default function OrnamentTest() {
  return (
    <div style={{
      minHeight:   '100vh',
      background:  '#050e1a',
      padding:     '32px 24px 60px',
      fontFamily:  'Inter, sans-serif',
      color:       '#ede8d8',
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#e8b942' }}>
        Ornament.jsx — Phase 1 Test Grid
      </h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 40 }}>
        8 shapes × 3 colors · size=80 · single rendering treatment
      </p>

      {/* Column headers */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: `88px repeat(${COLORS.length}, 1fr)`,
        gap:                 '0 12px',
        marginBottom:        12,
        alignItems:          'center',
      }}>
        <div />
        {COLORS.map(({ hex, label }) => (
          <div key={hex} style={{
            display:    'flex',
            alignItems: 'center',
            gap:        8,
            justifyContent: 'center',
          }}>
            <div style={{
              width:      12,
              height:     12,
              borderRadius: '50%',
              background: hex,
              boxShadow:  `0 0 6px ${hex}99`,
              flexShrink: 0,
            }}/>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }} />

      {/* Ornament rows */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: `88px repeat(${COLORS.length}, 1fr)`,
        gap:                 '4px 12px',
        alignItems:          'center',
      }}>
        {SHAPES.map(shape => (
          <>
            {/* Shape label */}
            <div key={`${shape}-lbl`} style={{
              fontSize:      12,
              fontWeight:    500,
              color:         'rgba(255,255,255,0.45)',
              letterSpacing: '0.04em',
              textAlign:     'right',
              paddingRight:  12,
              height:        '100%',
              display:       'flex',
              alignItems:    'center',
              justifyContent: 'flex-end',
            }}>
              {shape}
            </div>

            {/* One cell per color */}
            {COLORS.map(({ hex }) => (
              <div key={`${shape}-${hex}`} style={{
                display:        'flex',
                justifyContent: 'center',
                alignItems:     'center',
                padding:        '18px 8px',
                borderRadius:   10,
                background:     'rgba(255,255,255,0.03)',
              }}>
                <Ornament shape={shape} color={hex} size={SIZE} />
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  )
}
