// GENERATED COPY of src/shared/station.ts. Edit that file instead, then run `npm run sync-shared`.
// The "advertisement" is now a generated instrumental STATION — the profile sold
// back as a personalized track. Genre is DERIVED from the visitor's profile (master);
// the three phone dials (Energy, Mood, Texture) modulate within the genre's envelope.
import type { VisitorProfile } from './profile.ts'

/** Phone dials. Blind poles are fine; these labels drive the report + prompt. */
export const STATION_POLES: [[string, string], [string, string], [string, string]] = [
  ['LAID-BACK', 'DRIVING'], // Energy
  ['DARK', 'BRIGHT'], // Mood
  ['CLEAN', 'GRITTY'], // Texture
]

export type GenreId = 'ambient' | 'trap' | 'house' | 'idm' | 'phonk' | 'hyperpop' | 'neoclassical'

export interface GenreMeta {
  id: GenreId
  label: string
  /** [slowBpm, fastBpm] — Energy dial maps into this window. */
  bpm: [number, number]
  base: string
  artist: string
  /** Higher = more grift-adjacent soundtrack (kept hidden). */
  legitimacy: number
}

export const GENRES: Record<GenreId, GenreMeta> = {
  ambient: { id: 'ambient', label: 'AMBIENT', bpm: [50, 90], base: 'slow ambient, warm analog pads, lots of reverb, no drums', artist: 'skeletrix island radio', legitimacy: 60 },
  trap: { id: 'trap', label: 'TRAP', bpm: [120, 160], base: 'trap beat, heavy 808 bass, crisp hi-hats', artist: 'hariroc', legitimacy: 30 },
  house: { id: 'house', label: 'DEEP HOUSE', bpm: [115, 128], base: 'deep house, four-on-the-floor kick, warm bassline', artist: 'Disclosure', legitimacy: 55 },
  idm: { id: 'idm', label: 'ELECTRONIC', bpm: [90, 140], base: 'glitchy IDM, cold synths, intricate drums', artist: 'Aphex Twin', legitimacy: 45 },
  phonk: { id: 'phonk', label: 'PHONK', bpm: [130, 160], base: 'hard phonk, driving, distorted bass, cowbell', artist: 'DVRST', legitimacy: 40 },
  hyperpop: { id: 'hyperpop', label: 'HYPERPOP', bpm: [120, 160], base: 'playful hyperpop, bright detuned synths, bouncy', artist: 'A. G. Cook', legitimacy: 50 },
  neoclassical: { id: 'neoclassical', label: 'NEOCLASSICAL', bpm: [60, 100], base: 'neoclassical solo piano, intimate, slight room noise', artist: 'Max Richter', legitimacy: 65 },
}

export function genreMeta(id: GenreId): GenreMeta {
  return GENRES[id] ?? GENRES.ambient
}

const KEYWORD_GENRE: { genre: GenreId; hints: string[] }[] = [
  { genre: 'trap', hints: ['money', 'hustle', 'crypto', 'finance', 'risk', 'status', 'grind', 'luxury'] },
  { genre: 'house', hints: ['lifestyle', 'fashion', 'nightlife', 'party', 'travel', 'aesthetic', 'premium'] },
  { genre: 'idm', hints: ['culture', 'tech', 'news', 'politics', 'science', 'ai', 'heterodox'] },
  { genre: 'phonk', hints: ['body', 'gym', 'fitness', 'sports', 'hardcore', 'performance'] },
  { genre: 'hyperpop', hints: ['comedy', 'humor', 'meme', 'ironic', 'absurd', 'youth'] },
  { genre: 'ambient', hints: ['mind', 'wellness', 'calm', 'astrology', 'spiritual', 'melancholy', 'anxious', 'soothing'] },
  { genre: 'neoclassical', hints: ['art', 'literature', 'history', 'classical', 'sad', 'nostalgic'] },
]

/** Derive the station genre from whatever the profile knows (mood, interests, top category, income). */
export function deriveGenre(p?: VisitorProfile | null): GenreId {
  const hay = [
    p?.inferred?.mood,
    ...(p?.inferred?.interests ?? []),
    ...(p?.categories ?? []).map((c) => c.category),
    ...(p?.events?.map((e) => e.value) ?? []),
  ].filter(Boolean).join(' ').toLowerCase()

  let best: GenreId = 'ambient'
  let bestN = 0
  for (const { genre, hints } of KEYWORD_GENRE) {
    let n = 0
    for (const h of hints) if (hay.includes(h)) n++
    if (n > bestN) { bestN = n; best = genre }
  }
  if (bestN === 0) {
    // no interest signal yet: lean on mood/income
    const mood = p?.inferred?.mood
    if (mood === 'anxious' || mood === 'melancholy') return 'ambient'
    if (mood === 'upbeat' || mood === 'restless') return 'house'
    const income = p?.article?.income
    if (income != null && income >= 4) return 'house'
  }
  return best
}

const MOOD_WORDS: [string, string] = ['dark, melancholic, minor-key', 'warm, uplifting, major-key']
const TEX_WORDS: [string, string] = ['clean, polished, spacious', 'lo-fi, dusty, distorted, dense']

/** Build the MusicGen prompt from the derived genre + the 3 dials (Energy, Mood, Texture). */
export function musicPrompt(genre: GenreId, dials: [number, number, number]): string {
  const g = genreMeta(genre)
  const [energy, mood, texture] = dials
  const bpm = Math.round(g.bpm[0] + (g.bpm[1] - g.bpm[0]) * (energy / 100))
  const intensity = energy > 60 ? 'driving, intense' : energy < 40 ? 'laid-back, mellow' : 'steady'
  const moodWord = mood > 55 ? MOOD_WORDS[1] : mood < 45 ? MOOD_WORDS[0] : 'neutral, even'
  const texWord = texture > 55 ? TEX_WORDS[1] : texture < 45 ? TEX_WORDS[0] : 'balanced'
  return `${g.base}, ${intensity}, ${moodWord}, ${texWord}, ${bpm} bpm, ${g.artist} style, instrumental, no vocals`
}

/** Station "grift-adjacency" from genre + how hard they pushed Energy/Splurge-ish dials. */
export function stationLegitimacy(genre: GenreId): number {
  return genreMeta(genre).legitimacy
}

export function stationCacheKey(genre: GenreId, dials: [number, number, number]): string {
  const corner = dials.map((n) => Math.round(n / 25) * 25).join('-')
  return `station|${genre}|${corner}`
}
