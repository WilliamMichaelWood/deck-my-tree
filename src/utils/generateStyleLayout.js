/**
 * generateStyleLayout.js
 *
 * Deck My Tree — Dynamic ornament layout generator for Sleigh the Look.
 *
 * Produces a layout object in the same shape as the frozen JSON files,
 * but with ornament positions, types, and colors determined by a curated
 * style config. Calls positionOrnaments internally for placement.
 *
 * Five-type ornament methodology (mandatory):
 *   Type 1 — ball:        40–50% of total
 *   Type 2 — textural:    20–25% (wood, rope, woven, fabric)
 *   Type 3 — statement:   10–15% (stars, animals, sculptural)
 *   Type 4 — reflective:  10–15% (metallics, glitter, mercury glass)
 *   Type 5 — wildcard:     5–10% (one unexpected category per style)
 *
 * Color ratio rule:
 *   base 50% / secondary 25% / accent 25%
 */

import { positionOrnaments } from './positionOrnaments'

// ---------- SEEDABLE RNG (mulberry32 — same as positionOrnaments.js) ----------

function makeRng(seed) {
  let state = seed >>> 0
  return function () {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fisher-Yates shuffle using the seeded rng
function shuffleArray(arr, rng) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---------- STYLE CONFIGS ----------

const STYLE_CONFIGS = {
  'gilded-ever-after': {
    seed: 7,

    // Champagne / Gold / Pearl — luxe, warm, editorial
    colors: {
      base:      '#D4B896',  // warm champagne — 60%
      secondary: '#B8924E',  // warm antique gold — 30%
      accent:    '#EDE4D3',  // cream pearl — 10%
    },

    // Color counts per size category (must sum to total pool count for that category)
    // 50% champagne / 25% gold / 25% pearl across all 68 ornaments
    colorCounts: {
      focal:  { base: 6, secondary: 3, accent: 3  },   // 12 total
      medium: { base: 16, secondary: 8, accent: 8  },   // 32 total
      accent: { base: 12, secondary: 6, accent: 6  },   // 24 total
    },

    // Pixel size ranges — match medium tree image (980×1232)
    sizeRanges: {
      focal:  [65, 75],
      medium: [38, 50],
      accent: [20, 31],
    },

    // Ornament pool definition: [sizeCategory, type, count]
    // Total: 12 focal + 32 medium + 24 accent = 68
    //
    // Type breakdown (68 total):
    //   ball:       31  (45.6%) — Type 1
    //   textural:   15  (22.1%) — Type 2
    //   statement:   9  (13.2%) — Type 3
    //   reflective:  9  (13.2%) — Type 4
    //   wildcard:    4   (5.9%) — Type 5 (gilded feather picks)
    pool: [
      // Focal — 12 total
      { sizeCategory: 'focal',  type: 'ball',       count: 9 },
      { sizeCategory: 'focal',  type: 'statement',  count: 3 },
      // Medium — 32 total
      { sizeCategory: 'medium', type: 'ball',       count: 15 },
      { sizeCategory: 'medium', type: 'textural',   count: 10 },
      { sizeCategory: 'medium', type: 'statement',  count: 3  },
      { sizeCategory: 'medium', type: 'reflective', count: 4  },
      // Accent — 24 total
      { sizeCategory: 'accent', type: 'ball',       count: 7  },
      { sizeCategory: 'accent', type: 'textural',   count: 5  },
      { sizeCategory: 'accent', type: 'reflective', count: 5  },
      { sizeCategory: 'accent', type: 'wildcard',   count: 4  },
      { sizeCategory: 'accent', type: 'statement',  count: 3  },
    ],
  },
}

// ---------- GENERATOR ----------

/**
 * Generate a dynamic ornament layout for a given style.
 *
 * @param {string} styleId     - Curated style key (e.g. 'gilded-ever-after')
 * @param {Object} treeConfig  - Tree config from treeConfigs.json (treeBounds, widthProfile, etc.)
 * @param {string} [palette]   - Selected palette id; included as dependency for useMemo invalidation
 * @returns {Object}           - Layout object matching the frozen JSON shape
 */
export function generateStyleLayout(styleId, treeConfig, palette) {
  const config = STYLE_CONFIGS[styleId]
  if (!config) throw new Error(`generateStyleLayout: unknown styleId "${styleId}"`)

  const rng = makeRng(config.seed)

  // --- Build color pools per size category (shuffled for visual distribution) ---
  const colorPools = {}
  for (const [cat, counts] of Object.entries(config.colorCounts)) {
    const pool = [
      ...Array(counts.base).fill(config.colors.base),
      ...Array(counts.secondary).fill(config.colors.secondary),
      ...Array(counts.accent).fill(config.colors.accent),
    ]
    colorPools[cat] = shuffleArray(pool, rng)
  }
  const colorIndices = { focal: 0, medium: 0, accent: 0 }

  // --- Build ornament input array ---
  const ornaments = []
  let idCounter = 1

  for (const entry of config.pool) {
    const [minSize, maxSize] = config.sizeRanges[entry.sizeCategory]
    for (let i = 0; i < entry.count; i++) {
      const size = Math.round(minSize + rng() * (maxSize - minSize))
      const cat  = entry.sizeCategory
      const color = colorPools[cat][colorIndices[cat]++]
      ornaments.push({
        id:           `${cat}_${idCounter++}`,
        type:         entry.type,
        sizeCategory: cat,
        width:        size,
        height:       size,
        color,
      })
    }
  }

  // --- Position using existing engine (handles zone distribution, edge-weighting, overlap) ---
  const { positions, unplaced } = positionOrnaments(treeConfig, ornaments, { seed: config.seed })

  if (unplaced.length > 0) {
    console.warn(`generateStyleLayout(${styleId}): ${unplaced.length} ornament(s) could not be placed`)
  }

  // --- Topper exclusion zone: filter ornaments whose visual top edge sits within
  //     the top 8% of foliage height. positionOrnaments reserves 10% by center,
  //     but large focal ornaments (radius ~37px) still visually impinge on the topper.
  //     Filter on top edge (y - height/2) rather than center so size is accounted for.
  const { bbox, foliageBaseY } = treeConfig.treeBounds
  const foliageH = foliageBaseY - bbox.y
  const topExclusionY = bbox.y + 0.08 * foliageH  // top 8% of foliage
  const filtered = positions.filter(p => (p.y - p.height / 2) >= topExclusionY)

  return {
    treeId:         treeConfig.treeId,
    imageDimensions: treeConfig.imageDimensions,
    treeBounds:     treeConfig.treeBounds,
    ornaments:      filtered,
    meta: {
      algorithm: 'generateStyleLayout v1',
      style:     styleId,
      seed:      config.seed,
      counts: {
        total:  filtered.length,
        focal:  filtered.filter(p => p.sizeCategory === 'focal').length,
        medium: filtered.filter(p => p.sizeCategory === 'medium').length,
        accent: filtered.filter(p => p.sizeCategory === 'accent').length,
      },
    },
  }
}
