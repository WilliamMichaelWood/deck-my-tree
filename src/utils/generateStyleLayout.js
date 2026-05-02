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
import treeConfigsData from '../data/treeConfigs.json'
import { treeStylePersonalities } from '../data/treeStylePersonalities'
import { colorPaletteStories } from '../data/colorPaletteStories'

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

// ---------- DYNAMIC STYLE GENERATOR (Phase 2) ----------

// Base ornament counts per tree size (before density multiplier).
// Tabletop maps to 'small' via getSizeKey() — no entry needed here.
const SIZE_BASE_COUNTS = { small: 40, medium: 68, large: 80, xlarge: 95 }

// Ornament pixel sizes as % of tree foliage bbox width.
// Applied before avgOrnamentSizeMultiplier scaling.
const ORNAMENT_SIZE_PCT = {
  focal:  { min: 0.085, max: 0.105 },
  medium: { min: 0.055, max: 0.075 },
  accent: { min: 0.028, max: 0.045 },
}

/**
 * Generate a dynamic layout for any (treeStyle × palette × sizeKey) combination.
 * Returns a layout object in the same shape as the frozen JSON files.
 *
 * @param {string} treeStyle   - One of the 8 Tree Style labels (e.g. 'Classic')
 * @param {string} paletteName - One of the 8 Color Palette labels (e.g. 'Gold & White')
 * @param {string} sizeKey     - 'small' | 'medium' | 'large' | 'xlarge'
 * @returns {Object}           - Layout matching frozen JSON shape
 *
 * NOTE: personality.placementLooseness is stored in meta but does not yet modify
 * positionOrnaments behavior — that requires a future update to positionOrnaments.js.
 * Visual variation is currently driven by type distribution, density, size scaling,
 * and color ratios, which provide substantial differentiation across 64 combinations.
 */
export function generateDynamicStyleConfig(treeStyle, paletteName, sizeKey = 'medium') {
  // --- 1. Look up personality and palette, with fallbacks ---
  const personality  = treeStylePersonalities[treeStyle]  ?? treeStylePersonalities['Classic']
  const paletteStory = colorPaletteStories[paletteName]   ?? colorPaletteStories['Gold & White']
  const resolvedSize = SIZE_BASE_COUNTS[sizeKey] != null ? sizeKey : 'medium'
  const treeConfig   = treeConfigsData[resolvedSize]

  // --- 2. Deterministic seed from inputs ---
  const seedStr = `${treeStyle}-${paletteName}-${resolvedSize}`
  let hash = 0
  for (const ch of seedStr) {
    hash = (Math.imul(31, hash) + ch.charCodeAt(0)) | 0
  }
  const seed = (Math.abs(hash) % 999) + 1  // nonzero, range 1–999

  const rng = makeRng(seed)

  // --- 3. Ornament counts (total → per category) ---
  const baseCount  = SIZE_BASE_COUNTS[resolvedSize]
  const finalCount = Math.max(5, Math.round(baseCount * personality.densityMultiplier))

  // avgOrnamentSizeMultiplier shifts the focal/accent balance:
  //   > 1.0 → more focals (bigger ornaments dominate)
  //   < 1.0 → more accents (smaller ornaments fill the tree)
  const m = personality.avgOrnamentSizeMultiplier
  const shift     = (m - 1.0) * 0.20
  const focalFrac  = Math.max(0.08, Math.min(0.30, 0.18 + shift))
  const accentFrac = Math.max(0.20, Math.min(0.55, 0.35 - shift))
  const mediumFrac = 1 - focalFrac - accentFrac

  const focalCount  = Math.max(1, Math.round(finalCount * focalFrac))
  const mediumCount = Math.max(1, Math.round(finalCount * mediumFrac))
  const accentCount = Math.max(1, finalCount - focalCount - mediumCount)
  const catCounts   = { focal: focalCount, medium: mediumCount, accent: accentCount }

  // --- 4. Pixel size ranges (proportional to tree width, scaled by size multiplier) ---
  const treeW     = treeConfig.treeBounds.bbox.w
  const sizeRanges = {}
  for (const [cat, pct] of Object.entries(ORNAMENT_SIZE_PCT)) {
    sizeRanges[cat] = [
      Math.max(8,  Math.round(treeW * pct.min * m)),
      Math.max(12, Math.round(treeW * pct.max * m)),
    ]
  }

  // --- 5. Resolve color ratios (Tree Style personality wins on conflict) ---
  const override = personality.colorRatioOverride
  let resolvedColors, resolvedRatios
  if (!override) {
    // No override — use palette defaults
    resolvedColors = paletteStory.colors
    resolvedRatios = paletteStory.defaultRatios
  } else if (override.length > paletteStory.colors.length) {
    // Override wants more slots than palette provides — fall back to palette defaults
    resolvedColors = paletteStory.colors
    resolvedRatios = paletteStory.defaultRatios
  } else {
    // Override truncates the palette to its slot count
    resolvedColors = paletteStory.colors.slice(0, override.length)
    resolvedRatios = override
  }

  // --- 6. Build color pools per category, distributed proportionally ---
  const colorPools = {}
  for (const [cat, total] of Object.entries(catCounts)) {
    const catPool = []
    let remaining = total
    resolvedRatios.forEach((ratio, i) => {
      const isLast = i === resolvedRatios.length - 1
      const n = isLast ? remaining : Math.round(ratio * total)
      const safeN = Math.max(0, n)
      for (let j = 0; j < safeN; j++) catPool.push(resolvedColors[i])
      remaining -= safeN
    })
    colorPools[cat] = shuffleArray(catPool, rng)
  }
  const colorIndices = { focal: 0, medium: 0, accent: 0 }

  // --- 7. Build ornament pool from type distribution ---
  const typeEntries = Object.entries(personality.ornamentTypeDistribution)
  const pool = []
  for (const [cat, total] of Object.entries(catCounts)) {
    let assigned = 0
    typeEntries.forEach(([typeKey, ratio], i) => {
      const isLast = i === typeEntries.length - 1
      const n = isLast ? total - assigned : Math.round(ratio * total)
      if (n > 0) pool.push({ sizeCategory: cat, type: typeKey, count: n })
      assigned += n
    })
  }

  // --- 8. Build ornament array ---
  const ornaments = []
  let idCounter = 1
  for (const entry of pool) {
    const [minSize, maxSize] = sizeRanges[entry.sizeCategory]
    for (let i = 0; i < entry.count; i++) {
      const size  = Math.round(minSize + rng() * (maxSize - minSize))
      const cat   = entry.sizeCategory
      const cPool = colorPools[cat]
      const color = cPool[colorIndices[cat] % cPool.length]
      colorIndices[cat]++
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

  // --- 9. Position ornaments ---
  const { positions, unplaced } = positionOrnaments(treeConfig, ornaments, { seed })
  if (unplaced.length > 0) {
    console.warn(
      `generateDynamicStyleConfig(${treeStyle}, ${paletteName}, ${resolvedSize}): ` +
      `${unplaced.length} ornament(s) could not be placed`
    )
  }

  // --- 10. Topper exclusion zone (top 8% of foliage height) ---
  const { bbox, foliageBaseY } = treeConfig.treeBounds
  const foliageH      = foliageBaseY - bbox.y
  const topExclusionY = bbox.y + 0.08 * foliageH
  const filtered      = positions.filter(p => (p.y - p.height / 2) >= topExclusionY)

  return {
    treeId:          treeConfig.treeId,
    imageDimensions: treeConfig.imageDimensions,
    treeBounds:      treeConfig.treeBounds,
    ornaments:       filtered,
    meta: {
      algorithm:   'generateDynamicStyleConfig v1',
      treeStyle,
      palette:     paletteName,
      sizeKey:     resolvedSize,
      seed,
      looseness:   personality.placementLooseness,
      counts: {
        total:  filtered.length,
        focal:  filtered.filter(p => p.sizeCategory === 'focal').length,
        medium: filtered.filter(p => p.sizeCategory === 'medium').length,
        accent: filtered.filter(p => p.sizeCategory === 'accent').length,
      },
    },
  }
}
