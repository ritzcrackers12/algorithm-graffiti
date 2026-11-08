import { AD_POLES } from './adTuner.ts'
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

export function buildDossier(p: VisitorProfile, article?: ArticleResult | null): { blocks: ReportBlock[]; assumptions: string[] } {
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
    { k: 'DIALS', v: `${AD_POLES[0][0]}↔${AD_POLES[0][1]} ${ad.dials[0]} · ${AD_POLES[1][0]}↔${AD_POLES[1][1]} ${ad.dials[1]} · ${AD_POLES[2][0]}↔${AD_POLES[2][1]} ${ad.dials[2]}` },
    { k: 'BRAND', v: ad.brandName || ad.brandId || 'UNSET' },
    { k: 'LEGITIMACY', v: ad.legitimacy == null ? 'UNSET' : String(ad.legitimacy) },
    { k: 'MATCHED IMPLIED PROFILE', v: ad.matchedProfile == null ? 'UNSET' : ad.matchedProfile ? 'YES' : 'NO' },
    { k: 'LINGERED', v: ad.lingered ? 'YES' : 'NO' },
    { k: 'IMAGE', v: ad.imageUrl ? 'GENERATED' : 'TEMPLATE CARD' },
  ]

  const chatLines: ReportLine[] = s.chat.turns.length
    ? s.chat.turns.map((t, i) => ({
      k: `${t.role.toUpperCase()} ${i + 1}${t.topic ? ` · ${t.topic.toUpperCase()}` : ''}`,
      v: t.text,
    }))
    : [{ k: 'TURNS', v: 'NONE' }]
  chatLines.push({ k: 'SOURCE', v: (s.chat.source || 'UNSET').toUpperCase() })

  const device = p.device
  const covert: ReportLine[] = [
    { k: 'DEVICE', v: device ? `${device.os.toUpperCase()} ${device.type.toUpperCase()} ${device.screen}` : 'UNSET' },
    { k: 'LANGUAGE', v: device?.language?.toUpperCase() || 'UNSET' },
    { k: 'HOUR', v: device ? String(device.hour) : 'UNSET' },
    { k: 'CONTROL EXTREMES', v: String(p.behavior.extremes) },
    { k: 'HESITATION SAMPLES', v: String(p.behavior.hesitationMs.length) },
  ]

  const inf = p.inferred
  const assumptions = [
    `INCOME BRACKET: ${inf.incomeBracket ?? 'UNKNOWN'}`,
    `REGION: ${inf.region ?? 'UNKNOWN'}`,
    `LEAN: ${inf.lean ?? 'UNKNOWN'}`,
    `MOOD: ${inf.mood.toUpperCase()}`,
    `AGE RANGE: ${inf.ageRange.toUpperCase()}`,
    `INTERESTS: ${inf.interests.length ? inf.interests.map((x) => x.toUpperCase()).join(', ') : 'NONE'}`,
    `SUSCEPTIBILITY: ${inf.susceptibility}`,
    ...p.categories.slice(0, 6).map((c) => `${c.category.toUpperCase()} ${Math.round(c.confidence * 100)}% · ${c.reasons[0] ?? ''}`),
  ]

  return {
    blocks: [
      { title: 'ARTICLE', lines: articleLines },
      { title: 'REEL', lines: reelLines },
      { title: 'ADVERTISEMENT', lines: adLines },
      { title: 'CHATBOT', lines: chatLines },
      { title: 'COVERT', lines: covert },
    ],
    assumptions,
  }
}
