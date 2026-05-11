/**
 * ornamentImageLookup.js
 *
 * Finds the best-matching ornament image from the library manifest.
 *
 * Usage:
 *   findOrnamentImage({ shape, color, style }) → path string | null
 *
 * color can be a name ('gold', 'burgundy') or a hex string ('#e8b942').
 * Hex strings are mapped to the closest named color before matching.
 */
import ornamentLibrary from '../data/ornamentLibrary.json'

// ─── Color families ──────────────────────────────────────────────────────────
// Used for family-level fallback when exact color match fails.
// Keys are family names; values are arrays of color names in that family.

const COLOR_FAMILIES = {
  warm_gold: ['gold', 'champagne', 'bronze', 'copper', 'rose_gold'],
  silver:    ['silver', 'white', 'pearl'],
  red:       ['red', 'burgundy', 'crimson', 'cranberry'],
  green:     ['green', 'emerald', 'forest', 'sage'],
  blue:      ['navy', 'blue', 'teal'],
  dark:      ['black', 'charcoal'],
  pink:      ['pink', 'lilac', 'purple'],
}

// Preferred fallback color within each family (first in list above)
const FAMILY_PREFERRED = Object.fromEntries(
  Object.entries(COLOR_FAMILIES).map(([fam, colors]) => [fam, colors[0]])
)

// ─── Hex → color name mapping ─────────────────────────────────────────────────
// Covers the most common AI-generated palette values.
// Expand this table when new hex values are added to the system.
//
// Format: [hexPattern, colorName] — hex values are compared by HSL bucket.
// For simplicity, we use a curated list of hex→name pairs; hue-range fallback
// handles anything not in the explicit list.
//
const HEX_TO_NAME = {
  // Golds / champagnes
  '#e8b942': 'gold',
  '#f0c855': 'gold',
  '#c9a84c': 'gold',
  '#d4af37': 'gold',
  '#b8902f': 'gold',
  '#f5d78e': 'champagne',
  '#f7e8c3': 'champagne',
  '#e8d5a3': 'champagne',
  // Coppers / bronzes / rose gold
  '#b87333': 'copper',
  '#cd7f32': 'bronze',
  '#b76e79': 'rose_gold',
  '#c07e78': 'rose_gold',
  // Silvers / whites
  '#c0c0c0': 'silver',
  '#a8a9ad': 'silver',
  '#e8e8e8': 'white',
  '#ffffff': 'white',
  '#f5f5f5': 'white',
  // Reds / burgundies
  '#cc0000': 'red',
  '#b22222': 'red',
  '#8b0000': 'red',
  '#7a1f2a': 'burgundy',
  '#9b1c2c': 'burgundy',
  '#800020': 'burgundy',
  // Greens
  '#1f3a2e': 'forest',
  '#1d5c3a': 'forest',
  '#228b22': 'green',
  '#2e7d32': 'green',
  '#50c878': 'emerald',
  '#046307': 'emerald',
  // Blues / navies
  '#050e1a': 'navy',
  '#000080': 'navy',
  '#003153': 'navy',
  '#0000cd': 'blue',
  '#4169e1': 'blue',
  // Blacks / darks
  '#000000': 'black',
  '#1a1a1a': 'black',
  '#2d2d2d': 'black',
  // Pinks / lilacs / purples
  '#ff69b4': 'pink',
  '#ffb6c1': 'pink',
  '#dda0dd': 'lilac',
  '#ee82ee': 'lilac',
  '#800080': 'purple',
  '#6a0dad': 'purple',
}

/**
 * Convert a hex color string to the closest library color name.
 * Falls back to hue-range bucketing for unmapped values.
 */
function hexToColorName(hex) {
  const normalized = hex.toLowerCase().trim()

  // Direct lookup first
  if (HEX_TO_NAME[normalized]) return HEX_TO_NAME[normalized]

  // Parse RGB and convert to hue for range-based bucketing
  const match = normalized.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return 'gold' // can't parse, default fallback

  const r = parseInt(match[1], 16) / 255
  const g = parseInt(match[2], 16) / 255
  const b = parseInt(match[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
  }

  // Very dark → black
  if (lightness < 0.12) return 'black'
  // Very desaturated → silver or white
  if (saturation < 0.12) return lightness > 0.75 ? 'white' : 'silver'
  // Hue buckets
  if (hue >= 30  && hue < 65)  return saturation > 0.4 ? 'gold' : 'champagne'
  if (hue >= 0   && hue < 20)  return lightness < 0.35 ? 'burgundy' : 'red'
  if (hue >= 340 && hue < 360) return lightness < 0.35 ? 'burgundy' : 'red'
  if (hue >= 20  && hue < 30)  return 'copper'
  if (hue >= 65  && hue < 150) return lightness < 0.3 ? 'forest' : 'green'
  if (hue >= 150 && hue < 250) return lightness < 0.3 ? 'navy' : 'blue'
  if (hue >= 250 && hue < 310) return lightness < 0.4 ? 'purple' : 'lilac'
  if (hue >= 310 && hue < 340) return 'pink'
  return 'gold'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize a color input: lowercase, trim, resolve hex if needed.
 */
function normalizeColor(raw) {
  if (!raw) return 'gold'
  const s = String(raw).toLowerCase().trim()
  return s.startsWith('#') ? hexToColorName(s) : s
}

/**
 * Return the family name for a given color name, or 'unknown'.
 */
export function getColorFamily(colorName) {
  const name = String(colorName).toLowerCase().trim()
  for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
    if (colors.includes(name)) return family
  }
  return 'unknown'
}

/**
 * Return all color names belonging to the same family as the given color.
 */
function familyColors(colorName) {
  const family = getColorFamily(colorName)
  return family === 'unknown' ? [] : COLOR_FAMILIES[family]
}

// ─── Main lookup ─────────────────────────────────────────────────────────────

/**
 * Find the best-matching ornament image path.
 *
 * @param {{ shape?: string, color?: string, style?: string }} query
 * @returns {string | null} path string (e.g. '/ornaments/library/ball_gold_ribbed.png') or null
 */
export function findOrnamentImage({ shape, color, style } = {}) {
  const s  = String(shape || 'ball').toLowerCase().trim()
  const c  = normalizeColor(color)
  const st = String(style || '').toLowerCase().trim()

  // Pre-filter to this shape only
  const byShape = ornamentLibrary.filter(e => e.shape === s)
  if (byShape.length === 0) return null

  // 1. Exact match
  const exact = byShape.find(e => e.color === c && e.style === st)
  if (exact) return exact.path

  // 2. Shape + color, any style (alphabetical = first in sorted manifest)
  const sameColor = byShape.filter(e => e.color === c)
  if (sameColor.length > 0) return sameColor[0].path

  // 3. Shape + color-family, any style
  const family = familyColors(c)
  if (family.length > 0) {
    const sameFamily = byShape.filter(e => family.includes(e.color))
    if (sameFamily.length > 0) return sameFamily[0].path
  }

  // 4. Shape only — prefer warm_gold family, else first alphabetically
  const warmGoldColors = COLOR_FAMILIES.warm_gold
  const warmGold = byShape.filter(e => warmGoldColors.includes(e.color))
  if (warmGold.length > 0) return warmGold[0].path
  return byShape[0].path
}
