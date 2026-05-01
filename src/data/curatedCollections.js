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

export const curatedCollections = [
  {
    id:               'gilded-ever-after',
    name:             'Gilded Ever After',
    author:           'Deck My Tree',
    tagline:          'Champagne, gold, and pearl — timeless luxe',
    heroPlaceholder:  true,
    bundlePriceRange: null,
    status:           'live',
  },
  {
    id:               'crimson-enchantment',
    name:             'Crimson Enchantment',
    author:           'Deck My Tree',
    tagline:          'Deep red, gold, and cream — classic warmth',
    heroPlaceholder:  true,
    bundlePriceRange: null,
    status:           'coming-soon',
  },
  {
    id:               'silver-snow',
    name:             'Silver & Snow',
    author:           'Deck My Tree',
    tagline:          'Crimson, silver, and white — wintery sparkle',
    heroPlaceholder:  true,
    bundlePriceRange: null,
    status:           'coming-soon',
  },
  {
    id:               'frozen-in-time',
    name:             'Frozen in Time',
    author:           'Deck My Tree',
    tagline:          'White, silver, and icy blue — crystalline calm',
    heroPlaceholder:  true,
    bundlePriceRange: null,
    status:           'coming-soon',
  },
  {
    id:               'hearth-holly',
    name:             'Hearth & Holly',
    author:           'Deck My Tree',
    tagline:          'Berry red, plaid, and natural — farmhouse charm',
    heroPlaceholder:  true,
    bundlePriceRange: null,
    status:           'coming-soon',
  },
]
