// GENERATED COPY of src/shared/report.ts. Edit that file instead, then run `npm run sync-shared`.
import { STATION_POLES } from './station.ts'
import { bucketMeta, type ReelBucket } from './reelLibrary.ts'
import { CONNOTATION_LABELS, EDUCATION_LABELS, INCOME_LABELS, LEAN_LABELS, SENSATION_LABELS } from './article.ts'
import { resolveLocation } from './locations.ts'
import { isYou } from './chatScript.ts'
import type { VisitorProfile } from './profile.ts'
import type { ArticleResult } from './types.ts'

export interface ReportLine {
  k: string
  v: string
}

export interface ReportBlock {
  title: string
  lines: ReportLine[]
}

/** The payoff report, styled as an ad-targeting dashboard: a one-line SEGMENT,
 *  a grid of fake-precise KPIs, the PITCH that closes them, and a ranked list of
 *  BRANDS (percent + a paragraph each). The live model writes this in
 *  portraitSystemPrompt; fallbackPortrait is the instant/offline version. */
export interface KPI { label: string; value: string }
export interface BrandPick { name: string; pct: number; why: string }
export interface PortraitReport {
  segment: string
  kpis: KPI[]
  pitch: string
  brands: BrandPick[]
}

function locLine(raw: string) {
  const loc = resolveLocation(raw)
  if (loc.kind === 'state') return loc.profile.name.toUpperCase()
  if (loc.kind === 'country') return loc.name.toUpperCase()
  return raw ? raw.toUpperCase() : 'UNSET'
}

/** Brand vocabulary per reel bucket — the fallback speaks the visitor's dialect
 *  the way the live model does. Each list is ordered most- to least-likely. */
const BRANDS_BY_BUCKET: Record<ReelBucket, { name: string; why: string }[]> = {
  money: [
    { name: 'StockX', why: 'You treat sneakers as positions, not shoes — boxed, tracked, resold. The platform sells you the collector and the hustler in one tap.' },
    { name: 'Nike / SNKRS', why: 'You live on the drop calendar. Scarcity is the lever; being locked out stings enough that getting in feels like winning.' },
    { name: 'Fear of God Essentials', why: 'The silhouette of money without the price. It reads as expensive to people who can’t tell — which is exactly who it’s built for.' },
    { name: 'Rolex', why: 'The number you’re actually chasing. You price it long before you can buy it, and that wanting is the whole relationship.' },
    { name: 'Bleu de Chanel', why: 'You’ve aged off the entry scent and want to be read as intentional. An easy mark for the “mature upgrade.”' },
    { name: 'Zara', why: 'The connective tissue between hype pieces — the volume that keeps the above-bracket image running day to day.' },
  ],
  lifestyle: [
    { name: 'Erewhon', why: 'The receipt is the point. You buy the smoothie to be the kind of person who buys the smoothie.' },
    { name: 'Alo Yoga', why: 'Athleisure as identity. You dress for a wellness you’re performing toward, not one you’ve reached.' },
    { name: 'Glossier', why: 'The no-makeup makeup of someone who wants effort to read as ease. Minimalism you pay a premium for.' },
    { name: 'Aritzia', why: 'The uniform of put-together. You buy the look of a life that’s handled.' },
    { name: 'Stanley', why: 'The accessory that signals you’ve optimized even your water. Status dressed as self-care.' },
    { name: 'Sephora', why: 'The small, frequent reward — the thing you buy to fix a mood, not a face.' },
  ],
  body: [
    { name: 'Gymshark', why: 'Your body is the one asset you fully control, so it absorbs the spend. The buying spikes after a bad week.' },
    { name: 'Optimum Nutrition', why: 'The ritual tub. You buy discipline in powder form and the tub is proof you’re serious.' },
    { name: 'YoungLA', why: 'The fit that reads as “in the gym daily.” You dress for the men at the rack beside you.' },
    { name: 'Nike', why: 'The default that still signals. You buy it to belong before you buy it to perform.' },
    { name: 'Bucked Up', why: 'The pre-workout as personality. You pay for the feeling of being locked in.' },
    { name: 'Rhode', why: 'The glow-up endpoint. Looks-maxxing with a clean, aspirational face on it.' },
  ],
  mind: [
    { name: 'Erewhon', why: 'Calm you can purchase. The tonic is less about the body than about feeling in control of it.' },
    { name: 'Alo Yoga', why: 'The uniform of a regulated nervous system you’re still working toward. You buy the before, labeled as the after.' },
    { name: 'Oura', why: 'You want your rest scored so you can optimize even your stillness. Anxiety wearing the mask of data.' },
    { name: 'Aesop', why: 'The $40 hand soap that says you take care of yourself on purpose. Taste as self-worth.' },
    { name: 'Sakara', why: 'Wellness delivered, so the discipline is someone else’s problem. You pay to be held accountable.' },
    { name: 'Aritzia', why: 'Quiet, expensive calm. The outside you build when the inside won’t settle.' },
  ],
  culture: [
    { name: 'A24', why: 'The badge of correct taste. You buy the hat so the room knows what you watch.' },
    { name: 'Criterion', why: 'The shelf as self-portrait. You own the films partly to be seen owning them.' },
    { name: 'Urban Outfitters', why: 'Pre-packaged individuality. You pay a premium for looking like you didn’t try.' },
    { name: 'Glossier', why: 'The online-literate face. You buy the thing the discourse already approved.' },
    { name: 'Dr. Martens', why: 'The uniform of the scene you want to be read into. Identity you can lace up.' },
    { name: 'Spotify', why: 'The taste engine you let define you, then resent for being right.' },
  ],
  comedy: [
    { name: 'Depop', why: 'The feed as closet. You buy the joke-fit and the irony is the point.' },
    { name: 'Liquid Death', why: 'You pay extra for the bit. The can is the personality.' },
    { name: 'Urban Outfitters', why: 'Pre-packaged chaos. You buy the look of not caring.' },
    { name: 'Shein', why: 'Volume and disposability — you buy fast, wear once, post, move on.' },
    { name: 'Spotify', why: 'The aux identity. Your taste is a performance for the group chat.' },
    { name: 'Monster Energy', why: 'The 1am fuel of someone who treats the feed like a job.' },
  ],
}

const SEGMENTS: Record<ReelBucket, string> = {
  money: 'ASPIRATIONAL STATUS-CLIMBER',
  lifestyle: 'OPTIMIZED LIFESTYLE AESTHETE',
  body: 'SELF-OPTIMIZING DISCIPLINE BUYER',
  mind: 'ANXIOUS-ASPIRATIONAL WELLNESS',
  culture: 'TASTE-SIGNALING INSIDER',
  comedy: 'TERMINALLY-ONLINE IRONIST',
}

const PITCHES: Record<ReelBucket, string> = {
  money: 'everyone’s already on it — this is the last pair.',
  lifestyle: 'this is the one your routine was missing.',
  body: 'the version of you that you keep promising is one order away.',
  mind: 'this is the one your nervous system has been missing.',
  culture: 'you already have the taste — this just proves it.',
  comedy: 'you’ll be the first one in the group chat with it.',
}

const DEFAULT_BRANDS = [
  { name: 'Amazon', why: 'The default you reach for without deciding to. Convenience has already won you.' },
  { name: 'Nike', why: 'The safe signal. You buy it to belong before anything else.' },
  { name: 'Apple', why: 'The ecosystem you’re too deep in to leave. You pay the premium as a tax on not switching.' },
  { name: 'Target', why: 'The mid-market trip that always costs more than you planned. Easy, frequent, forgettable.' },
  { name: 'Starbucks', why: 'The small daily yes. You buy the habit, not the coffee.' },
  { name: 'Uniqlo', why: 'Quiet, cheap competence. You buy the basics and tell yourself it’s intentional.' },
]

function fallbackPortrait(p: VisitorProfile): PortraitReport {
  const a = p.article
  const inf = p.inferred
  const reel = p.session.reel
  const bucket = reel.bucket as ReelBucket | null
  const hour = p.device?.hour ?? 12
  const sus = inf.susceptibility ?? 0.4
  const impulsive = p.behavior.extremes >= 2 || (a.sensationalism ?? 0) >= 3 || reel.twist >= 120

  const age = inf.ageRange !== 'unknown' ? inf.ageRange : '22–29'
  const seg = bucket ? SEGMENTS[bucket] : 'GENERAL CONSUMER'
  const sexHint = ''
  const segment = `${seg} · ${age}${sexHint}`

  // Fake-precise KPIs derived from the real signals.
  const ltv = 6000 + Math.round(((a.income ?? 2) + 1) * 2400 + sus * 3000)
  const vulnHour = hour >= 22 || hour < 4 ? `${((hour + 11) % 12) + 1}PM – 2AM` : '11PM – 2AM'
  const kpis: KPI[] = [
    { label: 'Estimated Lifetime Value', value: `$${ltv.toLocaleString()}` },
    { label: 'Ad Receptivity', value: `${Math.round(40 + sus * 55)} / 100` },
    { label: 'Impulse Index', value: `${impulsive ? 78 + p.behavior.extremes * 3 : 46}%` },
    { label: 'Status Anxiety', value: `${Math.round(50 + sus * 40)} / 100` },
    { label: 'Discretionary Spend', value: `~$${260 + (a.income ?? 2) * 90} / mo` },
    { label: 'Self-Image Gap', value: bucket === 'money' ? '+2 income brackets' : '+1 income bracket' },
    { label: 'Churn Resistance', value: `${Math.round(10 + sus * 30)}%` },
    { label: 'Peak Vulnerability Window', value: vulnHour },
    { label: 'Time-to-Purchase', value: `${impulsive ? 18 : 48} hrs from first impression` },
    { label: 'Brand Loyalty', value: sus > 0.5 ? 'Low / promiscuous' : 'Moderate' },
    { label: 'Primary Conversion Trigger', value: sus > 0.5 ? 'Scarcity + social proof' : 'Reassurance + review' },
    { label: 'Touchpoints to Convert', value: `${impulsive ? 6 : 11}` },
    { label: 'Preferred Channel', value: `Short-form video (${80 + p.behavior.extremes * 3}% mobile)` },
    { label: 'Price Sensitivity', value: (a.income ?? 2) <= 1 ? 'High' : impulsive ? 'Low' : 'Moderate' },
    { label: 'Resale Dependency', value: bucket === 'money' ? '64%' : '21%' },
  ]

  const list = (bucket ? BRANDS_BY_BUCKET[bucket] : DEFAULT_BRANDS)
  const base = [92, 86, 79, 71, 64, 58]
  const brands: BrandPick[] = list.slice(0, 6).map((b, i) => ({
    name: b.name,
    pct: Math.max(40, base[i] - (sus < 0.4 ? 8 : 0)),
    why: b.why,
  }))

  return { segment, kpis, pitch: bucket ? PITCHES[bucket] : 'this is the one you’ve been meaning to get.', brands }
}

export { fallbackPortrait }

/** The economics of the visit: what their harvested profile resells for, what it
 *  cost the Organization to generate it, and the margin left over. Deterministic,
 *  computed from how much of themselves they actually gave up. */
export interface DataLedger {
  value: number // $ the profile is worth on the data market
  cost: number // $ it cost to profile them (model + compute)
  profit: number // value − cost
  lines: KPI[]
}

export function dataLedger(p: VisitorProfile): DataLedger {
  const a = p.article
  const s = p.session
  const turns = s.chat.turns.filter(isYou).length
  const overshared = (s.chat.log ?? []).some((r) => r.overshare)

  // Data value: a base cookie plus a premium for each sellable field they filled.
  let value = 0.06 // the raw cookie / device fingerprint
  if (a.lean != null) value += 0.04 // political lean
  if (a.income != null) value += 0.06 // income is the most sellable field
  if (a.education != null) value += 0.02
  if (a.location) value += 0.03
  if (s.reel.bucket) value += 0.05 // content taste
  if (s.ad.genre || s.ad.genreLabel) value += 0.03 // audio taste
  value += Math.min(0.14, turns * 0.02) // stated preferences, declared in their own words
  if (overshared) value += 0.06 // disclosure premium
  if (p.device) value += 0.02
  value = Math.round(value * 100) / 100

  // Cost: Claude Haiku tokens for each chat turn plus the end-of-visit report.
  const cost = Math.round((turns * 0.0004 + 0.0011) * 10000) / 10000
  const profit = Math.round((value - cost) * 10000) / 10000

  const money = (n: number) => (n < 1 ? `$${n.toFixed(n < 0.01 ? 4 : 2)}` : `$${n.toFixed(2)}`)
  return {
    value, cost, profit,
    lines: [
      { label: 'Your Data Resells For', value: money(value) },
      { label: 'Cost to Profile You', value: money(cost) },
      { label: 'Net Profit On You', value: money(profit) },
    ],
  }
}

export function buildDossier(p: VisitorProfile, article?: ArticleResult | null): { blocks: ReportBlock[]; fallback: PortraitReport } {
  const a = p.article
  const s = p.session
  const articleLines: ReportLine[] = [
    { k: 'STORY', v: article?.params.articleId?.toUpperCase() || 'UNSET' },
    { k: 'FRAME / LEAN', v: a.lean == null ? 'UNSET' : LEAN_LABELS[a.lean + 2] },
    { k: 'AUDIENCE / EDUCATION', v: a.education == null ? 'UNSET' : EDUCATION_LABELS[a.education] },
    { k: 'CONNOTATION', v: a.connotation == null ? 'UNSET' : CONNOTATION_LABELS[a.connotation + 1] },
    { k: 'SENSATIONALISM', v: a.sensationalism == null ? 'UNSET' : SENSATION_LABELS[a.sensationalism] },
    { k: 'INCOME', v: a.income == null ? 'UNSET' : INCOME_LABELS[a.income] },
    { k: 'LOCATION', v: locLine(a.location) },
  ]
  if (article?.sponsored) {
    articleLines.push({ k: 'SPONSORED LINE', v: `${article.sponsored.brand} · ${article.sponsored.headline}` })
  }

  const reel = s.reel
  const bucket = reel.bucket as ReelBucket | null
  const poles = bucket ? bucketMeta(bucket).poles : null
  const twistEach = reel.twistEach ?? [0, 0, 0]
  const reelLines: ReportLine[] = [
    { k: 'BUCKETS TRIED', v: reel.tried.length ? reel.tried.map((b) => b.toUpperCase()).join(', ') : 'NONE' },
    { k: 'BUCKETS SKIPPED', v: reel.skipped.length ? reel.skipped.map((b) => b.toUpperCase()).join(', ') : 'NONE' },
    { k: 'FINAL BUCKET', v: reel.bucket ? reel.bucket.toUpperCase() : 'UNSET' },
    { k: 'COORDINATE', v: `${reel.dials[0]} / ${reel.dials[1]} / ${reel.dials[2]}` },
    { k: 'POLES', v: poles
      ? `${poles[0][0]}↔${poles[0][1]} ${reel.dials[0]} · ${poles[1][0]}↔${poles[1][1]} ${reel.dials[1]} · ${poles[2][0]}↔${poles[2][1]} ${reel.dials[2]}`
      : 'UNSET' },
    { k: 'CORNER REEL', v: reel.currentId ? `${reel.currentId}${reel.currentSlot ? ` · ${reel.currentSlot}` : ''}` : 'UNSET' },
    { k: 'HIDDEN LEGITIMACY', v: reel.legitimacy == null ? 'UNSET' : String(reel.legitimacy) },
    { k: 'EMOJI', v: reel.emoji || 'NONE' },
    { k: 'SEND', v: reel.send ? 'YES' : 'NO' },
    { k: 'DWELL MS', v: String(reel.dwellMs) },
    { k: 'TWIST EACH', v: `${twistEach[0]} / ${twistEach[1]} / ${twistEach[2]}` },
    { k: 'TWIST DISTANCE', v: String(reel.twist) },
  ]

  const ad = s.ad
  const adLines: ReportLine[] = [
    { k: 'GENRE', v: (ad.genreLabel || ad.genre || ad.brandName || 'UNSET').toString().toUpperCase() },
    { k: 'DIALS', v: `${STATION_POLES[0][0]}↔${STATION_POLES[0][1]} ${ad.dials[0]} · ${STATION_POLES[1][0]}↔${STATION_POLES[1][1]} ${ad.dials[1]} · ${STATION_POLES[2][0]}↔${STATION_POLES[2][1]} ${ad.dials[2]}` },
    { k: 'LEGITIMACY', v: ad.legitimacy == null ? 'UNSET' : String(ad.legitimacy) },
    { k: 'LINGERED', v: ad.lingered ? 'YES' : 'NO' },
    { k: 'AUDIO', v: ad.audioUrl ? 'GENERATED' : 'NONE' },
  ]

  const chatLines: ReportLine[] = s.chat.turns.length
    ? s.chat.turns.map((t, i) => ({
      k: `${(t.from || t.role).toUpperCase()} ${i + 1}${t.topic ? ` · ${t.topic.toUpperCase()}` : ''}`,
      v: t.text,
    }))
    : [{ k: 'TURNS', v: 'NONE' }]
  chatLines.push({ k: 'SOURCE', v: (s.chat.source || 'UNSET').toUpperCase() })
  const log = s.chat.log ?? []
  if (log.length) {
    chatLines.push(
      ...log.map((row, i) => ({
        k: `ANSWER ${i + 1} · ${row.topic.toUpperCase() || 'CHAT'}`,
        v: `${row.text} · ${row.latencyMs}ms · edits ${row.edits} · len ${row.length} · overshare ${row.overshare ? 'YES' : 'NO'}`,
      })),
    )
  }

  const device = p.device
  const covert: ReportLine[] = [
    { k: 'DEVICE', v: device ? `${device.os.toUpperCase()} ${device.type.toUpperCase()} ${device.screen}` : 'UNSET' },
    { k: 'LANGUAGE', v: device?.language?.toUpperCase() || 'UNSET' },
    { k: 'HOUR', v: device ? String(device.hour) : 'UNSET' },
    { k: 'CONTROL EXTREMES', v: String(p.behavior.extremes) },
    { k: 'HESITATION SAMPLES', v: String(p.behavior.hesitationMs.length) },
  ]

  return {
    blocks: [
      { title: 'ARTICLE', lines: articleLines },
      { title: 'REEL', lines: reelLines },
      { title: 'STATION', lines: adLines },
      { title: 'CHATBOT', lines: chatLines },
      { title: 'COVERT', lines: covert },
    ],
    fallback: fallbackPortrait(p),
  }
}
