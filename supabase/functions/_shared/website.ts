// GENERATED COPY of src/shared/website.ts. Edit that file instead, then run `npm run sync-shared`.
import type { WebsiteParams } from './types.ts'
import { clampInt, cleanShortText, isBlocked } from './text.ts'

export const ERAS = [1996, 2006, 2016, 2026] as const
export const MOOD_LABELS = ['DESPAIR', 'MELANCHOLY', 'NEUTRAL', 'CONTENT', 'ELATION']

/** Invented governing models for the flag grid. `flag` drives the drawn flag on the phone. */
export const COUNTRY_MODELS = [
  { id: 'hyper-capitalist', label: 'HYPER-CAPITALIST', flag: ['#f5c400', '#111111', '#f5c400'], symbol: '$',
    prompt: 'a hyper-capitalist state where everything is monetized, sponsored, upsold and surge-priced' },
  { id: 'state-moderation', label: 'HEAVY STATE MODERATION', flag: ['#7a0000', '#d9d9d9', '#7a0000'], symbol: '■',
    prompt: 'a state with heavy content moderation where all speech is reviewed, approved or redacted by a ministry' },
  { id: 'transparency', label: 'TOTAL TRANSPARENCY', flag: ['#ffffff', '#00a3ff', '#ffffff'], symbol: '◎',
    prompt: 'a radical-transparency society where all data, surveillance and salaries are public' },
  { id: 'corporate-city', label: 'CORPORATE CITY-STATE', flag: ['#1d2b64', '#9aa5b1', '#1d2b64'], symbol: '▲',
    prompt: 'a corporate city-state where the company is also the government, landlord and employer' },
  { id: 'post-collapse', label: 'POST-COLLAPSE', flag: ['#5b4636', '#a67c52', '#2e2e2e'], symbol: '✕',
    prompt: 'a post-collapse society with scarce electricity, barter and improvised infrastructure' },
  { id: 'techno-optimist', label: 'TECHNO-OPTIMIST', flag: ['#00e0b0', '#6b5cff', '#00e0b0'], symbol: '✦',
    prompt: 'a techno-optimist state that believes every problem is already solved by technology' },
] as const

export const DEFAULT_WEBSITE_PARAMS: WebsiteParams = { era: 2016, country: 'hyper-capitalist', countryText: '', mood: 2 }

/** CSS variables the AI may change. The base site must read its colors/fonts from these. */
export const CSS_VARS = {
  '--bg': 'page background color',
  '--surface': 'card/panel background color',
  '--text': 'main text color',
  '--muted': 'secondary text color',
  '--accent': 'button / highlight color',
  '--accent-text': 'text color on buttons',
  '--border': 'border color',
  '--link': 'link color',
  '--hero-bg': 'hero banner background (color or CSS gradient)',
  '--font-body': 'body font-family stack',
  '--font-display': 'heading font-family stack',
  '--radius': 'corner radius, e.g. 0px or 16px',
  '--shadow': 'box-shadow for cards, or none',
  '--heading-case': 'text-transform for headings: none | uppercase | lowercase',
  '--heading-spacing': 'letter-spacing for headings, e.g. -1px or 2px',
  '--border-width': 'border width, e.g. 1px or 3px',
} as const

export const SAFE_FONTS = [
  'Times New Roman', 'Georgia', 'Verdana', 'Trebuchet MS', 'Arial', 'Helvetica Neue', 'Courier New',
  'Avenir Next', 'Futura', 'Didot', 'American Typewriter', 'Marker Felt', 'Menlo', 'Impact', 'system-ui',
]

export function validateWebsiteParams(v: unknown): WebsiteParams | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const era = ERAS.find((e) => e === o.era)
  const mood = clampInt(o.mood, 0, 4)
  if (!era || mood === null) return null
  if (o.country === 'custom') {
    const t = cleanShortText(o.countryText, 40)
    if (!t || isBlocked(t)) return null
    return { era, mood, country: 'custom', countryText: t }
  }
  if (!COUNTRY_MODELS.some((c) => c.id === o.country)) return null
  return { era, mood, country: o.country as string, countryText: '' }
}

export function countryLabel(p: WebsiteParams): string {
  return p.country === 'custom' ? p.countryText.toUpperCase() : (COUNTRY_MODELS.find((c) => c.id === p.country)?.label ?? '')
}

const safeCssValue = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 160 && !/[;{}<>\\]|url\s*\(|expression|@import|javascript:/i.test(v)

export function sanitizeVars(v: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!v || typeof v !== 'object') return out
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (k in CSS_VARS && safeCssValue(val)) out[k] = val.trim()
  }
  return out
}

export function sanitizeTexts(v: unknown, allowed: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  if (!v || typeof v !== 'object') return out
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!(k in allowed) || typeof val !== 'string') continue
    const t = val.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
    const max = Math.max(60, allowed[k].length * 2)
    if (t && !isBlocked(t)) out[k] = t.slice(0, max)
  }
  return out
}

/** Pulls `data-editable="id"` elements (plain text only) out of the base site's HTML. */
export function extractEditables(html: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /<([a-z0-9]+)\b[^>]*\bdata-editable="([a-z0-9_-]+)"[^>]*>([^<]*)<\/\1>/gi
  for (const m of html.matchAll(re)) out[m[2]] = m[3].replace(/\s+/g, ' ').trim()
  return out
}

// ---------- real AI prompt ----------

export function websitePrompt(p: WebsiteParams, texts: Record<string, string>) {
  const country =
    p.country === 'custom'
      ? `a country run on the "${p.countryText}" model (interpret this freely)`
      : COUNTRY_MODELS.find((c) => c.id === p.country)!.prompt
  const system =
    'You are a website restyling engine for an art installation about how algorithms shape reality. ' +
    'You receive a homepage\'s editable texts and must restyle and rewrite it. ' +
    'Reply with ONE JSON object only, no commentary, shaped exactly like ' +
    '{"vars": {"--bg": "#ffffff", ...}, "texts": {"<id>": "<new text>", ...}}.\n' +
    'Allowed CSS variables:\n' +
    Object.entries(CSS_VARS).map(([k, d]) => `  ${k}: ${d}`).join('\n') +
    `\nFonts must come from this list (with a generic fallback): ${SAFE_FONTS.join(', ')}.\n` +
    'Never use url(), images, HTML tags, emoji, real brand names, slurs or violence. ' +
    'Rewrite every text id you are given, keep each one roughly the same length (at most double), plain text only.'
  const prompt =
    `Era: ${p.era}. Make the visual style and the copywriting feel authentically like a company website from ${p.era}.\n` +
    `Country model: ${country}. Let it shape the tone, slogans, warnings and details.\n` +
    `Mood: ${MOOD_LABELS[p.mood].toLowerCase()}. Shift the color tones and small details to express this emotion.\n\n` +
    `Editable texts (id: text):\n${JSON.stringify(texts, null, 2)}`
  return { system, prompt }
}

export function parseWebsiteOutput(text: string, allowed: Record<string, string>) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const json = JSON.parse(text.slice(start, end + 1))
    const vars = sanitizeVars(json.vars)
    const texts = sanitizeTexts(json.texts, allowed)
    if (Object.keys(vars).length < 3 && Object.keys(texts).length < 2) return null
    return { vars, texts }
  } catch {
    return null
  }
}

// ---------- mock restyle (used in MOCK_MODE and as the fallback) ----------

const ERA_VARS: Record<number, Record<string, string>> = {
  1996: {
    '--bg': '#c0c0c0', '--surface': '#ffffff', '--text': '#000000', '--muted': '#333333', '--accent': '#000080',
    '--accent-text': '#ffffff', '--border': '#808080', '--link': '#0000ee', '--hero-bg': '#008080',
    '--font-body': '"Times New Roman", Times, serif', '--font-display': '"Times New Roman", Times, serif',
    '--radius': '0px', '--shadow': 'none', '--heading-case': 'none', '--heading-spacing': '0px', '--border-width': '3px',
  },
  2006: {
    '--bg': '#e9f1f8', '--surface': '#ffffff', '--text': '#222222', '--muted': '#5d6b78', '--accent': '#ff7a00',
    '--accent-text': '#ffffff', '--border': '#a9c4dd', '--link': '#0063dc',
    '--hero-bg': 'linear-gradient(180deg, #8fd3fe 0%, #3a8fd9 55%, #1f6fb8 100%)',
    '--font-body': 'Verdana, Geneva, sans-serif', '--font-display': '"Trebuchet MS", Verdana, sans-serif',
    '--radius': '10px', '--shadow': '0 2px 6px rgba(0,0,0,0.35)', '--heading-case': 'none',
    '--heading-spacing': '-0.5px', '--border-width': '1px',
  },
  2016: {
    '--bg': '#ffffff', '--surface': '#f4f5f7', '--text': '#212121', '--muted': '#757575', '--accent': '#2979ff',
    '--accent-text': '#ffffff', '--border': '#e0e0e0', '--link': '#2979ff', '--hero-bg': '#2979ff',
    '--font-body': '"Helvetica Neue", Helvetica, Arial, sans-serif', '--font-display': '"Helvetica Neue", Helvetica, sans-serif',
    '--radius': '4px', '--shadow': '0 1px 3px rgba(0,0,0,0.18)', '--heading-case': 'none',
    '--heading-spacing': '0px', '--border-width': '1px',
  },
  2026: {
    '--bg': '#0b0b10', '--surface': '#17171f', '--text': '#f2f2f7', '--muted': '#9a9aa8', '--accent': '#c6ff3d',
    '--accent-text': '#0b0b10', '--border': '#2a2a36', '--link': '#c6ff3d',
    '--hero-bg': 'radial-gradient(circle at 30% 20%, #6b5cff 0%, #0b0b10 65%)',
    '--font-body': '"Avenir Next", Avenir, system-ui, sans-serif', '--font-display': '"Avenir Next", Avenir, system-ui, sans-serif',
    '--radius': '24px', '--shadow': '0 20px 60px rgba(107,92,255,0.35)', '--heading-case': 'none',
    '--heading-spacing': '-1px', '--border-width': '1px',
  },
}

const ERA_TEXTS: Record<number, Record<string, string>> = {
  1996: {
    brand: 'ORBITWELL ONLINE', 'nav-1': 'Products', 'nav-2': 'About Us', 'nav-3': 'E-Mail Us!',
    'hero-title': 'Welcome to the Orbitwell Home Page!',
    'hero-sub': 'You are visitor #000451. This page is best viewed at 800x600 with a 28.8k modem.',
    cta: 'Click Here!', 'f1-title': 'Lights', 'f1-body': 'Our lamps plug right into the wall. Order by fax today.',
    'f2-title': 'Locks', 'f2-body': 'Heavy duty locks with TWO keys.', 'f3-title': 'Heating',
    'f3-body': 'A dial thermostat built to last.', ticker: '*** UNDER CONSTRUCTION *** Sign our Guestbook! ***',
    footer: '(c) 1996 Orbitwell. Webmaster: webmaster@orbitwell.example',
  },
  2006: {
    brand: 'orbitwell 2.0 beta', 'nav-1': 'Products', 'nav-2': 'Blog', 'nav-3': 'Community',
    'hero-title': 'Your Home. Connected.',
    'hero-sub': 'Join thousands of users sharing their Orbitwell setups. Now with RSS feeds and tags!',
    cta: 'Sign Up Free!', 'f1-title': 'iLight', 'f1-body': 'Control your lamps from your flip phone. Seriously.',
    'f2-title': 'LockBox', 'f2-body': 'Get an email every time your door opens. Share it on your profile!',
    'f3-title': 'ThermoSpace', 'f3-body': 'Customize your thermostat with over 50 skins.',
    ticker: 'NEW! Podcast episode 12 is up · Add us as a friend · Rate this page 5 stars',
    footer: '© 2006 Orbitwell Inc. | Privacy | Terms | Site Map',
  },
  2016: {
    brand: 'orbitwell', 'nav-1': 'Shop', 'nav-2': 'Story', 'nav-3': 'Help', 'hero-title': 'Home, simplified.',
    'hero-sub': 'Beautifully designed devices that work together. Set up in minutes from one app.',
    cta: 'Get started', 'f1-title': 'Lighting', 'f1-body': 'Scenes for every moment.', 'f2-title': 'Access',
    'f2-body': 'Keyless entry. Total peace of mind.', 'f3-title': 'Climate', 'f3-body': 'Smart comfort that pays for itself.',
    ticker: 'Free 2-day shipping · 30-day returns', footer: '© 2016 Orbitwell, Inc. Made with love in Brooklyn.',
  },
  2026: {
    brand: 'ORBITWELL', 'nav-1': 'Agents', 'nav-2': 'Trust', 'nav-3': 'Subscribe', 'hero-title': 'Your home, anticipated.',
    'hero-sub': "Orbitwell's AI predicts what you need before you need it. Opt out anytime*.",
    cta: 'Activate my home AI', 'f1-title': 'Predictive Light', 'f1-body': 'Mood-aware lighting powered by your biometric data.',
    'f2-title': 'Ambient Access', 'f2-body': 'Your face is your key. Your face is also our data.',
    'f3-title': 'Autonomous Climate', 'f3-body': "We set the temperature. You'll learn to like it.",
    ticker: 'Your home has 3 new recommendations · Terms updated', footer: '© 2026 Orbitwell. *Opting out may limit functionality.',
  },
}

const redact = (s: string) => s.split(' ').map((w, i) => (i % 4 === 2 ? '█'.repeat(Math.max(3, w.length)) : w)).join(' ')

function applyCountry(p: WebsiteParams, t: Record<string, string>) {
  const set = (k: string, f: (s: string) => string) => {
    if (k in t) t[k] = f(t[k])
  }
  switch (p.country) {
    case 'hyper-capitalist':
      set('cta', (s) => s.toUpperCase() + ' (LIMITED TIME)')
      set('hero-sub', (s) => s + ' Prices may surge based on demand.')
      set('ticker', (s) => 'SPONSORED · ' + s + ' · BUY 2 GET 1')
      set('footer', (s) => s + ' Ad-supported.')
      break
    case 'state-moderation':
      set('hero-title', (s) => '[APPROVED] ' + s)
      set('hero-sub', redact)
      set('f2-body', redact)
      set('ticker', () => 'NOTICE: ALL CONTENT REVIEWED BY THE MINISTRY OF INFORMATION')
      set('footer', (s) => s + ' Licensed by the State Content Bureau.')
      break
    case 'transparency':
      set('hero-sub', (s) => s + ' (This sentence was A/B tested on 40,000 people.)')
      set('ticker', () => 'LIVE: 1,204 cameras streaming · Your data is public, and so is ours')
      set('footer', (s) => s + ' All salaries published.')
      break
    case 'corporate-city':
      set('brand', (s) => s + ' CITY')
      set('nav-3', () => 'Citizenship')
      set('ticker', () => 'Orbitwell is your employer, your landlord and your government')
      set('footer', () => '© Orbitwell Municipal Corporation. Loyalty is mandatory.')
      break
    case 'post-collapse':
      set('hero-sub', (s) => s.toLowerCase())
      set('cta', () => 'Trade for batteries')
      set('ticker', () => 'Power available 2 hours/day · Barter accepted · Boil water notice')
      set('footer', () => 'Est. after the grid went down.')
      break
    case 'techno-optimist':
      set('hero-title', (s) => s.replace(/\.$/, '') + '. Forever.')
      set('ticker', () => 'Problems remaining: 0 · Progress is inevitable')
      set('footer', (s) => s + ' The future is already approved.')
      break
    case 'custom':
      set('ticker', () => `OPERATING UNDER THE ${p.countryText.toUpperCase()} MODEL`)
      set('footer', (s) => `${s} Compliant with ${p.countryText} standards.`)
      break
  }
}

// --- tiny color helpers for mood shifts ---
function hexToHsl(hex: string): [number, number, number] | null {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [hue * 60, s, l]
}
function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return '#' + [0, 8, 4].map((n) => Math.round(f(n) * 255).toString(16).padStart(2, '0')).join('')
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export function shiftMood(value: string, mood: number): string {
  if (mood === 2) return value
  return value.replace(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi, (hex) => {
    const hsl = hexToHsl(hex)
    if (!hsl) return hex
    let [h, s, l] = hsl
    if (mood === 0) { s *= 0.1; l = l * 0.85 + 0.03 }
    if (mood === 1) { h = h + (220 - h) * 0.35; s *= 0.55 }
    if (mood === 3) { h = h + (35 - h) * 0.15; s = clamp01(s * 1.15 + 0.05) }
    if (mood === 4) { h = (h + 25) % 360; s = clamp01(s * 1.5 + 0.15); l = clamp01(l + 0.04) }
    return hslToHex(h, clamp01(s), clamp01(l))
  })
}

export function mockWebsite(p: WebsiteParams, original: Record<string, string>) {
  const vars: Record<string, string> = {}
  for (const [k, v] of Object.entries(ERA_VARS[p.era])) vars[k] = shiftMood(v, p.mood)
  const texts: Record<string, string> = {}
  for (const k of Object.keys(original)) texts[k] = ERA_TEXTS[p.era][k] ?? original[k]
  applyCountry(p, texts)
  if (p.mood === 0 && 'footer' in texts) texts.footer += ' Nothing lasts.'
  if (p.mood === 4 && 'ticker' in texts) texts.ticker = '✦ ' + texts.ticker + ' ✦ ✦ ✦'
  return { vars, texts }
}
