// Draws the Home Screen app icons (PNG) with no image libraries. Run once: node scripts/make-app-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x / size, y / size)
      const i = y * (size * 4 + 1) + 1 + x * 4
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

// Deep XP blue, a green block progress bar, and a magenta paint drip.
const draw = (x, y) => {
  const top = [36, 94, 220], bottom = [10, 36, 106]
  let c = top.map((t, i) => Math.round(t + (bottom[i] - t) * y))
  const inBar = y > 0.56 && y < 0.7 && x > 0.14 && x < 0.86
  if (inBar) {
    c = [255, 255, 255]
    const bx = (x - 0.17) / 0.66
    if (y > 0.58 && y < 0.68 && bx > 0 && bx < 0.78 && (bx * 9) % 1 < 0.78) c = [49, 211, 66]
  }
  const dx = x - 0.5, dy = y - 0.32
  if (dx * dx + dy * dy < 0.028 || (Math.abs(dx - 0.06) < 0.025 && y > 0.32 && y < 0.5)) c = [255, 46, 160]
  return [...c, 255]
}

for (const size of [180, 192, 512]) writeFileSync(`public/app-icon-${size}.png`, png(size, draw))
console.log('icons written')
