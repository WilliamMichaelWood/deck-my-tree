/**
 * positionOrnaments.js
 * 
 * Deck My Tree — Responsive ornament positioning algorithm.
 * 
 * Generates frozen ornament coordinates for static tree images.
 * Same algorithm serves Sleigh the Look (now) and Tree Advisor (later).
 * Re-runs cleanly when real API ornament dimensions arrive.
 * 
 * Design principles (from reference photos):
 *   - Size hierarchy: focal/medium/accent in 20/50/30 ratio
 *   - Edge-weighted: ornaments hang at outer 60-70% of canopy depth
 *   - Cluster-friendly: small clusters allowed at branch points
 *   - Zone distribution: 25% top / 40% middle / 35% bottom (bottom-heavy)
 *   - Apex protection: top 10% reserved for topper
 *   - Focals never overlap; mediums lightly overlap; accents tuck in
 */

// ---------- TUNING CONSTANTS (adjust these to tune the look) ----------

const APEX_RESERVE_PCT = 0.10;          // Top 10% reserved for topper
const ZONE_DISTRIBUTION = {              // How featured ornaments split across zones
  top:    0.25,
  middle: 0.40,
  bottom: 0.35,
};
const ZONE_BOUNDARIES = {                // Where zones start/end (% of foliage height)
  topStart:    0.10,    // After apex reserve
  topEnd:      0.35,
  middleEnd:   0.70,
  bottomEnd:   1.00,
};
const EDGE_WEIGHT = 0.65;                // 0=center-only, 1=edge-only. 0.65 = mostly edge, some interior
const MAX_PLACEMENT_ATTEMPTS = 80;       // Tries per ornament before giving up
const SPACING_RULES = {                  // Min center-to-center distance as multiple of larger ornament's radius
  focalToFocal:    2.4,
  focalToMedium:   1.6,
  focalToAccent:   1.2,
  mediumToMedium:  1.4,                  // Allows light overlap
  mediumToAccent:  1.0,
  accentToAccent:  0.8,                  // Accents can tuck in tight
};

// ---------- HELPERS ----------

/**
 * Get tree width at a given Y coordinate using the width profile.
 * Returns { left, right, centerX, width } or null if outside foliage.
 */
function getTreeWidthAt(treeConfig, y) {
  const profile = treeConfig.treeBounds.widthProfile;
  if (!profile || profile.length === 0) return null;

  // Find profile point at or just above this Y
  let lower = null, upper = null;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i].y <= y) lower = profile[i];
    if (profile[i].y >= y && upper === null) upper = profile[i];
  }
  if (!lower) lower = profile[0];
  if (!upper) upper = profile[profile.length - 1];

  // Linear interpolate between the two profile points
  if (lower.y === upper.y) {
    return {
      left: lower.left,
      right: lower.right,
      centerX: (lower.left + lower.right) / 2,
      width: lower.right - lower.left,
    };
  }
  const t = (y - lower.y) / (upper.y - lower.y);
  const left = lower.left + (upper.left - lower.left) * t;
  const right = lower.right + (upper.right - lower.right) * t;
  return {
    left,
    right,
    centerX: (left + right) / 2,
    width: right - left,
  };
}

/**
 * Determine which zone a Y coordinate falls into.
 */
function getZoneAtY(treeConfig, y) {
  const { bbox } = treeConfig.treeBounds;
  const foliageBaseY = treeConfig.treeBounds.foliageBaseY;
  const foliageH = foliageBaseY - bbox.y;
  const yRel = (y - bbox.y) / foliageH;

  if (yRel < ZONE_BOUNDARIES.topStart) return 'apex';
  if (yRel < ZONE_BOUNDARIES.topEnd) return 'top';
  if (yRel < ZONE_BOUNDARIES.middleEnd) return 'middle';
  if (yRel < ZONE_BOUNDARIES.bottomEnd) return 'bottom';
  return 'base';
}

/**
 * Get the Y range for a target zone.
 */
function getZoneYRange(treeConfig, zone) {
  const { bbox } = treeConfig.treeBounds;
  const foliageBaseY = treeConfig.treeBounds.foliageBaseY;
  const foliageH = foliageBaseY - bbox.y;
  const ranges = {
    top:    [bbox.y + foliageH * ZONE_BOUNDARIES.topStart, bbox.y + foliageH * ZONE_BOUNDARIES.topEnd],
    middle: [bbox.y + foliageH * ZONE_BOUNDARIES.topEnd,   bbox.y + foliageH * ZONE_BOUNDARIES.middleEnd],
    bottom: [bbox.y + foliageH * ZONE_BOUNDARIES.middleEnd, bbox.y + foliageH * ZONE_BOUNDARIES.bottomEnd],
  };
  return ranges[zone];
}

/**
 * Distance between two ornament centers.
 */
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Required minimum spacing between two ornaments based on their size categories.
 */
function requiredSpacing(ornA, ornB) {
  const radiusA = Math.max(ornA.width, ornA.height) / 2;
  const radiusB = Math.max(ornB.width, ornB.height) / 2;
  const baseDist = radiusA + radiusB;

  const sizes = [ornA.sizeCategory, ornB.sizeCategory].sort().join('-');
  const ruleMap = {
    'focal-focal':   SPACING_RULES.focalToFocal,
    'focal-medium':  SPACING_RULES.focalToMedium,
    'accent-focal':  SPACING_RULES.focalToAccent,
    'medium-medium': SPACING_RULES.mediumToMedium,
    'accent-medium': SPACING_RULES.mediumToAccent,
    'accent-accent': SPACING_RULES.accentToAccent,
  };
  const multiplier = ruleMap[sizes] || 1.0;
  return baseDist * multiplier;
}

/**
 * Check whether a candidate position would overlap any existing placement.
 */
function hasOverlap(candidate, placed) {
  for (const p of placed) {
    if (distance(candidate, p) < requiredSpacing(candidate, p)) {
      return true;
    }
  }
  return false;
}

/**
 * Check whether a position is inside the tree foliage with margin for ornament size.
 */
function isInsideFoliage(x, y, ornament, treeConfig) {
  const widthAtY = getTreeWidthAt(treeConfig, y);
  if (!widthAtY) return false;

  const ornHalfW = ornament.width / 2;
  // Pull ornament inward by 25% of its width so it visually attaches to a branch
  const insetMargin = ornHalfW * 0.5;

  return x >= (widthAtY.left + insetMargin) && x <= (widthAtY.right - insetMargin);
}

/**
 * Generate a candidate position for an ornament within a target zone.
 * Uses edge-weighted random placement.
 */
function generateCandidate(ornament, zone, treeConfig, rng) {
  const [yStart, yEnd] = getZoneYRange(treeConfig, zone);
  const y = yStart + rng() * (yEnd - yStart);

  const widthAtY = getTreeWidthAt(treeConfig, y);
  if (!widthAtY || widthAtY.width < ornament.width * 1.2) return null;

  const ornHalfW = ornament.width / 2;
  const insetMargin = ornHalfW * 0.5;
  const usableLeft = widthAtY.left + insetMargin;
  const usableRight = widthAtY.right - insetMargin;
  const usableWidth = usableRight - usableLeft;
  if (usableWidth <= 0) return null;

  // Edge-weighted: bias placement toward outer 60-70% of the row.
  // Generate random t in [0,1], reshape with edge weighting
  let t = rng();
  // Convert linear random to edge-weighted: |t-0.5| pushed toward 0 or 1
  if (rng() < EDGE_WEIGHT) {
    // Edge placement: t goes to outer 30% on either side
    const edgeT = rng() < 0.5 ? rng() * 0.3 : 0.7 + rng() * 0.3;
    t = edgeT;
  }
  // Otherwise t stays uniform (interior placement)

  const x = usableLeft + t * usableWidth;

  return {
    x,
    y,
    width: ornament.width,
    height: ornament.height,
    sizeCategory: ornament.sizeCategory,
  };
}

/**
 * Seedable random number generator for reproducible layouts.
 * mulberry32 — simple, fast, well-distributed.
 */
function makeRng(seed) {
  let state = seed >>> 0;
  return function() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- MAIN ALGORITHM ----------

/**
 * Position ornaments on a tree.
 * 
 * @param {Object} treeConfig - One of the frozen tree configurations
 * @param {Array} ornaments - Array of ornament objects with { id, type, sizeCategory, width, height, color }
 * @param {Object} [options] - { seed: number for reproducibility }
 * @returns {Object} { positions: [{ ornamentId, x, y, zone }], unplaced: [...ids] }
 */
export function positionOrnaments(treeConfig, ornaments, options = {}) {
  const seed = options.seed || 42;
  const rng = makeRng(seed);

  // Sort ornaments: focals first (largest, hardest to place), then mediums, then accents
  const sortOrder = { focal: 0, medium: 1, accent: 2 };
  const sortedOrnaments = [...ornaments].sort(
    (a, b) => sortOrder[a.sizeCategory] - sortOrder[b.sizeCategory]
  );

  // Distribute across zones based on ZONE_DISTRIBUTION.
  // Each ornament gets assigned a zone based on its index within its size category.
  const byCategory = { focal: [], medium: [], accent: [] };
  for (const orn of sortedOrnaments) {
    if (byCategory[orn.sizeCategory]) byCategory[orn.sizeCategory].push(orn);
  }

  const placementQueue = [];
  for (const category of ['focal', 'medium', 'accent']) {
    const items = byCategory[category];
    const total = items.length;
    const counts = {
      top:    Math.round(total * ZONE_DISTRIBUTION.top),
      middle: Math.round(total * ZONE_DISTRIBUTION.middle),
      bottom: total - Math.round(total * ZONE_DISTRIBUTION.top) - Math.round(total * ZONE_DISTRIBUTION.middle),
    };
    let idx = 0;
    for (const zone of ['top', 'middle', 'bottom']) {
      for (let i = 0; i < counts[zone]; i++) {
        if (idx < items.length) {
          placementQueue.push({ ornament: items[idx], targetZone: zone });
          idx++;
        }
      }
    }
  }

  const placed = [];
  const positions = [];
  const unplaced = [];

  for (const { ornament, targetZone } of placementQueue) {
    let success = false;
    let candidate = null;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      candidate = generateCandidate(ornament, targetZone, treeConfig, rng);
      if (!candidate) continue;
      if (!isInsideFoliage(candidate.x, candidate.y, ornament, treeConfig)) continue;
      if (hasOverlap(candidate, placed)) continue;
      success = true;
      break;
    }

    if (success) {
      placed.push(candidate);
      positions.push({
        ornamentId: ornament.id,
        x: Math.round(candidate.x),
        y: Math.round(candidate.y),
        width: ornament.width,
        height: ornament.height,
        sizeCategory: ornament.sizeCategory,
        type: ornament.type,
        color: ornament.color,
        zone: targetZone,
      });
    } else {
      unplaced.push(ornament.id);
    }
  }

  return { positions, unplaced };
}

/**
 * Generate placeholder ornaments for a tree based on size category counts.
 * Used to pre-generate frozen JSONs before real API data exists.
 * 
 * Sizes are computed as a percentage of tree width:
 *   focal:  10-12%
 *   medium: 6-8%
 *   accent: 3-5%
 */
export function generatePlaceholderOrnaments(treeConfig, counts) {
  const treeWidth = treeConfig.treeBounds.bbox.w;
  const ornaments = [];
  let id = 1;

  const sizeRanges = {
    focal:  [0.10, 0.12],
    medium: [0.06, 0.08],
    accent: [0.03, 0.05],
  };

  // Use seeded RNG for reproducible sizes
  const rng = makeRng(treeConfig.treeId.length * 17 + 13);

  for (const [category, count] of Object.entries(counts)) {
    const [minPct, maxPct] = sizeRanges[category];
    for (let i = 0; i < count; i++) {
      const sizePct = minPct + rng() * (maxPct - minPct);
      const size = Math.round(treeWidth * sizePct);
      ornaments.push({
        id: `${category}_${id++}`,
        type: 'ball',
        sizeCategory: category,
        width: size,
        height: size,
        color: '#c9a84c',
      });
    }
  }

  return ornaments;
}
