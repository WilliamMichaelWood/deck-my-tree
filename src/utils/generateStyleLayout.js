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

    // Ornament counts per tree size.
    // 50% champagne / 25% gold / 25% pearl color ratio is maintained across all sizes.
    // Totals: small ~40, medium 68 (existing), large ~80, xlarge ~95.
    // Seed is shared (7) so all sizes use the same RNG sequence — each produces a
    // visually distinct layout because the tree geometry (widthProfile, bbox) differs.
    sizeMultipliers: {
      small:  { focal: 7,  medium: 20, accent: 13 },  // ~40 total
      medium: { focal: 12, medium: 32, accent: 24 },  // 68 total
      large:  { focal: 14, medium: 38, accent: 28 },  // ~80 total
      xlarge: { focal: 17, medium: 45, accent: 33 },  // ~95 total
    },

    // Pixel size ranges — proportional to each tree image canvas
    sizeRanges: {
      focal:  [65, 75],
      medium: [38, 50],
      accent: [20, 31],
    },

    // Ornament type ratios (applied proportionally to sizeMultiplier counts):
    //   ball:       ~45% — Type 1
    //   textural:   ~22% — Type 2
    //   statement:  ~13% — Type 3
    //   reflective: ~13% — Type 4
    //   wildcard:    ~6% — Type 5 (gilded feather picks, accent-only)
    poolRatios: {
      focal:  [
        { type: 'ball',      share: 0.75 },
        { type: 'statement', share: 0.25 },
      ],
      medium: [
        { type: 'ball',       share: 0.47 },
        { type: 'textural',   share: 0.31 },
        { type: 'statement',  share: 0.09 },
        { type: 'reflective', share: 0.13 },
      ],
      accent: [
        { type: 'ball',       share: 0.29 },
        { type: 'textural',   share: 0.21 },
        { type: 'reflective', share: 0.21 },
        { type: 'wildcard',   share: 0.17 },
        { type: 'statement',  share: 0.12 },
      ],
    },
  },
}

// ---------- GENERATOR ----------

/**
 * Generate a dynamic ornament layout for a given style.
 *
 * @param {string} styleId     - Curated style key (e.g. 'gilded-ever-after')
 * @param {Object} treeConfig  - Tree config from treeConfigs.json (treeBounds, widthProfile, etc.)
 * @param {string} [palette]   - Selected palette id; included as dependency for useMemo invalidation
 * @param {string} [sizeKey]   - Tree size key: 'small' | 'medium' | 'large' | 'xlarge'
 * @returns {Object}           - Layout object matching the frozen JSON shape
 */
export function generateStyleLayout(styleId, treeConfig, palette, sizeKey = 'medium') {
  const config = STYLE_CONFIGS[styleId]
  if (!config) throw new Error(`generateStyleLayout: unknown styleId "${styleId}"`)

  // Resolve per-size ornament counts, falling back to medium if sizeKey not found
  const counts = config.sizeMultipliers[sizeKey] ?? config.sizeMultipliers.medium

  // Build the pool for this size by distributing type ratios across the total count
  // Each category's total = counts[cat]; distribute by poolRatios, rounding to integers
  const pool = []
  for (const [cat, ratios] of Object.entries(config.poolRatios)) {
    const total = counts[cat]
    let assigned = 0
    ratios.forEach((r, i) => {
      const isLast = i === ratios.length - 1
      const n = isLast ? total - assigned : Math.round(r.share * total)
      if (n > 0) pool.push({ sizeCategory: cat, type: r.type, count: n })
      assigned += n
    })
  }

  const rng = makeRng(config.seed)

  // --- Build color pools per size category (50/25/25 ratio, shuffled) ---
  const colorPools = {}
  for (const cat of ['focal', 'medium', 'accent']) {
    const total = counts[cat]
    const nBase      = Math.round(total * 0.50)
    const nSecondary = Math.round(total * 0.25)
    const nAccent    = total - nBase - nSecondary
    const catPool = [
      ...Array(nBase).fill(config.colors.base),
      ...Array(nSecondary).fill(config.colors.secondary),
      ...Array(Math.max(0, nAccent)).fill(config.colors.accent),
    ]
    colorPools[cat] = shuffleArray(catPool, rng)
  }
  const colorIndices = { focal: 0, medium: 0, accent: 0 }

  // --- Build ornament input array ---
  const ornaments = []
  let idCounter = 1

  for (const entry of pool) {
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
