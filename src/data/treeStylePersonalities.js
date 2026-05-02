/**
 * treeStylePersonalities.js
 *
 * Design personality configs for each of the 8 Tree Style options.
 * Used by generateDynamicStyleConfig() to shape ornament type
 * distribution, density, sizing, color ratios, and placement looseness.
 *
 * ornamentTypeDistribution values must sum to 1.0.
 * colorRatioOverride, if set, overrides the palette's defaultRatios.
 */

export const treeStylePersonalities = {
  Classic: {
    ornamentTypeDistribution: { ball: 0.45, textural: 0.22, statement: 0.13, reflective: 0.13, wildcard: 0.07 },
    densityMultiplier: 1.0,
    avgOrnamentSizeMultiplier: 1.0,
    colorRatioOverride: null,
    placementLooseness: 'standard',
    description: 'Traditional, balanced, the default everyone recognizes',
  },

  Modern: {
    ornamentTypeDistribution: { ball: 0.30, textural: 0.05, statement: 0.25, reflective: 0.35, wildcard: 0.05 },
    densityMultiplier: 0.75,
    avgOrnamentSizeMultiplier: 1.15,
    colorRatioOverride: [0.70, 0.25, 0.05],
    placementLooseness: 'tight',
    description: 'Minimalist, intentional, lots of negative space',
  },

  Rustic: {
    ornamentTypeDistribution: { ball: 0.30, textural: 0.50, statement: 0.08, reflective: 0.04, wildcard: 0.08 },
    densityMultiplier: 1.0,
    avgOrnamentSizeMultiplier: 1.0,
    colorRatioOverride: [0.50, 0.30, 0.20],
    placementLooseness: 'loose',
    description: 'Cozy, natural, handmade, collected not arranged',
  },

  Whimsical: {
    ornamentTypeDistribution: { ball: 0.40, textural: 0.15, statement: 0.15, reflective: 0.10, wildcard: 0.20 },
    densityMultiplier: 1.10,
    avgOrnamentSizeMultiplier: 0.95,
    colorRatioOverride: [0.50, 0.25, 0.25],
    placementLooseness: 'loose',
    description: 'Playful, unexpected, charming, lots of wildcards',
  },

  Elegant: {
    ornamentTypeDistribution: { ball: 0.35, textural: 0.10, statement: 0.20, reflective: 0.30, wildcard: 0.05 },
    densityMultiplier: 1.0,
    avgOrnamentSizeMultiplier: 1.10,
    colorRatioOverride: [0.65, 0.25, 0.10],
    placementLooseness: 'tight',
    description: 'Refined, formal, sophisticated',
  },

  Scandinavian: {
    ornamentTypeDistribution: { ball: 0.25, textural: 0.50, statement: 0.15, reflective: 0.05, wildcard: 0.05 },
    densityMultiplier: 0.75,
    avgOrnamentSizeMultiplier: 0.85,
    colorRatioOverride: [0.75, 0.25],
    placementLooseness: 'standard',
    description: 'Spare, calm, IKEA-flavored — wooden cutouts, woven straw, felt, paper geometrics',
  },

  Coastal: {
    ornamentTypeDistribution: { ball: 0.35, textural: 0.35, statement: 0.10, reflective: 0.10, wildcard: 0.10 },
    densityMultiplier: 1.0,
    avgOrnamentSizeMultiplier: 1.0,
    colorRatioOverride: [0.55, 0.25, 0.15, 0.05],
    placementLooseness: 'loose',
    description: 'Breezy, layered, organic, unexpected coastal motifs in wildcard',
  },

  Maximalist: {
    ornamentTypeDistribution: { ball: 0.35, textural: 0.20, statement: 0.15, reflective: 0.20, wildcard: 0.10 },
    densityMultiplier: 1.30,
    avgOrnamentSizeMultiplier: 1.0,
    colorRatioOverride: [0.40, 0.30, 0.20, 0.10],
    placementLooseness: 'standard',
    description: 'More is more, densely packed, all four color slots active',
  },
}
