// GENERATED COPY of src/shared/report.ts. Edit that file instead, then run `npm run sync-shared`.
import { STATION_POLES } from './station.ts'
import { bucketMeta, type ReelBucket } from './reelLibrary.ts'
import { CONNOTATION_LABELS, EDUCATION_LABELS, INCOME_LABELS, LEAN_LABELS, SENSATION_LABELS } from './article.ts'
import { resolveLocation } from './locations.ts'
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

/** The payoff: a flat character read assembled from everything the visitor did.
 *  Stated as conclusions about who they are, each pinned to a choice. No ad/
 *  purchase framing, and it never calls itself "your usual". The chat answers
 *  feed in through p.inferred (interests) + behavior; deeper wiring lands next. */
function personalityPortrait(p: VisitorProfile): ReportLine[] {
  const a = p.article
  const inf = p.inferred
  const reel = p.session.reel
  const ad = p.session.ad
  const bucket = reel.bucket as ReelBucket | null
  const poles = bucket ? bucketMeta(bucket).poles : null
  const impulsive = p.behavior.extremes >= 2 || (a.sensationalism ?? 0) >= 3
  const lines: ReportLine[] = []

  // WHO YOU ARE — one-line synthesis
  const ageHint = inf.ageRange !== 'unknown' ? inf.ageRange : ''
  lines.push({
    k: 'WHO YOU ARE',
    v: [ageHint, bucket ? `${bucket}-leaning` : '', impulsive ? 'quick to react' : 'deliberate']
      .filter(Boolean).join(', ').toUpperCase() || 'A WORK IN PROGRESS',
  })

  // WHAT YOU'RE INTO
  const worlds: string[] = []
  if (bucket) worlds.push(bucket)
  if (ad.genreLabel || ad.genre) worlds.push(String(ad.genreLabel || ad.genre))
  for (const it of inf.interests.slice(0, 5)) if (!worlds.includes(it)) worlds.push(it)
  lines.push({ k: "WHAT YOU'RE INTO", v: (worlds.length ? worlds.join(', ') : 'a little of everything').toUpperCase() })

  // HOW YOU THINK
  const traits: string[] = [impulsive ? 'impulsive, reacts fast' : 'measured, holds back']
  if (poles) {
    const d2 = reel.dials[1]
    traits.push(d2 >= 60 ? 'drawn to the obscure' : d2 <= 40 ? 'mainstream taste' : 'middle-of-the-road taste')
    const right3 = poles[2][1].toLowerCase()
    if (right3.includes('ironic') || right3.includes('performative')) {
      traits.push(reel.dials[2] >= 60 ? "ironic, keeps it at arm's length" : 'earnest, means it')
    }
  }
  lines.push({ k: 'HOW YOU THINK', v: traits.join('; ').toUpperCase() })

  // WHAT YOU VALUE
  let values = 'pragmatic, hard to pin down'
  if (a.lean != null && a.lean <= -1) values = 'fairness, collective good, change'
  else if (a.lean != null && a.lean >= 1) values = 'order, self-reliance, tradition'
  else if (a.lean === 0) values = 'balance, both-sides pragmatism'
  if ((a.sensationalism ?? 0) >= 3) values += '; pulled in by stakes and outrage'
  lines.push({ k: 'WHAT YOU VALUE', v: values.toUpperCase() })

  // HOW YOU WANT TO BE SEEN
  let image = 'low-key, unbothered'
  if (a.education != null && a.education >= 4) image = 'as informed and credentialed'
  else if (a.education != null && a.education <= 1) image = 'as down-to-earth, no pretense'
  if (a.income != null && a.income >= 4) image += '; a little above it'
  else if (a.income != null && a.income <= 1) image += '; scrappy, getting by'
  lines.push({ k: 'HOW YOU WANT TO BE SEEN', v: image.toUpperCase() })

  // WHAT MOVES YOU
  let moves = 'you mostly make up your own mind'
  if (inf.susceptibility >= 0.55 || (reel.legitimacy != null && reel.legitimacy <= 40)) {
    moves = 'you move with what gets put in front of you — trends, social proof, the next thing in the feed'
  } else if (inf.susceptibility >= 0.4) {
    moves = "you'll follow a strong pull, but you notice the pitch"
  }
  lines.push({ k: 'WHAT MOVES YOU', v: moves.toUpperCase() })

  // WHAT YOU'RE REACHING FOR
  let need = 'something to hold your attention'
  if (inf.mood === 'anxious' || inf.mood === 'restless') need = 'comfort, relief, something to settle the noise'
  else if (inf.mood === 'upbeat') need = 'stimulation, status, more of the high'
  else if (inf.mood === 'concerned') need = "control, a sense that it'll be okay"
  const energy = ad.dials?.[0]
  if (energy != null && energy >= 65) need += '; you reach for intensity'
  else if (energy != null && energy <= 35) need += '; you reach for calm'
  lines.push({ k: "WHAT YOU'RE REACHING FOR", v: need.toUpperCase() })

  return lines
}

export function buildDossier(p: VisitorProfile, article?: ArticleResult | null): { blocks: ReportBlock[]; assumptions: ReportLine[] } {
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
