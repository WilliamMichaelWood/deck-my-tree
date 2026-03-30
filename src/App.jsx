import { useState, useCallback } from 'react'
import TreeAdvisor from './components/TreeAdvisor'
import MyOrnaments from './components/MyOrnaments'
import SleighTheLook from './components/SleighTheLook'
import SplashSVG from './components/SplashSVG'
import './App.css'

function OrnamentIcon({ active }) {
  const fill = active ? '#c9a84c' : '#5a7a92'
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="7.5" y="0" width="3" height="5.5" rx="1.2" fill={active ? '#a07828' : '#3a5a72'}/>
      <circle cx="9" cy="13.5" r="8.5" fill={fill}/>
      <ellipse cx="6.5" cy="10.5" rx="2" ry="1.4" fill="rgba(255,255,255,0.22)" transform="rotate(-20 6.5 10.5)"/>
    </svg>
  )
}

const TABS = [
  { id: 'advisor',   label: 'Tree Advisor',    icon: () => <span className="tab-icon">🌲</span> },
  { id: 'ornaments', label: 'My Ornaments',     icon: (active) => <span className="tab-icon"><OrnamentIcon active={active} /></span> },
  { id: 'sleigh',    label: 'Sleigh the Look',  icon: () => <span className="tab-icon">✨</span> },
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

      <main className="app-main">
        {activeTab === 'advisor'   && <TreeAdvisor />}
        {activeTab === 'ornaments' && <MyOrnaments />}
        {activeTab === 'sleigh'    && <SleighTheLook />}
      </main>

      <nav className="tab-nav">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`tab-btn${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon(isActive)}
              <span className="tab-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
