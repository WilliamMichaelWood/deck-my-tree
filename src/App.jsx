import { useState, useCallback } from 'react'
import TreeAdvisor from './components/TreeAdvisor'
import MyOrnaments from './components/MyOrnaments'
import Shop from './components/Shop'
import SplashSVG from './components/SplashSVG'
import './App.css'

function OrnamentIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="7.5" y="0" width="3" height="5.5" rx="1.2" fill="#9a7830"/>
      <circle cx="9" cy="13.5" r="8.5" fill="#c0392b"/>
      <ellipse cx="6.5" cy="10.5" rx="2" ry="1.4" fill="rgba(255,255,255,0.28)" transform="rotate(-20 6.5 10.5)"/>
    </svg>
  )
}

const TABS = [
  { id: 'advisor',   label: 'Tree Advisor', icon: '🌲' },
  { id: 'ornaments', label: 'My Ornaments', icon: <OrnamentIcon /> },
  { id: 'shop',      label: 'Shop',         icon: '🛍️' },
]


export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('advisor')
  const handleSplashFinish = useCallback(() => setShowSplash(false), [])

  if (showSplash) return <SplashSVG onFinish={handleSplashFinish} />

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="header-tree">🎄</span>
            <div>
              <h1 className="header-title">Deck My Tree</h1>
              <p className="header-sub">Your Personal Holiday Stylist</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'advisor' && <TreeAdvisor />}
        {activeTab === 'ornaments' && <MyOrnaments />}
        {activeTab === 'shop' && <Shop />}
      </main>

      <footer className="app-footer">
        <span>✦ Your personal holiday decorator ✦</span>
      </footer>
    </div>
  )
}
