#!/usr/bin/env node
// scripts/optimize-ornaments.js
// Optimizes all PNGs in public/ornaments/library/ in place.
// Resizes to 600×600, compresses with PNG palette optimization.
// Run with: npm run optimize:ornaments

import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const libDir    = join(__dirname, '..', 'public', 'ornaments', 'library')

const files = readdirSync(libDir).filter(f => f.toLowerCase().endsWith('.png')).sort()

let totalBefore = 0
let totalAfter  = 0
let processed   = 0

console.log(`Optimizing ${files.length} PNG(s) in ${libDir}\n`)

for (const filename of files) {
  const filepath = join(libDir, filename)
  const before = statSync(filepath).size

  // Read, resize, compress, overwrite in place
  const optimized = await sharp(filepath)
    .resize(600, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 85, palette: true, compressionLevel: 9 })
    .toBuffer()

  // Write back
  await sharp(optimized).toFile(filepath)

  const after = statSync(filepath).size
  totalBefore += before
  totalAfter  += after
  processed++

  const saved   = before - after
  const pct     = ((saved / before) * 100).toFixed(1)
  const bKB     = (before / 1024).toFixed(0)
  const aKB     = (after  / 1024).toFixed(0)
  console.log(`  ${filename.padEnd(40)} ${bKB.padStart(5)}KB → ${aKB.padStart(5)}KB  (${pct}% saved)`)
}

const totalSaved = totalBefore - totalAfter
console.log(`
─────────────────────────────────────────────────────
  Files processed : ${processed}
  Total before    : ${(totalBefore / 1024 / 1024).toFixed(2)} MB
  Total after     : ${(totalAfter  / 1024 / 1024).toFixed(2)} MB
  Total saved     : ${(totalSaved  / 1024 / 1024).toFixed(2)} MB  (${((totalSaved / totalBefore) * 100).toFixed(1)}%)
  Avg per file    : ${(totalAfter / processed / 1024).toFixed(0)} KB
─────────────────────────────────────────────────────`)
