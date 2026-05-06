import React from 'react';
import './TreeAdvisorMockup.css';

export default function TreeAdvisorMockup() {
  return (
    <div className="ta-page">

      {/* HEADER */}
      <header className="ta-header">
        <button className="ta-back" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <button className="ta-how-it-works">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
          </svg>
          How it works
        </button>
      </header>

      {/* MAIN CONTENT */}
      <div className="ta-content">
        <h1 className="ta-title">Tree Advisor</h1>
        <p className="ta-subtitle">Upload your tree and let our stylist create a custom look for you.</p>

        {/* UPLOAD BOX */}
        <div className="ta-upload-box">
          <div className="ta-upload-icon-ring">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <h3 className="ta-upload-title">Upload a photo of your tree</h3>
          <p className="ta-upload-text">Tap to take a photo or choose from your gallery</p>
        </div>

        {/* TIPS SECTION */}
        <div className="ta-tips">
          <h3 className="ta-tips-title">Tips for best results</h3>
          <div className="ta-tips-grid">
            <div className="ta-tip-card">
              <div className="ta-tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </div>
              <h4>Good lighting</h4>
              <p>Use natural light if possible</p>
            </div>
            <div className="ta-tip-card">
              <div className="ta-tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12,2 8,9 4,9 7,13 5,20 12,16 19,20 17,13 20,9 16,9"/>
                </svg>
              </div>
              <h4>Full view</h4>
              <p>Capture the entire tree from top to base</p>
            </div>
            <div className="ta-tip-card">
              <div className="ta-tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="4"/>
                  <line x1="12" y1="2" x2="12" y2="6"/>
                  <line x1="12" y1="18" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="6" y2="12"/>
                  <line x1="18" y1="12" x2="22" y2="12"/>
                </svg>
              </div>
              <h4>Clear background</h4>
              <p>Avoid clutter so we can focus on your tree</p>
            </div>
          </div>
        </div>

        {/* INFO BOX */}
        <div className="ta-info-box">
          <svg className="ta-info-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Your photo is only used to create your personalized design and is never shared.</p>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="ta-bottom-nav">
        <button className="ta-nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12,2 8,9 4,9 7,13 5,20 12,16 19,20 17,13 20,9 16,9"/>
          </svg>
          <span>Curated Looks</span>
        </button>
        <button className="ta-nav-item active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span>Tree Advisor</span>
        </button>
        <button className="ta-nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 C8 2 5 5 5 9 C5 13 8 17 12 22 C16 17 19 13 19 9 C19 5 16 2 12 2Z"/>
            <line x1="12" y1="6" x2="12" y2="7"/>
          </svg>
          <span>My Ornaments</span>
        </button>
      </nav>

    </div>
  );
}
