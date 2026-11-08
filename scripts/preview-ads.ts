import { pickAd, personalizeAd, fullReport } from '../src/shared/ads.ts'
import { emptyProfile, inferProfile } from '../src/shared/profile.ts'
import { pickSponsored, rowFromRecord, emptyAffinity, type ReelRow } from '../src/shared/reel.ts'
import { readFileSync } from 'node:fs'

const library: ReelRow[] = JSON.parse(
  readFileSync(new URL('../public/content/reels.json', import.meta.url), 'utf8'),
).map((r: Record<string, unknown>) => rowFromRecord(r))

function anxiousLowIncomeWoman() {
  return inferProfile({
    ...emptyProfile(),
    article: { ...emptyProfile().article, income: 0, education: 3, sensationalism: 4, lean: 0, connotation: -1, location: 'New York' },
    inferred: emptyProfile().inferred,
    events: [
      { source: 'reel', key: 'tags', value: 'HIGH young women wellness skincare mental-health therapy', at: Date.now() },
    ],
  })
}

function aspirationalHighIncomeMan() {
  return inferProfile({
    ...emptyProfile(),
    article: { ...emptyProfile().article, income: 5, education: 5, sensationalism: 1, lean: 1, connotation: 1, location: 'New York' },
    inferred: emptyProfile().inferred,
    events: [
      { source: 'reel', key: 'tags', value: 'HIGH young men professional fitness luxury aspirational travel nyc', at: Date.now() },
    ],
  })
}

function cryptoHustleMan() {
  return inferProfile({
    ...emptyProfile(),
    article: { ...emptyProfile().article, income: 3, education: 3, sensationalism: 4, lean: 1, connotation: 1, location: 'New York' },
    inferred: emptyProfile().inferred,
    events: [
      { source: 'reel', key: 'tags', value: 'HIGH young men finance crypto betting hustle sports', at: Date.now() },
      { source: 'game', key: 'slots', value: 'loss chase', at: Date.now() },
    ],
  })
}

function show(label: string, p: ReturnType<typeof inferProfile>, used: string[], highs: Parameters<typeof pickSponsored>[2]) {
  const match = pickAd(p, undefined, highs)
  if (!match) {
    console.log('\n' + label + '\n  (no ad)')
    return
  }
  const place = personalizeAd(match, p)
  console.log('\n=== ' + label + ' ===')
  console.log('brand:    ' + place.brand)
  console.log('riff:     ' + (place.riffsOn ?? '—'))
  console.log('style:    ' + (place.adStyle ?? '—'))
  console.log('report:   ' + fullReport(place, p))
  console.log('headline: ' + place.headline)
  console.log('copy:     ' + place.paragraph)
  const spon = pickSponsored(library, used, highs, emptyAffinity(), p)
  console.log('round-3:  ' + (spon ? `${spon.id} [${spon.ad_category || spon.topic}]` : 'none'))
}

show('Anxious low-income young woman', anxiousLowIncomeWoman(), ['003', '004'], [
  { reelId: '004', rating: 'HIGH', hesitationMs: 0, depth: 1, topic: 'wellness', subtopic: 'therapy', audience: 'young women', mood: 'calm', energy: 'low', format: '', vibe: 'relatable', keywords: 'skincare, mental-health, anxious', sponsored: false },
  { reelId: '003', rating: 'MEDIUM', hesitationMs: 0, depth: 2, topic: 'humor', subtopic: 'prank', audience: 'teens', mood: 'funny', energy: 'medium', format: '', vibe: 'relatable', keywords: 'tiktok', sponsored: false },
])
show('Aspirational high-income male professional', aspirationalHighIncomeMan(), ['003', '004'], [
  { reelId: '004', rating: 'HIGH', hesitationMs: 0, depth: 1, topic: 'luxury', subtopic: 'luxury lifestyle', audience: 'professionals', mood: 'inspiring', energy: 'medium', format: '', vibe: 'aspirational', keywords: 'fitness, travel, nyc, status', sponsored: false },
  { reelId: '003', rating: 'LOW', hesitationMs: 0, depth: 2, topic: 'humor', subtopic: 'prank', audience: 'teens', mood: 'funny', energy: 'medium', format: '', vibe: 'relatable', keywords: 'tiktok', sponsored: false },
])
show('Crypto / hustle young man', cryptoHustleMan(), ['003', '004'], [
  { reelId: '004', rating: 'HIGH', hesitationMs: 0, depth: 1, topic: 'finance/investing', subtopic: 'crypto', audience: 'young men', mood: 'tense', energy: 'high', format: '', vibe: 'aspirational', keywords: 'crypto, betting, hustle', sponsored: false },
  { reelId: '003', rating: 'MEDIUM', hesitationMs: 0, depth: 2, topic: 'humor', subtopic: 'prank', audience: 'teens', mood: 'funny', energy: 'medium', format: '', vibe: 'relatable', keywords: 'tiktok', sponsored: false },
])
