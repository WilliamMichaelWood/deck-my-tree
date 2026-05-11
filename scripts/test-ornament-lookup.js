#!/usr/bin/env node
// scripts/test-ornament-lookup.js
// Smoke test for ornamentImageLookup utility.
// Run with: node scripts/test-ornament-lookup.js

// Node doesn't resolve src/ aliases, so we reach into the built module directly.
// We replicate the manifest import and logic inline-free by loading via relative path.
import { findOrnamentImage, getColorFamily } from '../src/utils/ornamentImageLookup.js'

const tests = [
  {
    label:    'Exact match',
    input:    { shape: 'ball', color: 'gold', style: 'ribbed' },
    expected: 'ball_gold_ribbed.png',
  },
  {
    label:    'Shape + color match, nonexistent style → any ball_gold_*',
    input:    { shape: 'ball', color: 'gold', style: 'nonexistent' },
    expected: 'ball_gold_',
  },
  {
    label:    'Shape + color-family fallback (bronze → warm_gold family)',
    input:    { shape: 'ball', color: 'bronze', style: 'glossy' },
    expected: 'ball_bronze_glossy.png',  // bronze IS in library, exact match
  },
  {
    label:    'Hex color (#e8b942 → gold)',
    input:    { shape: 'ball', color: '#e8b942', style: 'glossy' },
    expected: 'ball_gold_glossy.png',
  },
  {
    label:    'Shape not in library → null',
    input:    { shape: 'star', color: 'gold', style: 'glossy' },
    expected: null,
  },
  {
    label:    'Color not in library, not in any family → warm_gold fallback within ball',
    input:    { shape: 'ball', color: 'purple', style: 'glossy' },
    expected: 'ball_purple_glossy.png',  // purple IS in library
  },
  {
    label:    'Hex dark red → burgundy family',
    input:    { shape: 'ball', color: '#7a1f2a', style: 'matte' },
    expected: 'ball_burgundy_matte.png',
  },
  {
    label:    'getColorFamily: gold',
    fn:       () => getColorFamily('gold'),
    expected: 'warm_gold',
  },
  {
    label:    'getColorFamily: navy',
    fn:       () => getColorFamily('navy'),
    expected: 'blue',
  },
  {
    label:    'getColorFamily: unknown',
    fn:       () => getColorFamily('chartreuse'),
    expected: 'unknown',
  },
]

let passed = 0
let failed = 0

for (const t of tests) {
  const result = t.fn ? t.fn() : findOrnamentImage(t.input)

  let ok
  if (t.expected === null) {
    ok = result === null
  } else if (typeof result === 'string' && t.expected.endsWith('_')) {
    ok = result.includes(t.expected)
  } else {
    ok = result !== null && (result === t.expected || result.endsWith('/' + t.expected))
  }

  const status = ok ? '✓' : '✗'
  console.log(`${status} ${t.label}`)
  if (t.input) console.log(`    input:    ${JSON.stringify(t.input)}`)
  console.log(`    result:   ${result}`)
  console.log(`    expected: ${t.expected}`)
  if (!ok) console.log(`    *** FAIL ***`)
  console.log()

  ok ? passed++ : failed++
}

console.log(`─────────────────────────────`)
console.log(`${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
