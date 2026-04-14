import { useEffect, useState, useMemo } from 'react'

const BULBS = [
  { x: 160, y: 120 },
  { x: 140, y: 170 },
  { x: 190, y: 180 },
  { x: 120, y: 220 },
  { x: 210, y: 230 },
]

export default function SplashSVG({ onFinish }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 50)
    const t1 = setTimeout(onFinish, 2200)
    return () => [t0, t1].forEach(clearTimeout)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#07050f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>

      {/* Tree */}
      <div style={{
        position: 'relative',
        fontSize: 260,
        filter: 'brightness(0.25)',
        transition: 'filter 1.2s ease',
      }}>
        🎄

        {/* Bulbs */}
        {BULBS.map((b, i) => {
          const delay = 300 + Math.random() * 700
          return (
            <div key={i}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#d4a843',
                opacity: 0,
                filter: 'blur(2px)',
                animation: `fadeIn 0.6s ease ${delay}ms forwards`
              }}
            />
          )
        })}
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute',
        bottom: '18%',
        color: '#d4a843',
        fontFamily: 'Playfair Display, serif',
        fontSize: '2.2rem',
        opacity: 0,
        animation: 'fadeUp 0.6s ease 1.2s forwards'
      }}>
        Deck My Tree
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
