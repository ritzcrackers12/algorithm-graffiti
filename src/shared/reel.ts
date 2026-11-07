import { isBlocked } from './text.ts'

export type ReelRating = 'HIGH' | 'MEDIUM' | 'LOW'
export type ReelPhase = 'word' | 'playing' | 'rate' | 'done'

const ENERGY = ['low', 'medium', 'high'] as const
export type Energy = (typeof ENERGY)[number]

export interface ReelRow {
  id: string
  file: string
  link: string
  creator: string
  topic: string
  subtopic: string
  audience: string
  mood: string
  energy: Energy | string
  format: string
  vibe: string
  depth: number
  keywords: string
  description: string
  notes: string
  curator_notes: string
  sponsored: boolean
  ad_category: string
  transcript: string
  videoUrl: string
  embedding?: number[] | null
}

export interface ReelRoundLog {
  reelId: string
  rating: ReelRating | null
  hesitationMs: number
  depth: number
  topic: string
  subtopic: string
  audience: string
  mood: string
  energy: string
  format: string
  vibe: string
  keywords: string
  sponsored: boolean
}

export interface ReelResult {
  word: string
  phase: ReelPhase
  currentId: string | null
  videoUrl: string | null
  rounds: ReelRoundLog[]
  usedIds: string[]
  sessionLine: string
  source: 'ai' | 'mock' | 'fallback' | 'cap'
  at: number
}

export function rowFromRecord(r: Record<string, unknown>): ReelRow {
  return {
    id: String(r.id ?? ''),
    file: String(r.file ?? ''),
    link: String(r.link ?? ''),
    creator: String(r.creator ?? ''),
    topic: String(r.topic ?? ''),
    subtopic: String(r.subtopic ?? ''),
    audience: String(r.audience ?? ''),
    mood: String(r.mood ?? ''),
    energy: parseEnergy(r.energy),
    format: String(r.format ?? ''),
    vibe: String(r.vibe ?? ''),
    depth: parseDepth(r.depth),
    keywords: String(r.keywords ?? ''),
    description: String(r.description ?? ''),
    notes: String(r.notes ?? ''),
    curator_notes: String(r.curator_notes ?? ''),
    sponsored: sponsoredYes(r.sponsored),
    ad_category: String(r.ad_category ?? ''),
    transcript: String(r.transcript ?? ''),
    videoUrl: String(r.video_url ?? r.videoUrl ?? ''),
    embedding: Array.isArray(r.embedding) ? r.embedding as number[] : null,
  }
}

export function parseDepth(v: unknown): number {
  const n = parseInt(String(v ?? ''), 10)
  return n >= 1 && n <= 5 ? n : 2
}

export function parseEnergy(v: unknown): Energy {
  const s = String(v ?? '').toLowerCase()
  return s === 'low' || s === 'high' ? s : 'medium'
}

export function sponsoredYes(v: unknown): boolean {
  return String(v ?? '').trim().toLowerCase() === 'yes' || v === true
}

export function cleanWord(raw: unknown): { word: string } | { blocked: true } | { invalid: true } {
  if (typeof raw !== 'string') return { invalid: true }
  const word = raw.replace(/\s+/g, ' ').trim()
  if (!word || word.length > 32) return { invalid: true }
  if (/\s/.test(word)) return { invalid: true }
  if (!/^[\p{L}\p{N}']+$/u.test(word)) return { invalid: true }
  if (isBlocked(word)) return { blocked: true }
  return { word: word.toLowerCase() }
}

export function cosine(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const den = Math.sqrt(na) * Math.sqrt(nb)
  return den ? d / den : 0
}

export function overlapScore(word: string, reel: ReelRow): number {
  const hay = [reel.topic, reel.subtopic, reel.audience, reel.mood, reel.vibe, reel.format, reel.keywords, reel.description, reel.transcript, reel.curator_notes, reel.notes]
    .join(' ')
    .toLowerCase()
  const w = word.toLowerCase()
  let n = 0
  if (hay.includes(w)) n += 3
  for (const t of hay.split(/[^a-z0-9]+/).filter((x) => x.length > 2)) {
    if (t === w) n += 2
    else if (t.startsWith(w) || w.startsWith(t)) n += 1
  }
  return n
}

function notesBlock(reel: ReelRow, used: string[], last: ReelRating | null, roundIndex: number): string | null {
  const n = (reel.notes || '').toLowerCase()
  if (!n) return null
  if (/never first|not first|don't open|do not open/.test(n) && roundIndex === 0) return 'never first'
  if (/only after a high/.test(n) && last !== 'HIGH') return 'only after HIGH'
  if (/good opener|opener/.test(n) && roundIndex > 0 && used.length) return null
  return null
}

export function interpretNotes(library: ReelRow[]): string[] {
  const leftover: string[] = []
  for (const r of library) {
    const n = (r.notes || '').trim()
    if (!n) continue
    const known = /never first|not first|only after a high|good opener|opener/i.test(n)
    if (!known) leftover.push(`${r.id}: ${n}`)
  }
  return leftover
}

function energyOk(from: string, to: string, rating: ReelRating | null): boolean {
  if (!rating || rating === 'LOW') return true
  const i = ENERGY.indexOf(parseEnergy(from))
  const j = ENERGY.indexOf(parseEnergy(to))
  if (i < 0 || j < 0) return true
  return Math.abs(i - j) <= 1
}

export function pickFirst(library: ReelRow[], word: string, wordVec: number[] | null, mock: boolean): ReelRow | null {
  const openers = library.filter((r) => /good opener|opener/i.test(r.notes || ''))
  const pool = library.filter((r) => !notesBlock(r, [], null, 0))
  const scored = (pool.length ? pool : library).map((r) => {
    const meaning = mock || !wordVec ? overlapScore(word, r) : cosine(wordVec, r.embedding)
    const depthPref = r.depth <= 2 ? 0.15 : overlapScore(word, r) >= 3 ? 0.1 : -0.2
    const opener = openers.some((o) => o.id === r.id) ? 0.05 : 0
    return { r, s: meaning + depthPref + opener }
  })
  scored.sort((a, b) => b.s - a.s)
  return scored[0]?.r ?? library[0] ?? null
}

export function pickNext(
  library: ReelRow[],
  used: string[],
  current: ReelRow,
  rating: ReelRating,
  wordVec: number[] | null,
  mock: boolean,
): ReelRow | null {
  const left = library.filter((r) => !used.includes(r.id) && r.id !== current.id)
  if (!left.length) return null
  const roundIndex = used.length
  const last = rating
  const candidates = left.filter((r) => !notesBlock(r, used, last, roundIndex))
  const pool = candidates.length ? candidates : left

  const meaning = (r: ReelRow) =>
    mock || !wordVec ? overlapScore([current.topic, current.subtopic, current.keywords, current.description].join(' '), r) : cosine(wordVec, r.embedding)

  const scored = pool.map((r) => {
    let s = 0
    const sameAud = r.audience && current.audience && r.audience.toLowerCase() === current.audience.toLowerCase()
    const sameTopic = r.topic && current.topic && r.topic.toLowerCase() === current.topic.toLowerCase()
    const sameMood = r.mood && current.mood && r.mood.toLowerCase() === current.mood.toLowerCase()
    const sameFmt = r.format && current.format && r.format.toLowerCase() === current.format.toLowerCase()
    if (rating === 'HIGH') {
      if (sameAud) s += 3
      if (r.depth === Math.min(5, current.depth + 1)) s += 2
      else if (r.depth >= current.depth) s += 0.5
      if (!sameFmt) s += 0.8
      s += meaning(r) * 0.3
    } else if (rating === 'MEDIUM') {
      if (sameAud || sameTopic) s += 3
      if (r.depth === current.depth) s += 1.5
      s += meaning(r)
    } else {
      if (!sameAud) s += 3
      if (!sameTopic) s += 1.5
      if (!sameMood) s += 1
      if (r.depth === Math.max(1, current.depth - 1)) s += 2
    }
    if (!energyOk(current.energy, r.energy, rating)) s -= 4
    return { r, s }
  })
  scored.sort((a, b) => b.s - a.s)
  return scored[0]?.r ?? pool[0] ?? null
}

export function logRound(reel: ReelRow, rating: ReelRating | null, hesitationMs: number): ReelRoundLog {
  return {
    reelId: reel.id,
    rating,
    hesitationMs,
    depth: reel.depth,
    topic: reel.topic,
    subtopic: reel.subtopic,
    audience: reel.audience,
    mood: reel.mood,
    energy: String(reel.energy),
    format: reel.format,
    vibe: reel.vibe,
    keywords: reel.keywords,
    sponsored: reel.sponsored,
  }
}

export function sessionLine(rounds: ReelRoundLog[]): string {
  const high = rounds.filter((r) => r.rating === 'HIGH')
  const audiences = [...new Set(high.map((r) => r.audience).filter(Boolean).map((a) => a.toUpperCase()))]
  const seg = audiences.length ? audiences.join(' / ') : 'UNASSIGNED'
  const depths = rounds.map((r) => r.depth)
  const maxD = depths.length ? Math.max(...depths) : 0
  const path = depths.length ? depths.join('→') : '—'
  const sponsored = rounds.filter((r) => r.sponsored).map((r) => r.reelId)
  const bits = [
    `AUDIENCE SEGMENT: ${seg}`,
    `MAX DEPTH: ${maxD}`,
    `PATH: ${path}`,
  ]
  if (sponsored.length) bits.push(`SPONSORED ITEMS: ${sponsored.join(', ')}`)
  const lastSpon = rounds.filter((r) => r.sponsored).at(-1)
  if (lastSpon?.rating) bits.push(`SPONSORED RATING: ${lastSpon.rating}`)
  return bits.join(' · ')
}

export function emptyReelResult(): ReelResult {
  return {
    word: '',
    phase: 'word',
    currentId: null,
    videoUrl: null,
    rounds: [],
    usedIds: [],
    sessionLine: '',
    source: 'mock',
    at: Date.now(),
  }
}
