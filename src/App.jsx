import { useState, useCallback } from 'react'
import TreeAdvisor from './components/TreeAdvisor'
import MyOrnaments from './components/MyOrnaments'
import SleighTheLook from './components/SleighTheLook'
import SplashSVG from './components/SplashSVG'
import './App.css'

const GREEN = '#3d8c5c'
const GOLD  = '#c9a84c'

function TreeIcon({ active }) {
  const c = active ? GOLD : GREEN
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Three-tier tree */}
      <path
        d="M9,1 L13,7 H11 L15,13 H12.5 L16,19 H2 L5.5,13 H3 L7,7 H5 Z"
        fill={c}
      />
      {/* Trunk */}
      <rect x="7.5" y="19" width="3" height="3" rx="1" fill={active ? '#a07828' : '#2a6642'}/>
    </svg>
  )
}

function OrnamentIcon({ active }) {
  const ball = active ? GOLD  : GREEN
  const cap  = active ? '#a07828' : '#2a6642'
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Cap */}
      <rect x="7.5" y="0" width="3" height="5.5" rx="1.2" fill={cap}/>
      {/* Ball */}
      <circle cx="9" cy="13.5" r="8.5" fill={ball}/>
      {/* Highlight */}
      <ellipse cx="6.5" cy="10.5" rx="2" ry="1.4" fill="rgba(255,255,255,0.25)" transform="rotate(-20 6.5 10.5)"/>
    </svg>
  )
}

function SparkleIcon({ active }) {
  const c = active ? GOLD : GREEN
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* 4-pointed star */}
      <path
        d="M10,1 L11.6,8.4 L19,10 L11.6,11.6 L10,19 L8.4,11.6 L1,10 L8.4,8.4 Z"
        fill={c}
      />
    </svg>
  )
}

const TABS = [
  { id: 'advisor',   label: 'Tree Advisor',   icon: (a) => <span className="tab-icon"><TreeIcon    active={a} /></span> },
  { id: 'ornaments', label: 'My Ornaments',   icon: (a) => <span className="tab-icon"><OrnamentIcon active={a} /></span> },
  { id: 'sleigh',    label: 'Sleigh the Look', icon: (a) => <span className="tab-icon"><SparkleIcon active={a} /></span> },
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
