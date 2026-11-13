// GENERATED COPY of src/shared/report.ts. Edit that file instead, then run `npm run sync-shared`.
import { STATION_POLES } from './station.ts'
import { bucketMeta, type ReelBucket } from './reelLibrary.ts'
import { CONNOTATION_LABELS, EDUCATION_LABELS, INCOME_LABELS, LEAN_LABELS, SENSATION_LABELS } from './article.ts'
import { resolveLocation } from './locations.ts'
import { SCENARIOS, isYou, scenarioOf } from './chatScript.ts'
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

function locLine(raw: string) {
  const loc = resolveLocation(raw)
  if (loc.kind === 'state') return loc.profile.name.toUpperCase()
  if (loc.kind === 'country') return loc.name.toUpperCase()
  return raw ? raw.toUpperCase() : 'UNSET'
}

/** The payoff: what the Organization assumes about the visitor, grouped into
 *  three lenses — what makes them SELLABLE, their PERSONAL & LIFESTYLE portrait,
 *  and their MEDIA DIET. Each line is a conclusion, pinned to real choices, not
 *  a readout of the dials. The live model rewrites these in portraitSystemPrompt;
 *  this deterministic version is the instant/offline fallback. */
export const ASSUMPTION_SECTIONS = [
  { title: 'SELLABLE', keys: ['SPENDING POWER', "WHAT YOU'LL PAY FOR", 'HOW TO SELL TO YOU', 'IN-MARKET FOR'] },
  { title: 'PERSONAL & LIFESTYLE', keys: ['LIFE STAGE', 'YOUR SCENE', 'YOUR PEOPLE', 'YOUR VICE'] },
  { title: 'MEDIA DIET', keys: ['YOUR BUBBLE', 'WHAT YOU READ', 'YOUR TASTE', 'THE LOOP'] },
] as const

const SCENE_WORDS: Record<ReelBucket, string> = {
  comedy: 'group chats and clips you send at 1am',
  lifestyle: 'tidy routines, hauls, and aesthetic cafes',
  body: 'the gym, the mirror, the progress photo',
  mind: 'therapy-speak, journaling, and self-work',
  money: 'the grind, the flex, the next come-up',
  culture: 'discourse, inside jokes, being online',
}

function personalityPortrait(p: VisitorProfile): ReportBlock[] {
  const a = p.article
  const inf = p.inferred
  const reel = p.session.reel
  const ad = p.session.ad
  const chat = p.session.chat
  const bucket = reel.bucket as ReelBucket | null
  const poles = bucket ? bucketMeta(bucket).poles : null
  const genre = String(ad.genreLabel || ad.genre || '').toLowerCase()
  const hour = p.device?.hour ?? 12
  const impulsive = p.behavior.extremes >= 2 || (a.sensationalism ?? 0) >= 3 || reel.twist >= 120

  const userText = chat.turns.filter(isYou).map((t) => t.text.toLowerCase()).join(' ')
  const log = chat.log ?? []
  const totalEdits = log.reduce((s, r) => s + r.edits, 0)
  const overshared = log.some((r) => r.overshare)
  const priceCues = /\bcheap|split|venmo|\$|\bsix|sixer|free|broke|save|deal|coupon|afford|budget/.test(userText)
  const scenario = chat.scenario ? SCENARIOS[scenarioOf(p)] : null
  const nightlife = inf.interests.some((i) => i === 'nightlife' || i === 'luxury') || /\bbar\b|drink|club|party|weed|vape/.test(userText)

  // ---- SELLABLE ----
  let spend = 'Middle-market. Will pay for convenience over prestige.'
  if (a.income != null && a.income >= 4) spend = 'High disposable income. Worth premium placement and upsell.'
  else if (a.income != null && a.income <= 1) spend = 'Thin margins. Reach through volume and discounts, not luxury.'
  else if (a.income == null) spend = genre.includes('ambient') || bucket === 'money' ? 'Reads aspirational — spends up to look the part.' : 'Unremarkable spend, steady and predictable.'

  let pay = 'Considered buyer — researches first, so slow and costly to convert.'
  if (priceCues || (a.income != null && a.income <= 1)) pay = 'Price-first. Checks the cost before the want — deal- and coupon-responsive.'
  else if (impulsive) pay = 'Impulse-led. Buys on reaction, rarely returns it.'

  let sell = 'Hard sell. Resists the obvious ad; has to feel like their own idea.'
  if (inf.susceptibility >= 0.55 || (reel.legitimacy != null && reel.legitimacy <= 40)) sell = 'Social proof and urgency. Moves with what trends and what others already picked.'
  else if (inf.susceptibility >= 0.4) sell = 'A strong pitch lands, but they notice it — sell soft.'

  const market: string[] = []
  if (bucket) market.push(bucket)
  if (genre) market.push(genre)
  for (const it of inf.interests.slice(0, 4)) if (!market.includes(it)) market.push(it)
  const inMarket = market.length ? `Ripe for: ${market.join(', ')}.` : 'Still mapping what to sell you.'

  // ---- PERSONAL & LIFESTYLE ----
  const age = inf.ageRange !== 'unknown' ? inf.ageRange : 'twenties-ish'
  let work = 'early-career'
  if (a.education != null && a.education >= 4) work = 'degree-track, white-collar'
  else if (a.education != null && a.education <= 1) work = 'working, hands-on, no pretense'
  const stage = `${age}. Reads ${work}${chat.scenario === 'work' ? ', and work is on your mind' : ''}.`

  const sceneBits: string[] = []
  if (bucket) sceneBits.push(SCENE_WORDS[bucket])
  if (genre) sceneBits.push(`${genre} in the headphones`)
  const scene = sceneBits.length ? `We picture ${sceneBits.join('; ')}.` : 'A life we can only half-see yet.'

  let people = 'Private about who you keep close.'
  if (chat.scenario === 'group') people = 'Social, built around the group — you move with the plan.'
  else if (chat.scenario === 'situationship') people = 'Something undefined and a little anxious; you keep it loose on purpose.'
  else if (chat.scenario === 'work') people = 'You measure yourself against peers more than you let on.'
  if (overshared) people += ' Opens up fast once comfortable.'
  else if (totalEdits >= 4) people += ' Chooses every word carefully.'

  let vice = 'Comfort over discipline when no one is watching.'
  if (nightlife) vice = 'Nights out and a drink to take the edge off.'
  else if (inf.mood === 'anxious' || inf.mood === 'restless' || hour >= 22 || hour < 6) vice = 'Scrolling past midnight to quiet the noise.'
  else if ((ad.dials?.[0] ?? 50) >= 65) vice = 'Chasing intensity — louder, faster, more.'

  // ---- MEDIA DIET ----
  let bubble = 'Politically unread — which is its own kind of bubble.'
  if (a.lean != null && a.lean <= -1) bubble = 'Left of center, and the feed keeps it that way.'
  else if (a.lean != null && a.lean >= 1) bubble = 'Right of center, and the feed keeps it that way.'
  else if (a.lean === 0) bubble = 'You think you are neutral; the feed still has a side picked for you.'

  let read = 'Somewhere between outrage and analysis.'
  if ((a.sensationalism ?? 0) >= 3) read = 'Heat over nuance — you click whatever is loudest.'
  else if ((a.sensationalism ?? 0) <= 1) read = 'You want it measured and sourced.'
  if (a.education != null && a.education >= 4) read += ' Pitched smart.'
  else if (a.education != null && a.education <= 1) read += ' Kept simple.'

  let taste = 'Middle-of-the-road taste.'
  if (poles) {
    const d2 = reel.dials[1]
    taste = d2 >= 60 ? 'Niche taste — you dig past the front page.' : d2 <= 40 ? 'Mainstream — you ride whatever is served.' : 'Middle-of-the-road taste.'
    const r3 = poles[2][1].toLowerCase()
    if (r3.includes('ironic') || r3.includes('performative')) taste += reel.dials[2] >= 60 ? ' Ironic, held at arm’s length.' : ' Earnest, you mean it.'
  }

  const loop = inf.susceptibility >= 0.5 || (reel.legitimacy != null && reel.legitimacy <= 40)
    ? 'You live inside the recommendation loop. The usual finds you before you look.'
    : 'You step out of the feed sometimes — but it still knows your usual.'

  const map: Record<string, string> = {
    'SPENDING POWER': spend,
    "WHAT YOU'LL PAY FOR": pay,
    'HOW TO SELL TO YOU': sell,
    'IN-MARKET FOR': inMarket,
    'LIFE STAGE': stage,
    'YOUR SCENE': scene,
    'YOUR PEOPLE': people,
    'YOUR VICE': vice,
    'YOUR BUBBLE': bubble,
    'WHAT YOU READ': read,
    'YOUR TASTE': taste,
    'THE LOOP': loop,
  }
  void scenario
  return ASSUMPTION_SECTIONS.map((s) => ({
    title: s.title,
    lines: s.keys.map((k) => ({ k, v: (map[k] || '').toUpperCase() })),
  }))
}

export function buildDossier(p: VisitorProfile, article?: ArticleResult | null): { blocks: ReportBlock[]; assumptions: ReportBlock[] } {
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

  const assumptions = personalityPortrait(p)

  return {
    blocks: [
      { title: 'ARTICLE', lines: articleLines },
      { title: 'REEL', lines: reelLines },
      { title: 'STATION', lines: adLines },
      { title: 'CHATBOT', lines: chatLines },
      { title: 'COVERT', lines: covert },
    ],
    assumptions,
  }
}
