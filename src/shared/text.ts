import { CONFIG } from './config.ts'

/** True if the text contains a blocklisted word (also catches simple l33t spellings). */
export function isBlocked(text: string): boolean {
  const norm = text
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
  const squashed = norm.replace(/[^a-z]/g, '')
  const words = norm.split(/[^a-z]+/).filter(Boolean)
  return CONFIG.BLOCKLIST.some((w) => words.includes(w) || (w.length >= 5 && squashed.includes(w)))
}

/** Letters, numbers, spaces and a little punctuation only; trimmed and length-limited. */
export function cleanShortText(text: unknown, max = 40): string | null {
  if (typeof text !== 'string') return null
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t || t.length > max) return null
  if (!/^[\p{L}\p{N} '\-.,&/]+$/u.test(t)) return null
  return t
}

export const clampInt = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null

/** Replace whole words/phrases in one pass (longest match first), keeping the first letter's capitalisation. */
export function swapWords(text: string, map: Record<string, string>): string {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length)
  if (!keys.length) return text
  const lower = Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]))
  const re = new RegExp(`\\b(${keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
  return text.replace(re, (m) => {
    const to = lower[m.toLowerCase()]
    return m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to
  })
}

/** Deterministic pseudo-random pick, so mock output is stable for the same settings. */
export function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(Math.floor(seed)) % items.length]
}
