import { PARODY_BRANDS, type ParodyBrand } from './parodyBrands.ts'
import type { VisitorProfile } from './profile.ts'

export const AD_POLES: [[string, string], [string, string], [string, string]] = [
  ['COMFORT', 'STATUS'],
  ['CALM', 'HYPE'],
  ['SAVE', 'SPLURGE'],
]

const GRIFT_IDS = new Set(['quickcash', 'grindset-academy', 'coinflip', 'kingsbet', 'poleculemarket'])

export function brandDials(b: ParodyBrand): [number, number, number] {
  const comfortStatus = b.lane === 'luxury' || b.income === 'premium' ? 82
    : b.income === 'budget' ? 22
      : b.lane === 'risk' ? 70
        : 48
  const calmHype = b.lane === 'risk' || b.family === 'energy drink' ? 82
    : b.lane === 'wellness' ? 18
      : b.lane === 'algorithm' ? 64
        : 50
  const saveSplurge = b.income === 'budget' ? 18
    : b.lane === 'luxury' || b.lane === 'risk' ? 86
      : b.income === 'premium' ? 74
        : 48
  return [comfortStatus, calmHype, saveSplurge]
}

export function brandLegitimacy(b: ParodyBrand) {
  if (GRIFT_IDS.has(b.id)) return 12
  if (b.satirical && b.lane === 'risk') return 22
  if (b.lane === 'algorithm') return 34
  if (b.lane === 'luxury') return 58
  if (b.lane === 'wellness') return 62
  return 55
}

function dist3(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function profileBias(p: VisitorProfile | null | undefined): [number, number, number] {
  const income = p?.article.income
  const mood = p?.inferred.mood ?? 'neutral'
  const interests = p?.inferred.interests ?? []
  const status = income != null && income >= 4 ? 18 : income != null && income <= 1 ? -12 : 0
  const hype = mood === 'anxious' || mood === 'restless' ? 10 : mood === 'upbeat' ? 8 : 0
  const splurge = interests.includes('premium') || interests.includes('luxury') ? 14
    : interests.includes('value') ? -12
      : 0
  return [status, hype, splurge]
}

export function nearestBrand(dials: [number, number, number], profile?: VisitorProfile | null) {
  const bias = profileBias(profile)
  const target: [number, number, number] = [
    Math.max(0, Math.min(100, dials[0] + bias[0])),
    Math.max(0, Math.min(100, dials[1] + bias[1])),
    Math.max(0, Math.min(100, dials[2] + bias[2])),
  ]
  let best = PARODY_BRANDS[0]
  let bestD = Infinity
  for (const b of PARODY_BRANDS) {
    const d = dist3(target, brandDials(b))
    if (d < bestD) {
      best = b
      bestD = d
    }
  }
  const implied = profileBias(profile)
  const matchedProfile = Math.abs(implied[0]) + Math.abs(implied[1]) + Math.abs(implied[2]) > 8
    && dist3(dials, brandDials(best)) <= dist3(
      [50, 50, 50],
      brandDials(best),
    )
  return { brand: best, distance: bestD, matchedProfile, legitimacy: brandLegitimacy(best) }
}

export function adCacheKey(brandId: string, dials: [number, number, number], profile?: VisitorProfile | null) {
  const corner = dials.map((n) => Math.round(n / 25) * 25).join('-')
  const bucket = profile?.inferred.incomeBracket ?? profile?.article.income ?? 'none'
  const lean = profile?.inferred.lean ?? 'none'
  return `${brandId}|${corner}|${bucket}|${lean}`
}

export function fluxPrompt(brand: ParodyBrand, dials: [number, number, number]) {
  const mood = [
    dials[0] > 60 ? 'luxury status display, aspirational interior' : 'comfortable everyday setting, modest materials',
    dials[1] > 60 ? 'high-energy neon advertising photography' : 'calm quiet studio lighting, still air',
    dials[2] > 60 ? 'premium product hero shot, glossy' : 'practical value-oriented still life',
  ].join(', ')
  return `Photorealistic advertising photograph of ${brand.product}, ${brand.category}, ${mood}, cinematic commercial photography, no text, no letters, no logo, no watermark, no typography, no captions, empty packaging faces, ${brand.adStyle || 'contemporary commercial'}`
}

export function adOverlay(brand: ParodyBrand, dials: [number, number, number]) {
  return {
    wordmark: brand.name,
    headline: brand.tagline,
    cta: dials[2] > 60 ? 'SHOP NOW' : dials[1] > 60 ? 'GET STARTED' : 'LEARN MORE',
  }
}

export function templateCard(brand: ParodyBrand, dials: [number, number, number]) {
  const overlay = adOverlay(brand, dials)
  return {
    brandId: brand.id,
    brandName: brand.name,
    product: brand.product,
    dials,
    imageUrl: null as string | null,
    overlay,
    legitimacy: brandLegitimacy(brand),
    hue: GRIFT_IDS.has(brand.id) ? 18 : brand.lane === 'luxury' ? 42 : brand.lane === 'wellness' ? 150 : 210,
  }
}
