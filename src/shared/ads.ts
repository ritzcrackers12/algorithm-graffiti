import type { VisitorProfile } from './profile.ts'
import { clockLabel } from './profile.ts'

export interface Ad {
  id: string
  category: string
  brand: string
  product: string
  tagline: string
  image: string
  voiceScript: string
  targetRules: string
}

export interface AdMatch {
  ad: Ad
  score: number
  reasons: string[]
  confidence: number
}

export interface AdPlacement {
  adId: string
  brand: string
  product: string
  category: string
  headline: string
  paragraph: string
  image: string
  reasons: string[]
  confidence: number
  at: number
}

export const ADS: Ad[] = [
  {
    id: 'ph-1', category: 'wellness', brand: 'PLACEHOLDER BRAND 1', product: 'Calm Pack',
    tagline: 'A quieter hour.', image: 'ads/ph-1.svg',
    voiceScript: 'When the day runs long, Calm Pack is built for a slower minute.',
    targetRules: 'mood=anxious OR mood=restless OR mood=concerned',
  },
  {
    id: 'ph-2', category: 'finance', brand: 'PLACEHOLDER BRAND 2', product: 'Ledger Plus',
    tagline: 'Keep more of what you keep.', image: 'ads/ph-2.svg',
    voiceScript: 'Ledger Plus is a simple account for people watching every line.',
    targetRules: 'income<=60k',
  },
  {
    id: 'ph-3', category: 'security', brand: 'PLACEHOLDER BRAND 3', product: 'Home Watch Kit',
    tagline: 'Know the perimeter.', image: 'ads/ph-3.svg',
    voiceScript: 'Home Watch Kit logs the door, the lot, and the late hours.',
    targetRules: 'lean>=1',
  },
  {
    id: 'ph-4', category: 'civic', brand: 'PLACEHOLDER BRAND 4', product: 'Block Brief',
    tagline: 'What your block actually voted.', image: 'ads/ph-4.svg',
    voiceScript: 'Block Brief is a weekly digest of local votes, strikes, and hearings.',
    targetRules: 'lean<=-1',
  },
  {
    id: 'ph-5', category: 'education', brand: 'PLACEHOLDER BRAND 5', product: 'Night Class',
    tagline: 'One skill, twelve weeks.', image: 'ads/ph-5.svg',
    voiceScript: 'Night Class is a short course you can finish after work.',
    targetRules: 'age=18-24 OR age=25-34',
  },
  {
    id: 'ph-6', category: 'lifestyle', brand: 'PLACEHOLDER BRAND 6', product: 'Replay Radio',
    tagline: 'The year you still hum.', image: 'ads/ph-6.svg',
    voiceScript: 'Replay Radio is a station built from the decade you keep going back to.',
    targetRules: 'mood=upbeat OR mood=neutral',
  },
]

function incomeCeiling(bracket: string | null): number | null {
  if (!bracket) return null
  if (bracket.startsWith('UNDER')) return 30
  const m = bracket.match(/\$(\d+)/)
  return m ? Number(m[1]) : null
}

function ruleHits(rule: string, p: VisitorProfile): { ok: boolean; reason: string } {
  const inf = p.inferred
  const r = rule.trim()
  const mood = /^mood=(.+)$/i.exec(r)
  if (mood) {
    const ok = inf.mood === mood[1]
    return { ok, reason: `MOOD: ${inf.mood.toUpperCase()}` }
  }
  const leanGte = /^lean>=(-?\d+)$/i.exec(r)
  if (leanGte) {
    const v = p.article.lean
    const ok = v !== null && v >= Number(leanGte[1])
    return { ok, reason: v === null ? 'LEAN UNSET' : `LEAN ${v}` }
  }
  const leanLte = /^lean<=(-?\d+)$/i.exec(r)
  if (leanLte) {
    const v = p.article.lean
    const ok = v !== null && v <= Number(leanLte[1])
    return { ok, reason: v === null ? 'LEAN UNSET' : `LEAN ${v}` }
  }
  const inc = /^income<=(\d+)k$/i.exec(r)
  if (inc) {
    const cap = incomeCeiling(inf.incomeBracket)
    const ok = cap !== null && cap <= Number(inc[1])
    return { ok, reason: inf.incomeBracket ? `INCOME BRACKET ${inf.incomeBracket}` : 'INCOME UNSET' }
  }
  const age = /^age=(.+)$/i.exec(r)
  if (age) {
    const ok = inf.ageRange === age[1]
    return { ok, reason: `AGE RANGE ${inf.ageRange.toUpperCase()}` }
  }
  return { ok: false, reason: `RULE ${r}` }
}

function evalRules(expr: string, p: VisitorProfile): { ok: boolean; reasons: string[] } {
  const parts = expr.split(/\s+AND\s+/i).map((chunk) => chunk.split(/\s+OR\s+/i).map((s) => s.trim()))
  const reasons: string[] = []
  const ok = parts.every((orGroup) => orGroup.some((rule) => {
    const hit = ruleHits(rule, p)
    if (hit.ok) reasons.push(hit.reason)
    return hit.ok
  }))
  return { ok, reasons }
}

export function scoreAd(ad: Ad, p: VisitorProfile): AdMatch {
  const cat = p.categories.find((c) => c.category === ad.category)
  const rules = evalRules(ad.targetRules, p)
  let score = (cat?.confidence ?? 0.2) * 100
  const reasons = [...(cat?.reasons ?? [])]
  if (rules.ok) {
    score += 18
    reasons.push(...rules.reasons)
  } else {
    score -= 8
  }
  if (p.device) {
    const h = p.device.hour
    const clock = `${((h + 11) % 12) + 1}:00 ${h >= 12 ? 'PM' : 'AM'}`
    reasons.push(`DEVICE: ${p.device.os.toUpperCase()}, ${clock}`)
    score += 4
  }
  if (p.inferred.region) {
    reasons.push(`REGION ${p.inferred.region.toUpperCase()} (${clockLabel(p.events.find((e) => e.key === 'location')?.at ?? Date.now())})`)
    score += 5
  }
  const unique = [...new Set(reasons)]
  return {
    ad,
    score,
    reasons: unique,
    confidence: Math.max(0.08, Math.min(0.95, Math.round(score) / 100)),
  }
}

export function rankAds(p: VisitorProfile, ads: Ad[] = ADS): AdMatch[] {
  return ads
    .filter((a) => !p.adsShown.includes(a.id))
    .map((a) => scoreAd(a, p))
    .sort((a, b) => b.score - a.score)
}

export function pickAd(p: VisitorProfile, ads: Ad[] = ADS): AdMatch | null {
  return rankAds(p, ads)[0] ?? null
}

/** Templates only. CONFIG.AI_AD_COPY is off; live AI copy is a later optional path. */
export function personalizeAd(match: AdMatch, p: VisitorProfile): AdPlacement {
  const inf = p.inferred
  const region = inf.region ? inf.region.toUpperCase() : 'YOUR AREA'
  const mood = inf.mood.toUpperCase()
  const edu = p.article.education ?? 3
  let headline = match.ad.tagline.toUpperCase()
  if (edu <= 1) headline = `${match.ad.product.toUpperCase()} — MADE FOR ${region}.`
  else if ((p.article.lean ?? 0) <= -1) headline = `${region}: ${match.ad.product.toUpperCase()} FOR PEOPLE DOING THE WORK.`
  else if ((p.article.lean ?? 0) >= 1) headline = `${match.ad.product.toUpperCase()}. NO NOISE. ${region}.`
  else headline = `${mood === 'NEUTRAL' ? '' : `FEELING ${mood} IN ${region}? `}${match.ad.tagline.toUpperCase()}`

  const paragraph = sponsoredParagraph(match, p)
  return {
    adId: match.ad.id,
    brand: match.ad.brand,
    product: match.ad.product,
    category: match.ad.category,
    headline: headline.trim(),
    paragraph,
    image: match.ad.image,
    reasons: match.reasons,
    confidence: match.confidence,
    at: Date.now(),
  }
}

export function sponsoredParagraph(match: AdMatch, p: VisitorProfile): string {
  const inf = p.inferred
  const region = inf.region ?? 'this market'
  const brand = match.ad.brand
  const product = match.ad.product
  const lean = p.article.lean ?? 0
  const edu = p.article.education ?? 3
  if (lean <= -1) {
    return edu <= 1
      ? `${brand} paid to say this: ${product} is for people in ${region} who are tired of being last in line.`
      : `A note from ${brand}, which paid for this space: ${product} is being sold as a practical tool for workers and renters in ${region} — the same households the rest of this story keeps circling.`
  }
  if (lean >= 1) {
    return edu >= 4
      ? `${brand} purchased this insertion. ${product} is positioned as a private-market answer in ${region}, independent of the public programs debated above.`
      : `${brand} paid for this line. They say ${product} is a straightforward option in ${region} if you would rather not wait on the next round of rules.`
  }
  return `${brand} paid for this paragraph. ${product}: ${match.ad.tagline} Available in ${region}.`
}

export const SPONSORED_MARK = '%%SPONSORED%%'

export function weaveSponsored(body: string, paragraph: string): string {
  const paras = body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
  const i = Math.min(2, Math.max(1, paras.findIndex((x) => !/^(#|\*|_|>|KEY TAKEAWAYS|•|%%SPONSORED%%)/.test(x)) + 2))
  paras.splice(i, 0, `${SPONSORED_MARK}${paragraph}`)
  return paras.join('\n\n')
}

export function officialWhy() {
  return "You're seeing this ad based on your activity."
}

export function fullReport(place: AdPlacement, p: VisitorProfile): string {
  const bits = place.reasons.map((r) => {
    const ev = p.events.find((e) => r.toUpperCase().includes(e.key.toUpperCase()) || r.includes(e.value))
    return ev ? `${r} (${ev.source.toUpperCase()}, ${clockLabel(ev.at)})` : r
  })
  const conf = Math.round(place.confidence * 100)
  return `${bits.join(' + ')} → CATEGORY: ${place.category.toUpperCase()} · MATCH CONFIDENCE ${conf}%.`
}
