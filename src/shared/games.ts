import { ADS, adFromParody } from './ads.ts'
import { PARODY_BRANDS } from './parodyBrands.ts'
import type { VisitorProfile } from './profile.ts'
import type { ReelResult } from './reel.ts'

export type GameId = 'slots' | 'auction' | 'higherLower' | 'pet'
export type UrgencyGroup = 'urgent' | 'control'

export const GAMES: { id: GameId; title: string; file: string; ready: boolean }[] = [
  { id: 'slots', title: 'SLOTS', file: 'slots.js', ready: false },
  { id: 'auction', title: 'AUCTION', file: 'auction.js', ready: false },
  { id: 'higherLower', title: 'HIGHER OR LOWER', file: 'higher-lower.js', ready: true },
  { id: 'pet', title: 'DIGIPET', file: 'pet.js', ready: true },
]

export const GAME_UNLOCK_AFTER = 2

/** Tune recommendation. First matching score wins ties by fewest plays. */
export const GAME_RECOMMEND = {
  slots: { impulsivity: 0.55, sensationalism: 3, fastMs: 1800, extremes: 2 },
  higherLower: { mediumShare: 0.5, slowMs: 2500 },
  pet: { moods: ['anxious', 'melancholy', 'numb', 'sad', 'concerned'], probeValues: true },
  auction: { incomeMin: 3, vibes: ['aspirational'], categories: ['lifestyle', 'finance'] },
}

export function objectsTouched(snap?: {
  display?: { used?: string[]; completed?: string[] }
  altered?: { article?: unknown; reel?: unknown; game?: unknown }
} | null) {
  const ids = new Set<string>([...(snap?.display?.used ?? []), ...(snap?.display?.completed ?? [])])
  if (snap?.altered?.article) ids.add('article')
  if (snap?.altered?.reel) ids.add('reel')
  if (snap?.altered?.game) ids.add('game')
  return [...ids]
}

export function gameUnlocked(used: readonly string[] = []) {
  return used.filter((id) => id !== 'game').length >= GAME_UNLOCK_AFTER
}

export function playableGames(seen: readonly GameId[] = []) {
  return GAMES.filter((g) => g.ready && !seen.includes(g.id))
}

export function gameIconLocked(used: readonly string[] = [], seen: readonly GameId[] = []) {
  if (!gameUnlocked(used)) return 'data'
  if (!playableGames(seen).length) return 'done'
  return null
}

export function incomeBracketForGame(label: string | null): string | null {
  if (!label) return null
  if (label.startsWith('UNDER')) return '<30k'
  if (label.includes('$30K')) return '30-60k'
  if (label.includes('$60K')) return '60-100k'
  if (label.includes('$100K')) return '100-200k'
  if (label.includes('$200K')) return '200-500k'
  if (label.includes('$500K')) return '500k+'
  return null
}

export function susceptibilityBand(n: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (n >= 0.6) return 'HIGH'
  if (n >= 0.35) return 'MEDIUM'
  return 'LOW'
}

export function gameProfileFromVisitor(p: VisitorProfile, reel?: ReelResult | null) {
  const highs = reel?.rounds.filter((r) => r.rating === 'HIGH') ?? []
  const likedTopics = [...new Set(highs.flatMap((r) => [r.topic, r.subtopic, r.audience].filter(Boolean)))]
  const vibe = highs.some((r) => /aspirational/i.test(r.vibe)) || (p.article.income ?? 0) >= 4
    ? 'aspirational'
    : 'relatable'
  return {
    incomeBracket: incomeBracketForGame(p.inferred.incomeBracket),
    susceptibility: susceptibilityBand(p.inferred.susceptibility),
    vibe,
    mood: p.inferred.mood,
    trustedPersona: p.game?.trustedPersona || undefined,
    topAdCategories: p.categories.slice(0, 3).map((c) => c.category),
    likedTopics,
    urgencyGroup: p.game?.urgencyGroup ?? 'control',
  }
}

export function auctionAdItems() {
  const rows = PARODY_BRANDS.length ? PARODY_BRANDS.map(adFromParody) : ADS
  return rows.slice(0, 12).map((ad, i) => ({
    id: ad.id,
    name: ad.product,
    value: 25 + i * 35,
    category: ad.category,
  }))
}

export function pickRecommendedGame(
  p: VisitorProfile,
  reel: ReelResult | null | undefined,
  seen: readonly GameId[] = [],
): GameId {
  const ready = GAMES.filter((g) => g.ready).map((g) => g.id)
  const scores: Record<GameId, number> = { slots: 0, auction: 0, higherLower: 0, pet: 0 }
  const R = GAME_RECOMMEND
  const sens = p.article.sensationalism ?? 0
  const extremes = p.behavior.extremes
  const hesitations = p.behavior.hesitationMs
  const avgH = hesitations.length ? hesitations.reduce((a, b) => a + b, 0) / hesitations.length : 0
  const fast = avgH > 0 && avgH < R.slots.fastMs
  if (p.inferred.susceptibility >= R.slots.impulsivity || sens >= R.slots.sensationalism || extremes >= R.slots.extremes || fast) {
    scores.slots += 2
  }
  const rounds = reel?.rounds.filter((r) => r.rating) ?? []
  const mediumShare = rounds.length ? rounds.filter((r) => r.rating === 'MEDIUM').length / rounds.length : 0
  if (mediumShare >= R.higherLower.mediumShare || avgH >= R.higherLower.slowMs) scores.higherLower += 2
  if (R.pet.moods.includes(p.inferred.mood) || p.article.connotation === -1) scores.pet += 2
  if (R.pet.probeValues && !p.game.traits.QUALITY_PREFERENCE) scores.pet += 1
  const income = p.article.income ?? 0
  const highs = reel?.rounds.filter((r) => r.rating === 'HIGH') ?? []
  if (income >= R.auction.incomeMin) scores.auction += 1
  if (highs.some((r) => R.auction.vibes.some((v) => r.vibe.toLowerCase().includes(v)))) scores.auction += 1
  if (p.categories.some((c) => R.auction.categories.includes(c.category) && c.confidence > 0.5)) scores.auction += 1

  const ranked = ready.slice().sort((a, b) => {
    const ds = scores[b] - scores[a]
    if (ds) return ds
    const sa = seen.filter((id) => id === a).length
    const sb = seen.filter((id) => id === b).length
    return sa - sb
  })
  return ranked[0] ?? 'higherLower'
}

export function traitLine(traits: Record<string, string> | undefined) {
  if (!traits) return 'NO TRAITS RECORDED.'
  return Object.entries(traits).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')
}

export function petSessionLine(summary: Record<string, unknown> | null | undefined) {
  if (!summary || summary.game !== 'pet') return ''
  const bought = Array.isArray(summary.itemsBought) ? (summary.itemsBought as string[]).join(', ') : ''
  const tops = Array.isArray(summary.topCategories) ? (summary.topCategories as string[]).join(', ') : ''
  return `AD CONTINUES: ${summary.adContinues ?? 0} · CONTINUE: ${summary.choseToContinue ? 'YES' : 'NO'} · BOUGHT: ${bought || 'NOTHING'} · VALUES: ${tops || 'NONE'}`
}
