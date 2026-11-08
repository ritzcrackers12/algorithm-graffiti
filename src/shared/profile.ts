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
  source: 'device' | 'behavior' | 'article' | 'reel' | 'ad' | 'chat' | 'song' | 'game'
  key: string
  value: string
  at: number
}

export interface ReelSession {
  tried: string[]
  skipped: string[]
  bucket: string | null
  dials: [number, number, number]
  currentId: string | null
  currentSlot: string | null
  legitimacy: number | null
  emoji: string | null
  send: boolean
  dwellMs: number
  twist: number
  twistEach: [number, number, number]
  moved: [boolean, boolean, boolean]
  phase: 'pick' | 'tune' | 'play' | 'react' | 'done'
}

export interface AdSession {
  dials: [number, number, number]
  brandId: string | null
  brandName: string | null
  legitimacy: number | null
  lingered: boolean
  matchedProfile: boolean | null
  imageUrl: string | null
  overlay: { wordmark: string; headline: string; cta: string } | null
  source: string | null
}

export interface ChatSession {
  turns: import('./chatScript.ts').ChatTurn[]
  topic: string
  n: number
  source: string
}

export interface SessionLog {
  reel: ReelSession
  ad: AdSession
  chat: ChatSession
}

export const emptySession = (): SessionLog => ({
  reel: {
    tried: [], skipped: [], bucket: null, dials: [50, 50, 50],
    currentId: null, currentSlot: null, legitimacy: null,
    emoji: null, send: false, dwellMs: 0, twist: 0,
    twistEach: [0, 0, 0], moved: [false, false, false], phase: 'pick',
  },
  ad: {
    dials: [50, 50, 50], brandId: null, brandName: null, legitimacy: null,
    lingered: false, matchedProfile: null, imageUrl: null, overlay: null, source: null,
  },
  chat: { turns: [], topic: '', n: 0, source: '' },
})

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
  riffsOn?: string
  report?: string
  invented?: boolean
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
  /** Built off-screen so the next popup/shop ad can paint without waiting. */
  pendingAd: ProfileAd | null
  adClosedAt: number
  session: SessionLog
  game: {
    urgencyGroup: 'urgent' | 'control' | null
    recommended: 'slots' | 'auction' | 'higherLower' | 'pet' | null
    tookRecommended: boolean | null
    seen: Array<'slots' | 'auction' | 'higherLower' | 'pet'>
    trustedPersona: string | null
    lastSummary: Record<string, unknown> | null
    traits: Record<string, string>
    lastLine: string
  }
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
  pendingAd: null,
  adClosedAt: 0,
  session: emptySession(),
  game: {
    urgencyGroup: null,
    recommended: null,
    tookRecommended: null,
    seen: [],
    trustedPersona: null,
    lastSummary: null,
    traits: {},
    lastLine: '',
  },
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
    pendingAd: r.pendingAd ?? null,
    adClosedAt: r.adClosedAt ?? 0,
    device: r.device ?? null,
    session: {
      reel: {
        ...e.session.reel,
        ...(r.session?.reel ?? {}),
        dials: r.session?.reel?.dials ?? e.session.reel.dials,
        twistEach: r.session?.reel?.twistEach ?? e.session.reel.twistEach,
        moved: r.session?.reel?.moved ?? e.session.reel.moved,
        emoji: r.session?.reel?.emoji ?? e.session.reel.emoji,
      },
      ad: { ...e.session.ad, ...(r.session?.ad ?? {}) },
      chat: {
        ...e.session.chat,
        ...(r.session?.chat ?? {}),
        turns: Array.isArray(r.session?.chat?.turns) ? r.session.chat.turns : e.session.chat.turns,
      },
    },
    game: {
      ...e.game,
      ...(r.game ?? {}),
      seen: r.game?.seen ?? e.game.seen,
      traits: { ...e.game.traits, ...(r.game?.traits ?? {}) },
    },
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

  const blob = p.events.map((e) => e.value).join(' ').toLowerCase()
  const interests: string[] = []
  if ((a.lean ?? 0) <= -1) interests.push('civic', 'labor')
  if ((a.lean ?? 0) >= 1) interests.push('security', 'markets')
  if ((a.income ?? 3) <= 1) interests.push('value')
  if ((a.income ?? 0) >= 4) interests.push('premium')
  if (mood === 'anxious' || mood === 'restless') interests.push('relief')
  if (mood === 'upbeat') interests.push('lifestyle')
  const clusters: [string, RegExp][] = [
    ['wellness', /wellness|pilates|meditation|skincare|smoothie/],
    ['fitness', /fitness|gym|hiit|workout/],
    ['fashion', /fashion|streetwear|sneakers/],
    ['food', /food|bowl|lunch|coffee|matcha/],
    ['finance', /finance|invest|trading|crypto|markets/],
    ['mental-health', /therapy|mental|lonely|anxious/],
    ['tech', /\bai\b|tech|chatgpt/],
    ['astrology', /astrology|spiritual|cosmic/],
    ['nightlife', /nightlife|wine|bar|dispensary/],
    ['luxury', /luxury|premium|status|platinum/],
    ['dating', /dating|single|rizz/],
    ['music', /music|audio|spotify/],
    ['gaming', /gaming|gamer/],
    ['sports', /sports/],
  ]
  for (const [name, re] of clusters) {
    if (re.test(blob) && !interests.includes(name)) interests.push(name)
  }
  const petCats = Array.isArray(p.game?.lastSummary?.topCategories) ? p.game.lastSummary.topCategories as string[] : []
  const petMap: Record<string, string> = {
    food: 'food', indulgence: 'lifestyle', hygiene: 'wellness', health: 'wellness', goods: 'fashion', luxury: 'luxury',
  }
  for (const cat of petCats) {
    const mapped = petMap[cat]
    if (mapped && !interests.includes(mapped)) interests.push(mapped)
  }
  const quality = (p.game?.traits?.QUALITY_PREFERENCE ?? '').toUpperCase()
  if (quality.includes('PREMIUM') && !interests.includes('premium')) interests.push('premium')
  if (quality.includes('BUDGET') && !interests.includes('value')) interests.push('value')

  const sens = (a.sensationalism ?? 0) / 4
  const ext = Math.min(1, p.behavior.extremes / 4)
  const susceptibility = Math.round((0.25 + sens * 0.5 + ext * 0.25) * 100) / 100

  const inferred: InferredProfile = {
    incomeBracket, region, lean, mood, interests, ageRange, susceptibility,
  }
  return { ...p, inferred, categories: scoreCategories(inferred, p.device, blob) }
}

function scoreCategories(inf: InferredProfile, device: DeviceSignals | null, blob = ''): CategoryScore[] {
  const rows: CategoryScore[] = [
    {
      category: 'wellness',
      confidence: inf.mood === 'anxious' || inf.mood === 'restless' || inf.interests.includes('wellness') ? 0.72 : 0.28,
      reasons: [`MOOD: ${inf.mood.toUpperCase()}`],
    },
    {
      category: 'finance',
      confidence: inf.interests.includes('finance') || inf.interests.includes('crypto') || (inf.incomeBracket && /\$100K|\$200K|\$500K/.test(inf.incomeBracket)) ? 0.7 : 0.25,
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
    {
      category: 'mental-health',
      confidence: inf.mood === 'anxious' || inf.interests.includes('mental-health') ? 0.7 : 0.2,
      reasons: [`MOOD: ${inf.mood.toUpperCase()}`],
    },
    {
      category: 'fitness',
      confidence: inf.interests.includes('fitness') ? 0.68 : 0.18,
      reasons: inf.interests.includes('fitness') ? ['INTEREST FITNESS'] : ['FITNESS UNSET'],
    },
    {
      category: 'fashion',
      confidence: inf.interests.includes('fashion') || inf.interests.includes('luxury') ? 0.66 : 0.18,
      reasons: inf.interests.includes('fashion') ? ['INTEREST FASHION'] : ['FASHION UNSET'],
    },
    {
      category: 'luxury',
      confidence: inf.interests.includes('luxury') || inf.interests.includes('premium') ? 0.7 : 0.18,
      reasons: inf.interests.includes('premium') ? ['INTEREST PREMIUM'] : ['LUXURY UNSET'],
    },
    {
      category: 'tech',
      confidence: inf.interests.includes('tech') ? 0.64 : 0.18,
      reasons: inf.interests.includes('tech') ? ['INTEREST TECH'] : ['TECH UNSET'],
    },
  ]
  if (blob && /wellness|therapy/.test(blob)) {
    const w = rows.find((r) => r.category === 'wellness')
    if (w) w.confidence = Math.min(0.9, w.confidence + 0.12)
  }
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
