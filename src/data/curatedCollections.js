/**
 * curatedCollections.js
 *
 * Data source for the Curated Collections section in Sleigh the Look.
 * Adding a new collection is a data change here — no UI changes needed.
 *
 * status: 'live' | 'coming-soon'
 * heroPlaceholder: true until a real hero image is available.
 * bundlePriceRange: null until bundle pricing is implemented.
 */

// heroImage: replace placeholder paths with real styled collection photos when available.
export const curatedCollections = [
  {
    id:               'gilded-ever-after',
    name:             'Gilded Ever After',
    tagline:          'Champagne, gold, and pearl — timeless luxe',
    heroImage:        '/trees/tree-xlarge.jpg',
    badge:            'NEW',
    status:           'live',
  },
  {
    id:               'crimson-enchantment',
    name:             'Crimson Enchantment',
    tagline:          'Deep red, gold, and cream — classic warmth',
    heroImage:        '/trees/tree-large.jpg',
    badge:            null,
    status:           'coming-soon',
  },
  {
    id:               'silver-snow',
    name:             'Silver & Snow',
    tagline:          'Crimson, silver, and white — wintery sparkle',
    heroImage:        '/trees/tree-medium.jpg',
    badge:            null,
    status:           'coming-soon',
  },
  {
    id:               'frozen-in-time',
    name:             'Frozen in Time',
    tagline:          'White, silver, and icy blue — crystalline calm',
    heroImage:        '/trees/tree-small.jpg',
    badge:            null,
    status:           'coming-soon',
  },
  {
    id:               'hearth-holly',
    name:             'Hearth & Holly',
    tagline:          'Berry red, plaid, and natural — farmhouse charm',
    heroImage:        '/trees/tree-medium.jpg',
    badge:            null,
    status:           'coming-soon',
  },
]
