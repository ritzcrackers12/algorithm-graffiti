// GENERATED COPY of src/shared/text.ts. Edit that file instead, then run `npm run sync-shared`.
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

/** Replace whole words/phrases, keeping the capitalisation of the first letter. */
export function swapWords(text: string, map: Record<string, string>): string {
  let out = text
  for (const [from, to] of Object.entries(map)) {
    const re = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    out = out.replace(re, (m) => (m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to))
  }
  return out
}

/** Deterministic pseudo-random pick, so mock output is stable for the same settings. */
export function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(Math.floor(seed)) % items.length]
}
