import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public', 'icon.svg'))

const iconDir = join(root, 'public', 'icons')
mkdirSync(iconDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(iconDir, `icon-${size}.png`))
  console.log(`✓ icons/icon-${size}.png`)
}

// Apple touch icon (180×180, rounded corners handled by iOS)
await sharp(svg).resize(180, 180).png().toFile(join(root, 'public', 'apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png')
