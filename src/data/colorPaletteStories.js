/**
 * colorPaletteStories.js
 *
 * Color story configs for each of the 8 Color Palette options.
 * Keys must match the exact strings used in the PALETTES array in SleighTheLook.jsx.
 *
 * colors: ordered [base, secondary, accent, ...optional]
 * defaultRatios: one decimal per color, must sum to 1.0
 */

export const colorPaletteStories = {
  'Traditional Red & Green': {
    colors: ['#9E2A2B', '#2D5016', '#C9A84C'],
    defaultRatios: [0.60, 0.28, 0.12],
    description: 'Christmas card classic — cranberry, forest, warm gold',
  },

  'Blue & Silver': {
    colors: ['#1E3A5F', '#C0C7CE', '#F0F4F8'],
    defaultRatios: [0.60, 0.28, 0.12],
    description: 'Crisp, wintery, formal — navy, silver, icy white',
  },

  'Gold & White': {
    colors: ['#D4A93D', '#F8F4ED', '#E8DCC0'],
    defaultRatios: [0.60, 0.28, 0.12],
    description: 'Bright classic — warm gold, crisp white, soft cream',
  },

  'Pink & Rose Gold': {
    colors: ['#C77FA0', '#B47B6D', '#F2DCDC'],
    defaultRatios: [0.60, 0.28, 0.12],
    description: 'Romantic, soft, current — dusty rose, rose gold, blush',
  },

  'Purple & Silver': {
    colors: ['#5D3A6E', '#B5BAC0', '#C7B8D6'],
    defaultRatios: [0.60, 0.28, 0.12],
    description: 'Royal, dramatic, jewel-toned — amethyst, silver, lavender',
  },

  'Natural & Earthy': {
    colors: ['#6B4F3A', '#8A9A7B', '#E8DDC9'],
    defaultRatios: [0.60, 0.28, 0.12],
    description: 'Woodland, organic, calm — walnut, sage, cream linen',
  },

  'Rainbow & Bright': {
    colors: ['#D63A3A', '#E89244', '#E8B43C', '#7AA85B', '#5BA3D0', '#7B5BA8'],
    defaultRatios: [0.18, 0.17, 0.17, 0.17, 0.16, 0.15],
    description: 'Joyful, playful, kid-friendly — true six-color rainbow',
  },

  'Black & Gold': {
    colors: ['#1A1A1A', '#C9A84C', '#D4B896'],
    defaultRatios: [0.55, 0.30, 0.15],
    description: 'Bold, modern, glamorous — matte black, gold, champagne',
  },
}
