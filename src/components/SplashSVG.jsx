import { useState, useEffect } from 'react'

const CSS = `
@keyframes treeFadeIn {
  from { opacity: 0; transform: scale(0.88); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes treeSwap {
  from { opacity: 0; transform: scale(0.93); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes ornPop {
  0%   { opacity: 0; transform: scale(0); }
  62%  { opacity: 1; transform: scale(1.3); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes starPulse {
  0%   { opacity: 0; transform: scale(0.6); }
  25%  { opacity: 1; transform: scale(1.0); filter: drop-shadow(0 0 6px #c9a84c); }
  55%  { transform: scale(1.4); filter: drop-shadow(0 0 18px #c9a84c) drop-shadow(0 0 36px rgba(201,168,76,0.5)); }
  80%  { transform: scale(1.0); filter: drop-shadow(0 0 8px #c9a84c); }
  100% { opacity: 1; transform: scale(1.0); filter: drop-shadow(0 0 4px rgba(201,168,76,0.6)); }
}
@keyframes titleIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes taglineIn {
  from { opacity: 0; }
  to   { opacity: 0.55; }
}
`

// Three ornament dots — cranberry, gold, forest green
// x/y are percentages within the 160×175 container
const ORNAMENTS = [
  { x: '27%', y: '41%', r: 7, color: '#9b1c2c', delay: '0.6s' },
  { x: '74%', y: '48%', r: 6, color: '#c9a84c', delay: '1.0s' },
  { x: '41%', y: '67%', r: 8, color: '#1d5c3a', delay: '1.4s' },
]

export default function SplashSVG({ onFinish }) {
  const [showDecorated, setShowDecorated] = useState(false)
  const [outerOpacity, setOuterOpacity] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setOuterOpacity(1),     50)   // fade in
    const t1 = setTimeout(() => setShowDecorated(true), 1800) // swap to 🎄
    const t2 = setTimeout(() => setOuterOpacity(0),    3600)  // fade out
    const t3 = setTimeout(onFinish,                    4500)  // unmount
    return () => [t0, t1, t2, t3].forEach(clearTimeout)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 38%, #0d1a2e 0%, #060c18 100%)',
      opacity: outerOpacity,
      transition: outerOpacity === 1 ? 'opacity 0.6s ease' : 'opacity 1.0s ease',
      userSelect: 'none',
    }}>
      <style>{CSS}</style>

      {/* Tree + ornament overlay container */}
      <div style={{ position: 'relative', width: 160, height: 175 }}>

        {/* Tree emoji — 🌲 until 1.8s, then swaps to 🎄 */}
        <div
          key={showDecorated ? 'deco' : 'plain'}
          style={{
            fontSize: 130,
            lineHeight: 1,
            textAlign: 'center',
            animation: showDecorated
              ? 'treeSwap 0.3s ease both'
              : 'treeFadeIn 0.55s ease 0.1s both',
          }}
        >
          {showDecorated ? '🎄' : '🌲'}
        </div>

        {/* Ornament dots layered over the tree */}
        {ORNAMENTS.map((o, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: o.x, top: o.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: o.r * 2, height: o.r * 2,
              borderRadius: '50%',
              background: o.color,
              boxShadow: `0 0 ${o.r * 1.5}px ${o.color}`,
              opacity: 0,
              animation: `ornPop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${o.delay} both`,
            }} />
          </div>
        ))}

        {/* Gold star pulse — appears 0.2s after tree swap (= 2.0s) */}
        {showDecorated && (
          <div style={{
            position: 'absolute',
            left: '50%', top: '-3%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}>
            <span style={{
              display: 'block',
              fontSize: 26,
              lineHeight: 1,
              opacity: 0,
              animation: 'starPulse 0.9s ease 0.2s both',
            }}>
              ⭐
            </span>
          </div>
        )}
      </div>

      {/* Title fades in at 2.4s */}
      <div style={{ marginTop: 22, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{
          color: '#e4d4a8',
          fontSize: 'clamp(17px, 4.5vw, 22px)',
          fontWeight: 300,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          opacity: 0,
          animation: 'titleIn 0.8s ease 2.4s both',
        }}>
          Deck My Tree
        </div>
        {/* Tagline fades in at 2.8s */}
        <div style={{
          color: 'rgba(200,185,145,0.55)',
          fontSize: 'clamp(10px, 2.8vw, 12px)',
          letterSpacing: '0.24em',
          marginTop: 5,
          textTransform: 'uppercase',
          opacity: 0,
          animation: 'taglineIn 0.8s ease 2.8s both',
        }}>
          Your Holiday Stylist
        </div>
      </div>
    </div>
  )
}
