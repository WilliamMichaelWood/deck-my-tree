import React from 'react';

/**
 * SleighTheLookTree
 *
 * Renders a static tree image with frozen ornament positions.
 * Ornaments are positioned absolutely as a percentage of image dimensions,
 * so the tree scales correctly on any screen size.
 *
 * Props:
 *   layout       — One of the tree layout JSONs (small/medium/large/xlarge)
 *   imageSrc     — URL of the tree image (must match the layout's tree)
 *   onOrnamentClick — Optional callback when user taps an ornament
 *
 * Example:
 *   import smallLayout from '@/data/treeLayouts/small_layout.json';
 *   import smallTreeImg from '@/assets/trees/small.png';
 *
 *   <SleighTheLookTree
 *     layout={smallLayout}
 *     imageSrc={smallTreeImg}
 *     onOrnamentClick={(orn) => console.log('Tapped:', orn)}
 *   />
 */
export default function SleighTheLookTree({ layout, imageSrc, colors, onOrnamentClick }) {
  if (!layout || !imageSrc) return null;

  const { imageDimensions, ornaments } = layout;
  const imgW = imageDimensions.w;
  const imgH = imageDimensions.h;

  // Build per-ornament color assignments from the products palette.
  // Focals get the first colors (most prominent), then cycle through all.
  // Falls back to frozen layout color when no palette provided.
  const palette = colors && colors.length > 0 ? colors : null;
  const colorMap = {};
  if (palette) {
    const byCategory = { focal: [], medium: [], accent: [] };
    for (const orn of ornaments) {
      if (byCategory[orn.sizeCategory]) byCategory[orn.sizeCategory].push(orn.ornamentId);
    }
    // Assign colors cycling through palette, focal first
    let idx = 0;
    for (const cat of ['focal', 'medium', 'accent']) {
      for (const id of byCategory[cat]) {
        colorMap[id] = palette[idx % palette.length];
        idx++;
      }
    }
  }

  return (
    <div
      className="sleigh-tree-container"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${imgW} / ${imgH}`,
        maxWidth: '100%',
      }}
    >
      <img
        src={imageSrc}
        alt={`${layout.treeId} tree`}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
        }}
        draggable={false}
      />

      {/* Ornament overlay layer */}
      <div
        className="sleigh-tree-ornaments"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {ornaments.map((orn) => {
          const color = colorMap[orn.ornamentId] || orn.color;
          // Convert pixel coords to percentages of the image
          const leftPct = ((orn.x - orn.width / 2) / imgW) * 100;
          const topPct = ((orn.y - orn.height / 2) / imgH) * 100;
          const widthPct = (orn.width / imgW) * 100;
          const heightPct = (orn.height / imgH) * 100;

          return (
            <Ornament
              key={orn.ornamentId}
              ornament={{ ...orn, color }}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                pointerEvents: onOrnamentClick ? 'auto' : 'none',
                cursor: onOrnamentClick ? 'pointer' : 'default',
              }}
              onClick={onOrnamentClick}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Single ornament — renders as an SVG circle with shine highlight + drop shadow.
 * When you have real ornament product images later, swap the inner SVG for an <img>.
 */
function Ornament({ ornament, style, onClick }) {
  const { color, sizeCategory, ornamentId } = ornament;
  const gradId = `orn-radial-${ornamentId}`;

  return (
    <div
      style={style}
      onClick={onClick ? () => onClick(ornament) : undefined}
      data-size={sizeCategory}
    >
      <svg
        viewBox="0 0 100 100"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          filter: 'drop-shadow(2px 3px 3px rgba(0,0,0,0.45))',
        }}
      >
        <defs>
          <radialGradient id={gradId} cx="0.35" cy="0.35" r="0.7">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill={color} />
        <circle cx="50" cy="50" r="48" fill={`url(#${gradId})`} style={{ mixBlendMode: 'multiply' }} />
        <ellipse cx="35" cy="32" rx="14" ry="9" fill="rgba(255,255,255,0.55)" />
        <circle cx="32" cy="30" r="3" fill="rgba(255,255,255,0.85)" />
        <rect x="44" y="0" width="12" height="10" fill="#7a6840" rx="1" />
      </svg>
    </div>
  );
}
