import { useEffect, useRef } from 'react'
import { CONFIG } from '../shared/config.ts'

const BG = CONFIG.CODE_BG
const HEX = '0123456789abcdef'
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const TAGS = ['EVT', 'NET', 'VEC', 'SYNC', 'SESS', 'TRACK', 'SYS', 'IO', 'ACK']
const PATHS = ['/ingest', '/v1/t', '/stream', '/batch', '/probe', '/sync', '/vec']
const METHODS = ['POST', 'PUT', 'GET']
const KEYS = ['usr', 'vec', 'geo', 'dev', 'sig', 'hid', 'nid', 'pkt']
const STAT = ['ok', 'ack', 'tout', 'nak']
const ASCII = '.·:+*#'

type Line = { text: string; shade: 0 | 1 | 2 }

let lines: Line[] = []
let partial = ''
let partialShade: 0 | 1 | 2 = 1
let queue: Line[] = []
let interacting = false
let linger: ReturnType<typeof setTimeout> | 0 = 0
let raf = 0
let lastFrame = 0
let lastType = 0
let pauseUntil = 0
let burstLeft = 0
let seq = 0
let addr = 0x00a4f0
let reduced = false
let draw: (() => void) | null = null
let seedMix = 0x9e3779b9
let lastIntensity = 0.4
let typed = ''

function mulberry(s: number) {
  return () => {
    s |= 0
    s = s + 0x6d2b79f5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function rngFrom(intensity: number, n: number) {
  const t = Date.now()
  const s = (seedMix ^ Math.floor(intensity * 997) ^ (t * 0x9e3) ^ (n * 0x85eb) ^ seq) >>> 0
  const rnd = mulberry(s || 1)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!
  const hex = (k: number) => {
    let o = ''
    for (let i = 0; i < k; i++) o += HEX[Math.floor(rnd() * 16)]
    return o
  }
  const b64 = (k: number) => {
    let o = ''
    for (let i = 0; i < k; i++) o += B64[Math.floor(rnd() * 64)]
    return o
  }
  const bits = (k: number) => {
    let o = ''
    for (let i = 0; i < k; i++) o += rnd() > 0.5 ? '1' : '0'
    return o
  }
  const u8 = () => Math.floor(rnd() * 256)
  const f = (a: number, p = 2) => (rnd() * a * 2 - a).toFixed(p)
  return { rnd, pick, hex, b64, bits, u8, f, t }
}

function makeLine(intensity: number, n: number): Line {
  const r = rngFrom(intensity, n)
  const fmt = Math.floor(r.rnd() * 8)
  let text = ''
  if (fmt === 0) {
    const iso = new Date(r.t).toISOString()
    text = `${iso} [${r.pick(TAGS)}] s0x${r.hex(2)} ${r.pick(STAT)}`
  } else if (fmt === 1) {
    const d = [r.u8(), r.u8(), r.u8()].map((x) => '0x' + x.toString(16).padStart(2, '0'))
    text = `{"t":${String(r.t).slice(-10)},"k":"${r.hex(4)}","d":[${d.join(',')}]}`
  } else if (fmt === 2) {
    addr = (addr + 0x10) & 0xffffff
    const bytes = Array.from({ length: 8 }, () => r.u8())
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    const ascii = bytes.map((b) => ASCII[b % ASCII.length]).join('')
    text = `${addr.toString(16).toUpperCase().padStart(6, '0')}  ${hex}  |${ascii}|`
  } else if (fmt === 3) {
    const ms = 8 + Math.floor(r.rnd() * 90)
    const kb = (0.1 + r.rnd() * 1.6).toFixed(1)
    text = `[NET] ${r.pick(METHODS)} ${r.pick(PATHS)} ${r.rnd() > 0.12 ? 200 : 204} ${ms}ms id=${r.hex(4)} ${kb}kb`
  } else if (fmt === 4) {
    text = `gyro⟨${r.f(1.2)},${r.f(1.2)},${r.f(1.2)}⟩ ${r.pick(KEYS)}=${r.hex(2)} vel=${(0.2 + r.rnd() * 3.4).toFixed(2)}`
  } else if (fmt === 5) {
    text = `[${r.pick(TAGS)}] sid=${r.hex(8)}-${r.hex(4)} seq=${String(++seq).padStart(4, '0')} ${r.b64(12)}`
  } else if (fmt === 6) {
    text = `seg//0x${r.hex(2).toUpperCase()}  ${r.pick(KEYS)}⟪${r.hex(4)}⟫ push(vec[${r.f(3, 2)},${r.f(3, 2)}])`
  } else {
    text = `node[${Math.floor(r.rnd() * 32)}]→0b${r.bits(4)} cmit? ${r.rnd() > 0.5 ? 'y' : 'n'}  λ=${r.rnd().toFixed(2)}`
  }
  const shade: 0 | 1 | 2 = r.rnd() > 0.82 ? 2 : r.rnd() > 0.35 ? 1 : 0
  return { text, shade }
}

function enqueue(intensity: number) {
  const mag = Math.min(1, Math.max(0.12, intensity))
  lines.push(makeLine(mag, 0))
  if (lines.length > BG.maxLines) lines.splice(0, lines.length - BG.maxLines)
  const n = Math.max(0, Math.round(mag * BG.density * (reduced ? 0.8 : 1.8)))
  for (let i = 0; i < n; i++) queue.push(makeLine(mag, i + 1))
  if (queue.length > 24) queue.splice(0, queue.length - 24)
}

function typeSome(now: number) {
  if (!interacting) return
  if (now < pauseUntil) return
  if (!partial && queue.length) {
    const next = queue.shift()!
    partial = next.text
    partialShade = next.shade
    burstLeft = 6 + Math.floor(Math.random() * 18)
  }
  if (!partial) return
  const rate = (reduced ? 42 : 70 + lastIntensity * 220) * BG.speed
  const dt = Math.min(0.08, (now - lastType) / 1000)
  lastType = now
  let take = Math.max(1, Math.floor(rate * dt))
  take = Math.min(take, burstLeft, partial.length)
  if (take <= 0) return
  // consume from the front into committed lines via a typed-so-far buffer
  typed += partial.slice(0, take)
  partial = partial.slice(take)
  burstLeft -= take
  if (!partial) {
    lines.push({ text: typed, shade: partialShade })
    if (lines.length > BG.maxLines) lines.splice(0, lines.length - BG.maxLines)
    typed = ''
    pauseUntil = now + (reduced ? 70 : 18 + Math.random() * 55)
  } else if (burstLeft <= 0) {
    pauseUntil = now + (reduced ? 90 : 28 + Math.random() * 70)
    burstLeft = 8 + Math.floor(Math.random() * 16)
  }
}

function loop(now: number) {
  raf = 0
  const fps = reduced ? 18 : 30
  if (now - lastFrame < 1000 / fps - 1) {
    if (interacting || typed) raf = requestAnimationFrame(loop)
    return
  }
  lastFrame = now
  typeSome(now)
  draw?.()
  if (interacting || typed) raf = requestAnimationFrame(loop)
}

function kick() {
  if (!raf) {
    lastType = performance.now()
    raf = requestAnimationFrame(loop)
  }
}

export function codePulse(intensity: number) {
  if (!CONFIG.CODE_BG_ENABLED) return
  lastIntensity = Math.min(1, Math.max(0.12, intensity))
  seedMix = seedMix + Math.floor(lastIntensity * 1000) + 1
  interacting = true
  if (linger) {
    clearTimeout(linger)
    linger = 0
  }
  enqueue(intensity)
  kick()
}

export function codeRelease() {
  if (linger) clearTimeout(linger)
  linger = setTimeout(() => {
    linger = 0
    interacting = false
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    draw?.()
  }, BG.lingerMs)
}

export function resetCodeBg() {
  lines = []
  queue = []
  partial = ''
  typed = ''
  interacting = false
  seq = 0
  addr = 0x00a4f0
  if (linger) {
    clearTimeout(linger)
    linger = 0
  }
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  draw?.()
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, blink: boolean) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  const size = BG.fontSize
  const lh = BG.lineHeight
  ctx.font = `${size}px ui-monospace, "SF Mono", Menlo, "Courier New", monospace`
  ctx.textBaseline = 'top'
  const shown: { text: string; shade: 0 | 1 | 2 }[] = lines.map((l) => ({ ...l }))
  const head = typed
  if (head) shown.push({ text: head, shade: partialShade })
  const max = Math.floor((h - 8) / lh)
  const vis = shown.length > max ? shown.slice(shown.length - max) : shown
  let y = 6
  vis.forEach((l, i) => {
    const age = i / Math.max(1, vis.length - 1)
    const col = l.shade === 2 ? BG.bright : l.shade === 0 ? BG.dim : BG.color
    ctx.globalAlpha = 0.28 + age * 0.72
    if (!reduced && l.shade === 2) {
      ctx.shadowColor = BG.color
      ctx.shadowBlur = 6
    } else {
      ctx.shadowBlur = 0
    }
    ctx.fillStyle = col
    ctx.fillText(l.text, 8, y)
    y += lh
  })
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  const cursorOn = interacting && (blink || reduced)
  const solid = !interacting && (typed || vis.length)
  if (cursorOn || solid) {
    const last = typed || vis[vis.length - 1]?.text || ''
    const x = 8 + ctx.measureText(typed ? typed : '').width
    const cy = typed ? y - lh : Math.max(6, y - lh)
    ctx.fillStyle = interacting ? BG.bright : BG.dim
    ctx.globalAlpha = interacting && !reduced ? (blink ? 1 : 0.15) : 0.7
    ctx.fillRect(x, cy, Math.max(6, size * 0.55), size)
    ctx.globalAlpha = 1
    if (!typed && last) {
      // cursor sits at write head after last committed line
    }
  }
}

export default function CodeBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paint(ctx, w, h, true)
    }
    draw = () => {
      const blink = Math.floor(performance.now() / 420) % 2 === 0
      paint(ctx, canvas.clientWidth, canvas.clientHeight, blink)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      if (draw) draw = null
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
  }, [])

  return <canvas ref={ref} className="code-bg" aria-hidden />
}
