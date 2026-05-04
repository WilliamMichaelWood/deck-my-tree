// ============================================
// SLEIGH THE LOOK - HEADER & HERO SECTION
// ============================================

import React from 'react';
import './SleighTheLookHero.css';

export function SleighTheLookHero() {
  return (
    <div className="stl-wrapper">
      {/* HEADER */}
      <header className="stl-header">
        <div className="stl-header-left">
          <div className="stl-logo-section">
            <div className="stl-logo">🌲</div>
            <div className="stl-branding">
              <h2 className="stl-brand-name">Deck My Tree</h2>
              <p className="stl-brand-sub">YOUR PERSONAL HOLIDAY STYLIST</p>
            </div>
          </div>
        </div>
        <div className="stl-header-right">
          <a href="mailto:hello@deckmytree.com" className="stl-email-button">
            <span className="stl-email-icon">✉</span>
            <span className="stl-email-text">hello@deckmytree.com</span>
          </a>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="stl-hero-section">
        {/* Subtle glow overlay */}
        <div className="stl-hero-glow"></div>

        {/* Background trees (left) */}
        <div className="stl-bg-tree stl-bg-tree-left"></div>

        {/* Background tree (right) */}
        <div className="stl-bg-tree stl-bg-tree-right"></div>

        {/* Sparkle accents */}
        <div className="stl-sparkle stl-sparkle-1">✦</div>
        <div className="stl-sparkle stl-sparkle-2">✦</div>
        <div className="stl-sparkle stl-sparkle-3">✦</div>

        {/* Centered hero content */}
        <div className="stl-hero-content">
          <div className="stl-hero-icon">✦</div>
          <h1 className="stl-hero-title">Sleigh the Look</h1>
          <p className="stl-hero-subtitle">
            Curated trees, styled to perfection.<br />
            Tap a look and bring it home.
          </p>
        </div>
      </section>
    </div>
  );
}
