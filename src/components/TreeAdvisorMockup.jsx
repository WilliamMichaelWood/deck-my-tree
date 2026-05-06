import React from 'react';
import './TreeAdvisorMockup.css';

export default function TreeAdvisorMockup() {
  return (
    <div className="ta-page">
      {/* HEADER */}
      <header className="ta-header">
        <div className="ta-header-left">
          <div className="ta-logo-section">
            <div className="ta-logo">🌲</div>
            <div className="ta-branding">
              <h2 className="ta-brand-name">Deck My Tree</h2>
              <p className="ta-brand-sub">YOUR PERSONAL HOLIDAY STYLIST</p>
            </div>
          </div>
        </div>

        <div className="ta-header-right">
          {/* EMAIL ICON */}
          <a href="mailto:hello@deckmytree.com" className="ta-social-link" title="Email">
            <svg className="ta-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>

          {/* INSTAGRAM */}
          <a href="https://instagram.com/cowboysurferstyle" target="_blank" rel="noopener noreferrer" className="ta-social-link" title="Instagram">
            <svg className="ta-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
            </svg>
          </a>

          {/* TIKTOK */}
          <a href="https://tiktok.com/@cowboysurferstyle" target="_blank" rel="noopener noreferrer" className="ta-social-link" title="TikTok">
            <svg className="ta-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 2.31-4.64 2.86 2.86 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.05-.05z"/>
            </svg>
          </a>

        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="ta-content">
        <h1 className="ta-title">Tree Advisor</h1>
        <p className="ta-subtitle">Upload your tree and let our stylist create a custom look for you.</p>

        {/* UPLOAD BOX */}
        <div className="ta-upload-box">
          <div className="ta-upload-icon">📷</div>
          <h3 className="ta-upload-title">Upload a photo of your tree</h3>
          <p className="ta-upload-text">Tap to take a photo or choose from your gallery</p>
        </div>

        {/* TIPS SECTION */}
        <div className="ta-tips">
          <h3 className="ta-tips-title">Tips for best results</h3>
          <div className="ta-tips-grid">
            <div className="ta-tip-card">
              <div className="ta-tip-icon">☀️</div>
              <h4>Good lighting</h4>
              <p>Use natural light if possible</p>
            </div>
            <div className="ta-tip-card">
              <div className="ta-tip-icon">🌲</div>
              <h4>Full view</h4>
              <p>Capture the entire tree from top to base</p>
            </div>
            <div className="ta-tip-card">
              <div className="ta-tip-icon">✨</div>
              <h4>Clear background</h4>
              <p>Avoid clutter so we can focus on your tree</p>
            </div>
          </div>
        </div>

        {/* INFO BOX */}
        <div className="ta-info-box">
          <div className="ta-info-icon">ℹ️</div>
          <p>Your photo is only used to create your personalized design and is never shared.</p>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="ta-bottom-nav">
        <button className="ta-nav-item">🌲</button>
        <button className="ta-nav-item">🎄</button>
        <button className="ta-nav-item active">✦</button>
      </nav>
    </div>
  );
}
