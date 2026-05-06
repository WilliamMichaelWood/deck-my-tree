import { useState } from 'react'
import TreeAdvisor from './components/TreeAdvisor'
import MyOrnaments from './components/MyOrnaments'
import SleighTheLook from './components/SleighTheLook'
import LegalPage from './components/LegalPages'
import AppFooter from './components/AppFooter'
import './App.css'

const GREEN = 'rgba(255, 245, 220, 0.55)'
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
      <rect x="7.5" y="19" width="3" height="3" rx="1" fill={active ? '#a07828' : 'rgba(255, 245, 220, 0.55)'}/>
    </svg>
  )
}

function OrnamentIcon({ active }) {
  const ball = active ? GOLD  : GREEN
  const cap  = active ? '#a07828' : 'rgba(255, 245, 220, 0.55)'
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
  const [activeTab, setActiveTab] = useState('advisor')
  const [legalPage, setLegalPage] = useState(null)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <img src="/logo.png" alt="Deck My Tree" className="header-logo" />
            <div>
              <h1 className="header-title">Deck My Tree</h1>
              <p className="header-sub">Your Personal Holiday Stylist</p>
            </div>
          </div>
          <div className="header-socials">
            <a href="mailto:hello@deckmytree.com" className="header-social-link" title="Email">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
            <a href="https://instagram.com/deckmytreeapp" target="_blank" rel="noopener noreferrer" className="header-social-link" title="Instagram">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
              </svg>
            </a>
            <a href="https://tiktok.com/@deckmytreeapp" target="_blank" rel="noopener noreferrer" className="header-social-link" title="TikTok">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 2.31-4.64 2.86 2.86 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.05-.05z"/>
              </svg>
            </a>
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
      <AppFooter onOpen={setLegalPage} />
      {legalPage && <LegalPage name={legalPage} onClose={() => setLegalPage(null)} />}
    </div>
  )
}
