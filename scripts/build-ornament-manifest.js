#!/usr/bin/env node
// scripts/build-ornament-manifest.js
// Reads public/ornaments/library/*.png and writes src/data/ornamentLibrary.json

import { readdirSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = join(__dirname, '..')
const libDir    = join(root, 'public', 'ornaments', 'library')
const outDir    = join(root, 'src', 'data')
const outFile   = join(outDir, 'ornamentLibrary.json')

const VALID_SHAPES = new Set(['ball', 'drop', 'star', 'snowflake', 'pinecone', 'bow', 'bell', 'berry'])

const files = readdirSync(libDir)
  .filter(f => f.toLowerCase().endsWith('.png'))
  .sort()

const manifest = []
const skipped  = []

for (const filename of files) {
  // Strip .png, split on underscores
  const base  = filename.slice(0, -4)
  const parts = base.split('_')

  // shape is always parts[0]; style is always parts[last]; color is everything in between
  if (parts.length < 3) {
    skipped.push({ filename, reason: 'too few segments (expected shape_color_style)' })
    continue
  }

  const shape = parts[0]
  const style = parts[parts.length - 1]
  const color = parts.slice(1, -1).join('_')  // handles rose_gold etc.

  if (!VALID_SHAPES.has(shape)) {
    skipped.push({ filename, reason: `unknown shape "${shape}"` })
    continue
  }

  manifest.push({
    filename,
    path:  `/ornaments/library/${filename}`,
    shape,
    color,
    style,
  })
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n')

console.log(`✓ Wrote ${manifest.length} entries to src/data/ornamentLibrary.json`)
if (skipped.length > 0) {
  console.warn(`  Skipped ${skipped.length} file(s):`)
  skipped.forEach(s => console.warn(`    ${s.filename} — ${s.reason}`))
}
