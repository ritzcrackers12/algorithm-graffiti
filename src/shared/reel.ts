import { isBlocked } from './text.ts'
import type { VisitorProfile } from './profile.ts'

export type ReelRating = 'HIGH' | 'MEDIUM' | 'LOW'
export type ReelPhase = 'idle' | 'word' | 'playing' | 'rate' | 'done'

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
  /** Next sponsored clip to buffer while the current one plays. */
  prefetchId: string | null
}

export function playableUrl(id: string): string {
  return `content/reels/${id}.mp4`
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
    videoUrl: String(r.id ?? '') ? playableUrl(String(r.id)) : String(r.video_url ?? r.videoUrl ?? ''),
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

export const AFFINITY_KEY = 'reel_affinity'

const AFFINITY_FIELDS = ['audience', 'topic', 'subtopic', 'mood', 'energy', 'format', 'vibe', 'keywords', 'depth'] as const
type AffinityField = (typeof AFFINITY_FIELDS)[number]

export interface CrowdAffinity {
  n: number
  audience: Record<string, number>
  topic: Record<string, number>
  subtopic: Record<string, number>
  mood: Record<string, number>
  energy: Record<string, number>
  format: Record<string, number>
  vibe: Record<string, number>
  keywords: Record<string, number>
  depth: Record<string, number>
}

export function emptyAffinity(): CrowdAffinity {
  return {
    n: 0, audience: {}, topic: {}, subtopic: {}, mood: {},
    energy: {}, format: {}, vibe: {}, keywords: {}, depth: {},
  }
}

export function parseAffinity(raw: unknown): CrowdAffinity {
  const a = emptyAffinity()
  if (!raw || typeof raw !== 'object') return a
  const o = raw as Record<string, unknown>
  a.n = typeof o.n === 'number' && o.n > 0 ? o.n : 0
  for (const key of AFFINITY_FIELDS) {
    const m = o[key]
    if (m && typeof m === 'object') {
      for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
        const n = Number(v)
        if (k && Number.isFinite(n) && n !== 0) a[key][k.toLowerCase()] = n
      }
    }
  }
  return a
}

function bump(map: Record<string, number>, raw: string, by = 1) {
  const k = raw.trim().toLowerCase()
  if (!k) return
  map[k] = (map[k] || 0) + by
}

function cloneAffinity(a: CrowdAffinity): CrowdAffinity {
  const next = emptyAffinity()
  next.n = a.n
  for (const key of AFFINITY_FIELDS) next[key] = { ...a[key] }
  return next
}

export function addRating(affinity: CrowdAffinity, round: ReelRoundLog, rating: ReelRating): CrowdAffinity {
  const by = rating === 'HIGH' ? 2 : rating === 'MEDIUM' ? 0.4 : -1.2
  const next = cloneAffinity(affinity)
  if (rating === 'HIGH') next.n += 1
  bump(next.audience, round.audience, by)
  bump(next.topic, round.topic, by)
  bump(next.subtopic, round.subtopic, by)
  bump(next.mood, round.mood, by)
  bump(next.energy, round.energy, by)
  bump(next.format, round.format, by)
  bump(next.vibe, round.vibe, by)
  bump(next.depth, String(round.depth), by)
  for (const k of round.keywords.split(',')) bump(next.keywords, k, by)
  return next
}

export function addHigh(affinity: CrowdAffinity, round: ReelRoundLog): CrowdAffinity {
  return addRating(affinity, round, 'HIGH')
}

function same(a: string, b: string) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
}

function metaHay(r: ReelRow): string {
  return [
    r.audience, r.topic, r.subtopic, r.mood, r.energy, r.format, r.vibe,
    r.keywords, r.description, r.curator_notes, r.sponsored ? 'sponsored' : '',
  ].join(' ')
}

function tokenOverlap(a: string, b: string): number {
  const A = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2))
  let n = 0
  for (const t of b.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2)) {
    if (A.has(t)) n++
  }
  return n
}

function vsClip(candidate: ReelRow, liked: ReelRow, weight: number): number {
  let s = 0
  if (same(candidate.audience, liked.audience)) s += 3
  if (same(candidate.topic, liked.topic)) s += 2
  if (same(candidate.subtopic, liked.subtopic)) s += 2.5
  if (same(candidate.mood, liked.mood)) s += 1
  if (same(candidate.vibe, liked.vibe)) s += 1
  if (same(candidate.format, liked.format)) s += 0.5
  if (same(String(candidate.energy), String(liked.energy))) s += 0.4
  if (candidate.depth === liked.depth) s += 0.4
  if (candidate.sponsored === liked.sponsored) s += 0.15
  s += tokenOverlap(metaHay(liked), metaHay(candidate)) * 0.35
  s += overlapScore(metaHay(liked), candidate) * 0.15
  return s * weight
}

function affinityScore(r: ReelRow, aff: CrowdAffinity): number {
  if (!aff.n && !Object.values(aff.audience).length && !Object.values(aff.topic).length) {
    const any = AFFINITY_FIELDS.some((k) => Object.keys(aff[k]).length)
    if (!any) return 0
  }
  let s = 0
  const hit = (field: AffinityField, value: string, w: number) => {
    s += (aff[field][value.trim().toLowerCase()] || 0) * w
  }
  hit('audience', r.audience, 1.6)
  hit('topic', r.topic, 1.2)
  hit('subtopic', r.subtopic, 1.3)
  hit('mood', r.mood, 0.7)
  hit('energy', String(r.energy), 0.4)
  hit('format', r.format, 0.4)
  hit('vibe', r.vibe, 0.7)
  hit('depth', String(r.depth), 0.3)
  for (const k of r.keywords.split(',')) hit('keywords', k, 0.55)
  return s
}

function lookup(library: ReelRow[], id: string): ReelRow | undefined {
  return library.find((r) => r.id === id)
}

function averageVec(vecs: number[][]) {
  if (!vecs.length) return null
  const n = vecs[0].length
  const out = new Array(n).fill(0)
  for (const v of vecs) {
    if (v.length !== n) continue
    for (let i = 0; i < n; i++) out[i] += v[i]
  }
  for (let i = 0; i < n; i++) out[i] /= vecs.length
  return out
}

function sponsoredHay(r: ReelRow) {
  return [r.description, r.topic, r.subtopic, r.audience, r.mood, r.keywords, r.ad_category, r.vibe, r.curator_notes].join(' ')
}

function profileQuery(rounds: ReelRoundLog[], profile?: VisitorProfile | null) {
  const high = rounds.filter((r) => r.rating === 'HIGH')
  const inf = profile?.inferred
  const topCat = (profile?.categories ?? []).slice().sort((a, b) => b.confidence - a.confidence)[0]
  return [
    ...high.flatMap((r) => [r.audience, r.topic, r.subtopic, r.mood, r.vibe, r.keywords]),
    inf?.mood, inf?.ageRange, inf?.incomeBracket, ...(inf?.interests ?? []),
    topCat?.category,
    ...(profile?.events.filter((e) => e.source === 'reel').map((e) => e.value) ?? []),
  ].filter(Boolean).join(' ')
}

function tokenHits(query: string, hay: string): number {
  const H = hay.toLowerCase()
  let s = 0
  for (const t of new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2))) {
    if (H.includes(t)) s += 1
  }
  return s
}

/** Closest unused sponsored reel to this visitor. Fallback: ad_category vs profile categories. */
export function pickSponsored(
  library: ReelRow[],
  used: string[],
  rounds: ReelRoundLog[],
  affinity: CrowdAffinity,
  profile?: VisitorProfile | null,
): ReelRow | null {
  const unused = library.filter((r) => r.sponsored && !used.includes(r.id))
  if (!unused.length) return null
  const query = profileQuery(rounds, profile)
  const highs = rounds.filter((r) => r.rating === 'HIGH')
  const liked = highs
    .map((r) => lookup(library, r.reelId))
    .filter((r): r is ReelRow => !!r)
  const queryVec = averageVec(liked.map((r) => r.embedding).filter((v): v is number[] => !!v?.length))
  const topCat = (profile?.categories ?? []).slice().sort((a, b) => b.confidence - a.confidence)[0]
  const scored = unused.map((r) => {
    const hay = sponsoredHay(r)
    let s = tokenHits(query, hay) * 3.2
    s += affinityScore(r, affinity) * 0.5
    if (queryVec) s += cosine(queryVec, r.embedding) * 10
    for (const round of highs) {
      if (same(r.audience, round.audience)) s += 5
      if (same(r.topic, round.topic)) s += 2
      if (same(r.subtopic, round.subtopic)) s += 2
    }
    const adCat = r.ad_category.toLowerCase()
    s += tokenHits(query, r.ad_category) * 2
    for (const c of profile?.categories ?? []) {
      const key = c.category.toLowerCase()
      if (adCat.includes(key) || key.includes(adCat.split(/\s+/)[0] || '___')) s += c.confidence * 6
    }
    return { r, s, cat: adCat }
  })
  scored.sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id))
  const best = scored[0]
  if (best && best.s >= 1) return best.r
  if (topCat) {
    const key = topCat.category.toLowerCase()
    scored.sort((a, b) => {
      const ac = a.cat.includes(key) || key.includes(a.cat.split(/\s+/)[0] || '___') ? 1 : 0
      const bc = b.cat.includes(key) || key.includes(b.cat.split(/\s+/)[0] || '___') ? 1 : 0
      return bc - ac || b.s - a.s
    })
  }
  return scored[0]?.r ?? null
}

export const REEL_ROUNDS = 5
export const SPONSORED_ROUND = 3

function seededIndex(n: number, seed: number) {
  if (n <= 0) return 0
  const x = Math.sin(seed || 1) * 10000
  return Math.abs(Math.floor(x)) % n
}

/** First clip: closest to what other visitors liked. If nobody has rated yet, seeded random. */
export function pickStart(library: ReelRow[], affinity: CrowdAffinity, seed = 1): ReelRow | null {
  const open = library.filter((r) => !notesBlock(r, [], null, 0))
  const organic = open.filter((r) => !r.sponsored)
  const src = organic.length ? organic : open.length ? open : library
  if (!src.length) return null
  const scored = src.map((r) => ({ r, s: affinityScore(r, affinity) }))
  scored.sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id))
  if (!scored[0] || scored[0].s <= 0) return src[seededIndex(src.length, seed)]
  return scored[0].r
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
  rounds: ReelRoundLog[],
  affinity: CrowdAffinity,
  wordVec: number[] | null,
  mock: boolean,
  profile?: VisitorProfile | null,
): ReelRow | null {
  if (used.length >= REEL_ROUNDS) return null
  if (used.length + 1 === SPONSORED_ROUND) {
    const sponsored = pickSponsored(library, used, rounds, affinity, profile)
    if (sponsored) return sponsored
  }
  const left = library.filter((r) => !used.includes(r.id) && r.id !== current.id)
  if (!left.length) return null
  const roundIndex = used.length
  const organic = left.filter((r) => !r.sponsored)
  const prefer = organic.length ? organic : left
  const last = rating
  const candidates = prefer.filter((r) => !notesBlock(r, used, last, roundIndex))
  const pool = candidates.length ? candidates : prefer.length ? prefer : left

  const rowsFor = (want: ReelRating) =>
    rounds.map((log) => (log.rating === want ? lookup(library, log.reelId) : undefined)).filter((r): r is ReelRow => !!r)

  const liked = rowsFor('HIGH')
  const mid = rowsFor('MEDIUM')
  const hated = rowsFor('LOW')

  const meaning = (r: ReelRow) =>
    mock || !wordVec ? overlapScore(metaHay(current), r) : cosine(wordVec, r.embedding)

  const scored = pool.map((r) => {
    let s = 0
    const sameAud = same(r.audience, current.audience)
    const sameTopic = same(r.topic, current.topic)
    const sameMood = same(r.mood, current.mood)
    const sameFmt = same(r.format, current.format)
    if (rating === 'HIGH') {
      if (sameAud) s += 3
      if (same(r.subtopic, current.subtopic)) s += 2
      if (r.depth === Math.min(5, current.depth + 1)) s += 2
      else if (r.depth >= current.depth) s += 0.5
      if (!sameFmt) s += 0.8
      s += meaning(r) * 0.35
      s += vsClip(r, current, 0.85)
    } else if (rating === 'MEDIUM') {
      if (sameAud || sameTopic) s += 3
      if (r.depth === current.depth) s += 1.5
      if (!sameFmt) s += 0.6
      s += meaning(r)
      s += vsClip(r, current, 0.4)
    } else {
      if (!sameAud) s += 3
      if (!sameTopic) s += 1.5
      if (!sameMood) s += 1
      if (r.depth === Math.max(1, current.depth - 1)) s += 2
      s -= vsClip(r, current, 1.35)
    }
    for (const row of liked) s += vsClip(r, row, 1)
    for (const row of mid) s += vsClip(r, row, 0.35)
    for (const row of hated) s -= vsClip(r, row, 1.15)
    s += affinityScore(r, affinity) * 0.45
    if (!energyOk(current.energy, r.energy, rating)) s -= 4
    return { r, s }
  })
  scored.sort((a, b) => b.s - a.s || Math.random() - 0.5)
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
    phase: 'idle',
    currentId: null,
    videoUrl: null,
    rounds: [],
    usedIds: [],
    sessionLine: '',
    source: 'mock',
    at: Date.now(),
    prefetchId: null,
  }
}

/** Buffer the upcoming sponsored reel while earlier rounds play. */
export function attachPrefetch(
  result: ReelResult,
  library: ReelRow[],
  affinity: CrowdAffinity,
  profile?: VisitorProfile | null,
): ReelResult {
  if (result.phase === 'done' || result.usedIds.length >= SPONSORED_ROUND) {
    return { ...result, prefetchId: null }
  }
  const row = pickSponsored(library, result.usedIds, result.rounds, affinity, profile)
  return { ...result, prefetchId: row?.id ?? null }
}
