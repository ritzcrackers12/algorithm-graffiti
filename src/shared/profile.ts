import { resolveLocation } from './locations.ts'

const INCOME_LABELS = ['UNDER $30K', '$30K–60K', '$60K–100K', '$100K–200K', '$200K–500K', '$500K+']
const LEAN_LABELS = ['FAR LEFT', 'LEFT', 'CENTER', 'RIGHT', 'FAR RIGHT']

export interface DeviceSignals {
  type: 'phone' | 'tablet' | 'desktop'
  os: string
  screen: string
  language: string
  hour: number
  at: number
}

export interface ProfileEvent {
  source: 'device' | 'behavior' | 'article' | 'reel' | 'song' | 'game' | 'ad'
  key: string
  value: string
  at: number
}

export interface InferredProfile {
  incomeBracket: string | null
  region: string | null
  lean: string | null
  mood: string
  interests: string[]
  ageRange: string
  susceptibility: number
}

export interface CategoryScore {
  category: string
  confidence: number
  reasons: string[]
}

/** Structurally the same as AdPlacement; kept here to avoid a circular import with ads.ts. */
export interface ProfileAd {
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

export interface VisitorProfile {
  device: DeviceSignals | null
  events: ProfileEvent[]
  article: {
    lean: number | null
    education: number | null
    income: number | null
    location: string
    connotation: number | null
    sensationalism: number | null
  }
  behavior: {
    controlMs: number[]
    hesitationMs: number[]
    extremes: number
  }
  inferred: InferredProfile
  categories: CategoryScore[]
  adsShown: string[]
  popups: number
  lastPopupAt: number
  lastAd: ProfileAd | null
}

export const emptyProfile = (): VisitorProfile => ({
  device: null,
  events: [],
  article: { lean: null, education: null, income: null, location: '', connotation: null, sensationalism: null },
  behavior: { controlMs: [], hesitationMs: [], extremes: 0 },
  inferred: {
    incomeBracket: null, region: null, lean: null, mood: 'neutral',
    interests: [], ageRange: 'unknown', susceptibility: 0.3,
  },
  categories: [],
  adsShown: [],
  popups: 0,
  lastPopupAt: 0,
  lastAd: null,
})

export function hydrateProfile(raw: unknown): VisitorProfile {
  const e = emptyProfile()
  if (!raw || typeof raw !== 'object') return inferProfile(e)
  const r = raw as Partial<VisitorProfile>
  return inferProfile({
    ...e,
    ...r,
    article: { ...e.article, ...(r.article ?? {}) },
    behavior: {
      controlMs: r.behavior?.controlMs ?? e.behavior.controlMs,
      hesitationMs: r.behavior?.hesitationMs ?? e.behavior.hesitationMs,
      extremes: r.behavior?.extremes ?? 0,
    },
    inferred: { ...e.inferred, ...(r.inferred ?? {}) },
    events: Array.isArray(r.events) ? r.events : [],
    categories: Array.isArray(r.categories) ? r.categories : [],
    adsShown: Array.isArray(r.adsShown) ? r.adsShown : [],
    popups: r.popups ?? 0,
    lastPopupAt: r.lastPopupAt ?? 0,
    lastAd: r.lastAd ?? null,
    device: r.device ?? null,
  })
}

export function captureDevice(): DeviceSignals {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const type: DeviceSignals['type'] = /iPad|Tablet/i.test(ua)
    ? 'tablet'
    : /Mobi|iPhone|Android/i.test(ua) ? 'phone' : 'desktop'
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Android/i.test(ua) ? 'Android'
      : /Mac/i.test(ua) ? 'macOS'
        : /Win/i.test(ua) ? 'Windows' : 'other'
  const w = typeof screen === 'undefined' ? 0 : screen.width
  const h = typeof screen === 'undefined' ? 0 : screen.height
  return {
    type,
    os,
    screen: `${w}x${h}`,
    language: typeof navigator === 'undefined' ? 'en' : navigator.language || 'en',
    hour: new Date().getHours(),
    at: Date.now(),
  }
}

export function addEvent(p: VisitorProfile, ev: ProfileEvent): VisitorProfile {
  return { ...p, events: [...p.events, ev].slice(-80) }
}

export function noteControl(p: VisitorProfile, extreme: boolean): VisitorProfile {
  const now = Date.now()
  const last = p.behavior.controlMs.at(-1)
  const delta = last ? now - last : 0
  return {
    ...p,
    behavior: {
      controlMs: [...p.behavior.controlMs, now].slice(-40),
      hesitationMs: delta > 0 ? [...p.behavior.hesitationMs, delta].slice(-40) : p.behavior.hesitationMs,
      extremes: p.behavior.extremes + (extreme ? 1 : 0),
    },
  }
}

/** Editable inference. Change the numbers here. Never uses IP. */
export function inferProfile(p: VisitorProfile): VisitorProfile {
  const a = p.article
  const loc = resolveLocation(a.location)
  const region = loc.kind === 'state' ? loc.profile.name : loc.kind === 'country' ? loc.name : null
  const incomeBracket = a.income === null || a.income === undefined ? null : INCOME_LABELS[a.income]
  const lean = a.lean === null || a.lean === undefined ? null : LEAN_LABELS[a.lean + 2]
  let mood = 'neutral'
  if ((a.sensationalism ?? 0) >= 3) mood = 'anxious'
  else if (a.connotation === -1) mood = 'concerned'
  else if (a.connotation === 1) mood = 'upbeat'
  const hour = p.device?.hour ?? 12
  if (mood === 'neutral' && (hour >= 22 || hour < 6)) mood = 'restless'

  let ageRange = 'unknown'
  if (a.education === 0 || a.education === 1) ageRange = '18-24'
  else if (a.education === 2 || a.education === 3) ageRange = '25-34'
  else if (a.education === 4) ageRange = '25-44'
  else if (a.education === 5) ageRange = '30-54'
  else if (p.device?.type === 'phone' && hour >= 21) ageRange = '18-34'

  const interests: string[] = []
  if ((a.lean ?? 0) <= -1) interests.push('civic', 'labor')
  if ((a.lean ?? 0) >= 1) interests.push('security', 'markets')
  if ((a.income ?? 3) <= 1) interests.push('value')
  if ((a.income ?? 0) >= 4) interests.push('premium')
  if (mood === 'anxious' || mood === 'restless') interests.push('relief')
  if (mood === 'upbeat') interests.push('lifestyle')

  const sens = (a.sensationalism ?? 0) / 4
  const ext = Math.min(1, p.behavior.extremes / 4)
  const susceptibility = Math.round((0.25 + sens * 0.5 + ext * 0.25) * 100) / 100

  const inferred: InferredProfile = {
    incomeBracket, region, lean, mood, interests, ageRange, susceptibility,
  }
  return { ...p, inferred, categories: scoreCategories(inferred, p.device) }
}

function scoreCategories(inf: InferredProfile, device: DeviceSignals | null): CategoryScore[] {
  const rows: CategoryScore[] = [
    {
      category: 'wellness',
      confidence: inf.mood === 'anxious' || inf.mood === 'restless' ? 0.72 : 0.28,
      reasons: [`MOOD: ${inf.mood.toUpperCase()}`],
    },
    {
      category: 'finance',
      confidence: inf.incomeBracket && /\$100K|\$200K|\$500K/.test(inf.incomeBracket) ? 0.7 : 0.25,
      reasons: inf.incomeBracket ? [`INCOME ${inf.incomeBracket}`] : ['INCOME UNSET'],
    },
    {
      category: 'security',
      confidence: inf.lean === 'RIGHT' || inf.lean === 'FAR RIGHT' ? 0.74 : 0.22,
      reasons: inf.lean ? [`LEAN ${inf.lean}`] : ['LEAN UNSET'],
    },
    {
      category: 'civic',
      confidence: inf.lean === 'LEFT' || inf.lean === 'FAR LEFT' ? 0.74 : 0.22,
      reasons: inf.lean ? [`LEAN ${inf.lean}`] : ['LEAN UNSET'],
    },
    {
      category: 'education',
      confidence: inf.ageRange === '18-24' || inf.ageRange === '25-34' ? 0.6 : 0.3,
      reasons: [`AGE RANGE ${inf.ageRange.toUpperCase()}`],
    },
    {
      category: 'lifestyle',
      confidence: inf.mood === 'upbeat' || inf.interests.includes('lifestyle') ? 0.65 : 0.3,
      reasons: [`MOOD: ${inf.mood.toUpperCase()}`],
    },
  ]
  if (inf.region) {
    for (const row of rows) {
      row.reasons.push(`REGION ${inf.region.toUpperCase()}`)
      row.confidence = Math.min(0.95, row.confidence + 0.06)
    }
  }
  if (device) {
    const clock = device.hour >= 12
      ? `${((device.hour - 1) % 12) + 1}:00 ${device.hour >= 12 ? 'PM' : 'AM'}`
      : `${device.hour}:00 AM`
    for (const row of rows) {
      row.reasons.push(`DEVICE: ${device.os.toUpperCase()} ${device.type.toUpperCase()}, ${clock}`)
      row.confidence = Math.min(0.95, row.confidence + 0.04)
    }
  }
  return rows.sort((a, b) => b.confidence - a.confidence)
}

export function applyArticleParams(
  p: VisitorProfile,
  article: VisitorProfile['article'],
): VisitorProfile {
  const next = inferProfile({ ...p, article })
  const at = Date.now()
  const events: ProfileEvent[] = [...next.events]
  const push = (key: string, value: string) => {
    events.push({ source: 'article', key, value, at })
  }
  if (article.lean !== null) push('lean', String(article.lean))
  if (article.education !== null) push('education', String(article.education))
  if (article.income !== null) push('income', String(article.income))
  if (article.location) push('location', article.location)
  if (article.connotation !== null) push('connotation', String(article.connotation))
  if (article.sensationalism !== null) push('sensationalism', String(article.sensationalism))
  return { ...next, events: events.slice(-80) }
}

export function clockLabel(at: number) {
  return new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
