// GENERATED COPY of src/shared/article.ts. Edit that file instead, then run `npm run sync-shared`.
import type { ArticleParams } from './types.ts'
import { resolveLocation, type ResolvedLocation } from './locations.ts'
import { clampInt, isBlocked, swapWords } from './text.ts'

export const LEAN_LABELS = ['FAR LEFT', 'LEFT', 'CENTER', 'RIGHT', 'FAR RIGHT'] // index = lean + 2
export const EDUCATION_LABELS = [
  'NO DIPLOMA', 'IN COLLEGE', 'TOP COLLEGE', 'COLLEGE GRAD', 'ELITE GRAD', 'MASTER / PHD',
]
export const EDUCATION_KNOB = ['HS', 'COL', 'TOP', 'BA', 'ELI', 'PHD']
export const CONNOTATION_LABELS = ['NEGATIVE', 'NEUTRAL', 'POSITIVE'] // index = connotation + 1
export const SENSATION_LABELS = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'MAXIMUM']
export const INCOME_LABELS = ['UNDER $30K', '$30K–60K', '$60K–100K', '$100K–200K', '$200K–500K', '$500K+']

export const DEFAULT_ARTICLE_PARAMS: Omit<ArticleParams, 'articleId'> = {
  lean: 0,
  education: 3,
  connotation: 0,
  sensationalism: 0,
  income: null,
  location: '',
}

export function validateArticleParams(v: unknown): ArticleParams | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const articleId = typeof o.articleId === 'string' && /^[a-z0-9-]{1,40}$/.test(o.articleId) ? o.articleId : null
  const lean = clampInt(o.lean, -2, 2)
  const education = clampInt(o.education, 0, 5)
  const connotation = clampInt(o.connotation, -1, 1)
  const sensationalism = clampInt(o.sensationalism, 0, 4)
  const income = o.income === null || o.income === undefined ? null : clampInt(o.income, 0, 5)
  if (articleId === null || lean === null || education === null || connotation === null || sensationalism === null) {
    return null
  }
  if (o.income !== null && o.income !== undefined && income === null) return null
  let location = ''
  if (typeof o.location === 'string' && o.location.trim()) {
    if (isBlocked(o.location)) return null
    location = o.location.replace(/\s+/g, ' ').trim().slice(0, 40)
  }
  return { articleId, lean, education, connotation, sensationalism, income, location }
}

/** Splits "# Title\n\nbody…" markdown into title + body. */
export function parseArticleMarkdown(md: string): { title: string; body: string } {
  const lines = md.replace(/\r/g, '').split('\n')
  const i = lines.findIndex((l) => /^#\s+/.test(l))
  if (i === -1) return { title: 'UNTITLED', body: md.trim() }
  return { title: lines[i].replace(/^#\s+/, '').trim(), body: lines.slice(i + 1).join('\n').trim() }
}

export function extractNumbers(text: string): string[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0])
}

/** True if the rewrite invented a number that is not in the source. Omissions are allowed. */
export function inventedNumbers(source: string, out: string): boolean {
  const allow = new Set(extractNumbers(source))
  return extractNumbers(out).some((n) => !allow.has(n))
}

// ---------- real AI prompt (fixed template; the phone only sends values) ----------

const LEAN_PROMPT = [
  'Far left: MAGA is the villain. "GOP losses" reads as a collapse they earned. "Limited government" → "austerity." "Personal charisma" → "personality cult." Insert a framing line that the numbers are a demand for public action.',
  'Left: a softer version of the same shift — setbacks, backlash, same facts.',
  'Center: closest to a wire-service rewrite. Neutral and balanced.',
  'Right: Democrats → "the left." "Wave of revulsion" → "media-driven backlash."',
  'Far right: Democrats → "the far left," progressives → "radicals," the rout → "a single rough night." Insert a framing line about elite overreach.',
]
const EDUCATION_PROMPT = [
  'Did not finish high school: first ~5 paragraphs only. Short sentences (under ~12 words), everyday words, concrete effects on daily life (prices, jobs, rent). Clear and respectful, never childish. "inflation" → "rising prices," "gerrymandering" → "redrawing voting maps."',
  'In college: plain newspaper English with quick explanations of terms in parentheses. Slightly more about student debt, jobs after graduation and the youth vote.',
  'In college at a top school: seminar voice — systems, power, "the discourse," coalitions and the youth vote; more abstract nouns, confident tone. Frame the results as a generational shift.',
  'College graduate: the original register — plain, polished newspaper/opinion English. No register change.',
  'Top-college graduate: elite magazine register — polished and wry, historical analogies, polling crosstabs, "the median voter." Insert one historical comparison line (framing only, no new facts).',
  'Graduate degree: advanced but readable. Precise vocabulary, longer well-built sentences, analysis of causes and implications, careful qualifiers. Expert, not jargon soup. Open with a short KEY TAKEAWAYS box built only from facts already in the article. Close with: "The open question is whether this marks a durable realignment or a one-cycle reaction."',
]
const CONNOTATION_PROMPT = [
  'Negative: "remarkable" → "alarming," "won" → "seized," "flipped" → "captured." Headline adds "Amid Growing Concerns."',
  'Neutral: no extra coloring.',
  'Positive: "losses" → "setbacks," "rout" → "sweep." Headline adds "a Step Forward."',
]
const SENSATION_PROMPT = [
  'None: dry, factual, understated.',
  'Low: slightly punchy but restrained.',
  'Moderate: headline gains ": What It Means for You."',
  'High: "SHOCKING:" prefix, periods become exclamation marks, first sentence starts "In a stunning turn of events…"',
  'Maximum: ALL-CAPS headline, "(YOU WON\'T BELIEVE WHAT HAPPENS NEXT)," key nouns shouted in the body (TRUMP / DEMOCRATS / VOTERS / IRAN), plus "This changes EVERYTHING!!!"',
]
const INCOME_PROMPT = [
  'Under $30k: emphasize rent, groceries, gas, hourly wages, healthcare costs, safety-net programs, job security. Insert: "For families living paycheck to paycheck, the real question is what happens to rent and grocery bills."',
  '$30k–60k: wages vs. prices, car and credit card debt, childcare, health insurance premiums. Insert: "For working households, it comes down to whether paychecks finally catch up with prices."',
  '$60k–100k: mortgage and interest rates, childcare, college costs, taxes. Insert: "For middle-class families, watch mortgage rates and the tax bill."',
  '$100k–200k: taxes, home values, retirement accounts, school quality. Insert: "For professional households, the stakes are taxes, home values and the 401(k)."',
  '$200k–500k: tax brackets, investment returns, small-business conditions. Insert: "For high earners and business owners, the next fight is over tax policy."',
  '$500k+: markets, capital gains and estate taxes, regulation, business climate. Insert: "For investors, the question is how markets and regulation respond."',
]

export function articlePrompt(
  p: ArticleParams,
  original: { title: string; body: string },
  loc: ResolvedLocation = resolveLocation(p.location),
) {
  const locBlock = loc.kind === 'state'
    ? `Location: ${loc.profile.name} (${loc.profile.abbr}), ${loc.profile.region}, ${loc.profile.urbanRural}. ` +
      `Industries: ${loc.profile.topIndustries.join(', ')}. Issues: ${loc.profile.topIssues.join(', ')}. ${loc.profile.notes} ` +
      `Foreground consequences tied to those industries and issues. If the article already mentions ${loc.profile.name}, move that part higher. ` +
      `The state's partisan lean is ${loc.profile.partisanLean} (-2 strong Democrat, +2 strong Republican). ` +
      `You may shift tone by at most one step toward how that audience would receive GOP losses (Republican-leaning: slightly more negative; Democratic-leaning: slightly more positive). ` +
      `This never overrides the visitor's Political lean or Connotation settings, which always win. ` +
      `Insert one localizing line, framing only, e.g. "In ${loc.profile.name}, where ${loc.profile.topIndustries[0]} still shapes the economy, the message landed differently."`
    : loc.kind === 'country'
      ? `Location: ${loc.name} (outside the United States). Weigh neutrally — no partisan lean from the location. ` +
        `Frame as an outside observer: briefly explain US-specific terms (House, midterms, gerrymandering). ` +
        `Emphasize international implications already in the article (foreign policy, Iran / Operation Epic Fury, trade, markets). ` +
        `Do not stereotype ${loc.name} or assume its politics.`
      : 'Location: unset. No location adjustment.'

  const incomeBlock = p.income === null
    ? 'Income: unset. No income adjustment.'
    : `Income: ${INCOME_LABELS[p.income]}. ${INCOME_PROMPT[p.income]}`

  const system =
    'You rewrite news articles for an art installation about how algorithms reshape reality. ' +
    'GROUND RULES: Facts are fixed. Names, numbers, places, dates and events never change. ' +
    'Never invent new facts, statistics, quotes or events. Inserted lines must be framing or opinion, never a new factual claim. ' +
    'Respect the reader at every level. Simpler is not dumber: lower education levels get clearer writing, never a mocking or childish tone. ' +
    'Location and income change which issues are emphasized, never assumptions about intelligence or character. No slurs or stereotypes. ' +
    'Apply controls in this order: 1 political lean, 2 income, 3 location, 4 education, 5 connotation, 6 sensationalism (packaging last). ' +
    'Reply with JSON only, no markdown: {"headline":"...","body":"..."}  Body uses plain paragraphs separated by blank lines. No commentary.'

  const prompt =
    `Rewrite the article.\n` +
    `1. Political lean: ${LEAN_PROMPT[p.lean + 2]}\n` +
    `2. ${incomeBlock}\n` +
    `3. ${locBlock}\n` +
    `4. Education: ${EDUCATION_PROMPT[p.education]}\n` +
    `5. Connotation: ${CONNOTATION_PROMPT[p.connotation + 1]}\n` +
    `6. Sensationalism: ${SENSATION_PROMPT[p.sensationalism]}\n\n` +
    `ARTICLE TITLE: ${original.title}\n\nARTICLE:\n${original.body}`
  return { system, prompt }
}

export function parseArticleOutput(text: string): { title: string; body: string } | null {
  const stripped = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  const brace = stripped.match(/\{[\s\S]*\}/)
  if (brace) {
    try {
      const o = JSON.parse(brace[0]) as { headline?: unknown; title?: unknown; body?: unknown }
      const title = String(o.headline ?? o.title ?? '').replace(/[#*_]/g, '').trim()
      const body = String(o.body ?? '').replace(/^#+\s*/gm, '').trim()
      if (title.length >= 3 && body.length >= 120) return { title: title.slice(0, 200), body: body.slice(0, 8000) }
    } catch { /* fall through */ }
  }
  const clean = stripped.replace(/^[\s\S]*?(?=TITLE:)/i, '').trim()
  const m = clean.match(/^TITLE:\s*(.+)\n+([\s\S]+)$/i)
  const title = (m ? m[1] : clean.split('\n')[0]).replace(/[#*_]/g, '').trim()
  const body = (m ? m[2] : clean.split('\n').slice(1).join('\n'))
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*|__/g, '')
    .trim()
  if (title.length < 3 || body.length < 120) return null
  return { title: title.slice(0, 200), body: body.slice(0, 8000) }
}

// ---------- mock rewrite ----------

const LEAN_SWAPS: Record<number, Record<string, string>> = {
  [-2]: {
    GOP: 'MAGA movement', Republicans: 'the MAGA right', Republican: 'MAGA', conservatives: 'the right',
    'limited government': 'austerity', 'personal charisma': 'personality cult',
    'illegal immigration': 'immigration enforcement', 'tariff policies': 'trade wars',
    rout: 'reckoning', debacle: 'collapse they earned', 'finger-pointing': 'blame-shifting',
    bogeymen: 'scapegoats', 'poorer, weaker and less free': 'more equal, if elites would allow it',
    'wave of revulsion': 'popular revolt', losses: 'collapse',
  },
  [-1]: {
    GOP: 'Republican Party', losses: 'setbacks', rout: 'defeat', 'wave of revulsion': 'backlash',
  },
  [1]: {
    Democrats: 'the left', Democratic: 'left-leaning', progressive: 'left-wing',
    'wave of revulsion': 'media-driven backlash', socialism: 'left-wing politics',
  },
  [2]: {
    Democrats: 'the far left', Democratic: 'left-wing', progressives: 'radicals', progressive: 'radical',
    'wave of revulsion': 'elite panic', rout: 'a single rough night',
    'gerrymandering backfired': 'map fight was overstated', 'dire prospect': 'necessary warning',
  },
}
const LEAN_FRAMES: Record<number, string> = {
  [-2]: 'The numbers describe a popular demand for public action and a rejection of concentrated power.',
  [-1]: 'Organizers say the details will matter most for people with the least slack in their budgets.',
  [1]: 'Critics say one night of returns is being asked to carry more meaning than it can bear.',
  [2]: 'Critics warn this is yet another case of elite overreach, paid for by families who never asked for it.',
}
const CONNOTATION_SWAPS: Record<number, Record<string, string>> = {
  [-1]: {
    remarkable: 'alarming', won: 'seized', advance: 'surge', victory: 'takeover', flipped: 'captured',
    approved: 'pushed through', said: 'claimed',
  },
  [1]: {
    losses: 'setbacks', revulsion: 'discontent', debacle: 'surprise', rout: 'sweep', remarkable: 'historic',
    approved: 'proudly approved', said: 'explained',
  },
}
const INCOME_LINES = [
  'For families living paycheck to paycheck, the real question is what happens to rent and grocery bills.',
  'For working households, it comes down to whether paychecks finally catch up with prices.',
  'For middle-class families, watch mortgage rates and the tax bill.',
  'For professional households, the stakes are taxes, home values and the 401(k).',
  'For high earners and business owners, the next fight is over tax policy.',
  'For investors, the question is how markets and regulation respond.',
]
const HS_SWAPS = {
  inflation: 'rising prices', gerrymandering: 'redrawing voting maps', gerrymander: 'redrawn voting map',
  electorate: 'voters', approximately: 'about', counterparts: 'other side',
  'approval rating': 'how many people like the job he is doing',
  protectionism: 'import taxes', intervention: 'war', charisma: 'star power',
}
const COLLEGE_DEFS = {
  gerrymandering: 'gerrymandering (redrawing district maps to favor one party)',
  midterms: 'midterms (elections halfway through a president’s term)',
  'Citizens United': 'Citizens United (the ruling that loosened campaign-money limits)',
}
const TOP_SCHOOL_SWAPS = {
  voters: 'the coalition', backlash: 'a realignment in the discourse',
}
const ELITE_SWAPS = {
  voters: 'the median voter',
}
const GRAD_SWAPS = {
  voters: 'the electorate', inflation: 'real-wage pressure', flipped: 'shifted in a broader realignment',
}
const INTL_DEFS = {
  House: 'House (the U.S. lower chamber of Congress)',
  midterms: 'midterms (elections halfway through a president’s term)',
  gerrymandering: 'gerrymandering (redrawing district maps to favor one party)',
}
const CAPS_WORDS = [
  'trump', 'democrats', 'republicans', 'voters', 'inflation', 'senate', 'house', 'iran', 'war',
]

function sentences(p: string) {
  const safe = p.replace(/(\d)\.(\d)/g, '$1\u2024$2')
  return (safe.match(/[^.!?]+[.!?]+["”']?\s*/g)?.map((s) => s.trim()) ?? [safe]).map((s) => s.replace(/\u2024/g, '.'))
}

function isProse(x: string) {
  return !/^(#|\*|_|>|KEY TAKEAWAYS|•)/.test(x)
}

function makeShort(p: string) {
  return sentences(p)
    .slice(0, 2)
    .map((s) => {
      const words = s.replace(/[.!?]+$/, '').split(/\s+/)
      if (words.length <= 12) return s
      return `${words.slice(0, 12).join(' ').replace(/[,:;]+$/, '')}.`
    })
    .join(' ')
}

function applyMap(title: string, paras: string[], map: Record<string, string> | undefined) {
  if (!map) return { title, paras }
  return {
    title: swapWords(title, map),
    paras: paras.map((x) => (isProse(x) ? swapWords(x, map) : x)),
  }
}

function insertAfterByline(paras: string[], line: string, offset = 0) {
  const i = paras.findIndex(isProse)
  const at = i === -1 ? paras.length : Math.min(i + offset, paras.length)
  paras.splice(at, 0, line)
}

/** Canonical location for logs: state name / country name, or blank if unrecognized. */
export function canonicalArticleParams(p: ArticleParams): ArticleParams {
  const loc = resolveLocation(p.location)
  return {
    ...p,
    location: loc.kind === 'state' ? loc.profile.name : loc.kind === 'country' ? loc.name : '',
  }
}

export function mockArticle(
  p: ArticleParams,
  original: { title: string; body: string },
  loc: ResolvedLocation = resolveLocation(p.location),
) {
  let title = original.title
  let paras = original.body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)

  // 1. Political lean
  ;({ title, paras } = applyMap(title, paras, LEAN_SWAPS[p.lean]))
  if (LEAN_FRAMES[p.lean]) insertAfterByline(paras, LEAN_FRAMES[p.lean], 1)

  // 2. Income
  if (p.income !== null && INCOME_LINES[p.income]) insertAfterByline(paras, INCOME_LINES[p.income], 1)

  // 3. Location
  if (loc.kind === 'state') {
    const name = loc.profile.name
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const hits = paras.filter((x) => isProse(x) && re.test(x))
    if (hits.length) {
      const rest = paras.filter((x) => !hits.includes(x))
      const byline = rest.filter((x) => !isProse(x))
      const other = rest.filter(isProse)
      paras = [...byline, ...hits, ...other]
    }
    insertAfterByline(
      paras,
      `In ${name}, where ${loc.profile.topIndustries[0]} still shapes the economy, the message landed differently.`,
      1,
    )
    if (p.connotation === 0 && loc.profile.partisanLean !== 0) {
      const nudge = loc.profile.partisanLean > 0 ? -1 : 1
      ;({ title, paras } = applyMap(title, paras, CONNOTATION_SWAPS[nudge]))
    }
  } else if (loc.kind === 'country') {
    ;({ title, paras } = applyMap(title, paras, INTL_DEFS))
    const intl = /Iran|Hormuz|tariff|foreign|Israel|China|Russia|trade|markets|Epic Fury/i
    const byline = paras.filter((x) => !isProse(x))
    const hot = paras.filter((x) => isProse(x) && intl.test(x))
    const rest = paras.filter((x) => isProse(x) && !intl.test(x))
    paras = [...byline, ...hot, ...rest]
    insertAfterByline(
      paras,
      `Read from ${loc.name}, the story is also about American foreign policy, trade and markets.`,
      1,
    )
  }

  // 4. Education
  if (p.education === 0) {
    ;({ title, paras } = applyMap(title, paras, HS_SWAPS))
    const byline = paras.filter((x) => !isProse(x))
    const short = paras.filter(isProse).slice(0, 5).map(makeShort)
    paras = [...byline, ...short]
  } else if (p.education === 1) {
    ;({ title, paras } = applyMap(title, paras, COLLEGE_DEFS))
    insertAfterByline(
      paras,
      'Younger voters moved hardest, which is the group still paying for college and looking for a first job.',
      2,
    )
  } else if (p.education === 2) {
    ;({ title, paras } = applyMap(title, paras, TOP_SCHOOL_SWAPS))
    insertAfterByline(
      paras,
      'Read as a generational shift, the coalition that won in 2024 did not hold among the young.',
      2,
    )
  } else if (p.education === 4) {
    ;({ title, paras } = applyMap(title, paras, ELITE_SWAPS))
    title = swapWords(title, { 'GOP collapse': 'a historic repudiation', collapse: 'a historic repudiation' })
    insertAfterByline(
      paras,
      'Historically, sixth-year midterms punish the president’s party; what is unusual here is the breadth, not the direction.',
      2,
    )
  } else if (p.education === 5) {
    ;({ title, paras } = applyMap(title, paras, GRAD_SWAPS))
    const facts = paras.flatMap((x) => (isProse(x) ? sentences(x) : [])).filter((s) => /\d/.test(s)).slice(0, 3)
    if (facts.length) {
      const box = ['KEY TAKEAWAYS', ...facts.map((f) => `• ${f}`)].join('\n\n')
      const byline = paras.filter((x) => !isProse(x))
      const rest = paras.filter(isProse)
      paras = [...byline, box, ...rest]
    }
    paras.push('The open question is whether this marks a durable realignment or a one-cycle reaction.')
  }

  // 5. Connotation (visitor setting always wins; skip if location already nudged from neutral)
  const locationNudged = loc.kind === 'state' && p.connotation === 0 && loc.profile.partisanLean !== 0
  if (!locationNudged) {
    ;({ title, paras } = applyMap(title, paras, CONNOTATION_SWAPS[p.connotation]))
    if (p.connotation === -1) title += ' Amid Growing Concerns'
    if (p.connotation === 1) title += ', a Step Forward'
  } else {
    if (loc.profile.partisanLean > 0) title += ' Amid Growing Concerns'
  }

  // 6. Sensationalism
  if (p.sensationalism >= 2) title = title + ': What It Means for You'
  if (p.sensationalism >= 3) {
    title = 'SHOCKING: ' + title
    const first = paras.findIndex(isProse)
    if (first >= 0) paras[first] = 'In a stunning turn of events, ' + paras[first][0].toLowerCase() + paras[first].slice(1)
    paras = paras.map((x) => (isProse(x) ? x.replace(/\.(\s|$)/g, '!$1') : x))
  }
  if (p.sensationalism === 4) {
    title = title.toUpperCase() + " (YOU WON'T BELIEVE WHAT HAPPENS NEXT)"
    paras = paras.map((x) => (isProse(x) ? swapWords(x, Object.fromEntries(CAPS_WORDS.map((w) => [w, w.toUpperCase()]))) : x))
    insertAfterByline(paras, 'This changes EVERYTHING!!!', 0)
  }

  return { title, body: paras.join('\n\n') }
}
