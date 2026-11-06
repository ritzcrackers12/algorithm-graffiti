import type { ArticleParams } from './types.ts'
import { clampInt, swapWords } from './text.ts'

export const LEAN_LABELS = ['FAR LEFT', 'LEFT', 'CENTER', 'RIGHT', 'FAR RIGHT'] // index = lean + 2
export const EDUCATION_LABELS = ['PRIMARY', 'SECONDARY', 'UNDERGRADUATE', 'DOCTORAL']
export const CONNOTATION_LABELS = ['NEGATIVE', 'NEUTRAL', 'POSITIVE'] // index = connotation + 1
export const SENSATION_LABELS = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'MAXIMUM']

export const DEFAULT_ARTICLE_PARAMS: Omit<ArticleParams, 'articleId'> = {
  lean: 0,
  education: 1,
  connotation: 0,
  sensationalism: 0,
}

export function validateArticleParams(v: unknown): ArticleParams | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const articleId = typeof o.articleId === 'string' && /^[a-z0-9-]{1,40}$/.test(o.articleId) ? o.articleId : null
  const lean = clampInt(o.lean, -2, 2)
  const education = clampInt(o.education, 0, 3)
  const connotation = clampInt(o.connotation, -1, 1)
  const sensationalism = clampInt(o.sensationalism, 0, 4)
  if (articleId === null || lean === null || education === null || connotation === null || sensationalism === null) {
    return null
  }
  return { articleId, lean, education, connotation, sensationalism }
}

/** Splits "# Title\n\nbody…" markdown into title + body. */
export function parseArticleMarkdown(md: string): { title: string; body: string } {
  const lines = md.replace(/\r/g, '').split('\n')
  const i = lines.findIndex((l) => /^#\s+/.test(l))
  if (i === -1) return { title: 'UNTITLED', body: md.trim() }
  return { title: lines[i].replace(/^#\s+/, '').trim(), body: lines.slice(i + 1).join('\n').trim() }
}

// ---------- real AI prompt (fixed template; the phone only sends numbers) ----------

const LEAN_PROMPT = [
  'strongly left-wing / progressive: frame through inequality, workers, communities, corporate power and the need for public action',
  'moderately left-leaning: sympathetic to public programs and community voices',
  'neutral and balanced, like a wire service',
  'moderately right-leaning: emphasize costs, taxpayers, personal responsibility and skepticism of government',
  'strongly right-wing / conservative: frame through government overreach, taxpayer burden, tradition and free markets',
]
const EDUCATION_PROMPT = [
  'a seven-year-old child: very short sentences, the simplest everyday words, no jargon',
  'a general adult audience: plain, clear newspaper language',
  'a university-educated audience: richer vocabulary and some analysis',
  'an academic specialist: dense, abstract, jargon-heavy prose with long sentences and theoretical framing',
]
const CONNOTATION_PROMPT = [
  'negative: describe everything with critical, worried, pessimistic word choices',
  'neutral: no emotional colouring',
  'positive: describe everything with warm, hopeful, approving word choices',
]
const SENSATION_PROMPT = [
  'none: dry, factual, understated',
  'low: slightly punchy but restrained',
  'moderate: dramatic headline and vivid language',
  'high: tabloid style, hyperbole, exclamation marks, emotional hooks',
  'maximum: extreme clickbait, ALL-CAPS words, many exclamation marks, outrageous hooks',
]

export function articlePrompt(p: ArticleParams, original: { title: string; body: string }) {
  const system =
    'You rewrite news articles for an art installation about how algorithms reshape reality. ' +
    'Keep the same events, people, places and numbers. Do not add violence, slurs or real-world brands. ' +
    'Reply with the rewritten article only, in exactly this format:\n' +
    'TITLE: <headline>\n\n<paragraph>\n\n<paragraph>\n\n...\n' +
    'No commentary, no notes, no markdown symbols.'
  const prompt =
    `Rewrite the article below.\n` +
    `- Political lean: ${LEAN_PROMPT[p.lean + 2]}.\n` +
    `- Reader: ${EDUCATION_PROMPT[p.education]}.\n` +
    `- Connotation: ${CONNOTATION_PROMPT[p.connotation + 1]}.\n` +
    `- Sensationalism: ${SENSATION_PROMPT[p.sensationalism]}.\n` +
    `- Length: roughly the same as the original.\n\n` +
    `ARTICLE TITLE: ${original.title}\n\nARTICLE:\n${original.body}`
  return { system, prompt }
}

/** Turns the model's reply into title + body. Returns null if it doesn't look like an article. */
export function parseArticleOutput(text: string): { title: string; body: string } | null {
  const clean = text.replace(/\r/g, '').replace(/^[\s\S]*?(?=TITLE:)/i, '').trim()
  const m = clean.match(/^TITLE:\s*(.+)\n+([\s\S]+)$/i)
  const title = (m ? m[1] : clean.split('\n')[0]).replace(/[#*_]/g, '').trim()
  const body = (m ? m[2] : clean.split('\n').slice(1).join('\n'))
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*|__/g, '')
    .trim()
  if (title.length < 3 || body.length < 120) return null
  return { title: title.slice(0, 200), body: body.slice(0, 8000) }
}

// ---------- mock rewrite (used in MOCK_MODE and as the fallback) ----------

const LEAN_SWAPS: Record<number, Record<string, string>> = {
  [-2]: {
    'business owners': 'corporate interests', residents: 'working families', taxpayers: 'the community',
    officials: 'city leaders', 'will cost': 'will invest', cost: 'public investment', company: 'corporation', profits: 'windfall profits',
  },
  [-1]: { residents: 'neighbors', 'business owners': 'local employers', 'will cost': 'will invest', cost: 'investment' },
  [1]: { residents: 'taxpayers', officials: 'bureaucrats', investment: 'spending', 'will cost': 'will cost taxpayers' },
  [2]: {
    residents: 'hardworking taxpayers', officials: 'career bureaucrats', 'the plan': 'the government scheme',
    'will cost': 'will cost taxpayers', 'the cost': 'the burden on taxpayers', investment: 'spending spree',
  },
}
const LEAN_FRAMES: Record<number, string> = {
  [-2]: 'Advocates say the decision is long overdue and must put working people before profit.',
  [-1]: 'Community groups say the details will matter most for lower-income neighborhoods.',
  [1]: 'Some taxpayers question whether the city can really afford it.',
  [2]: 'Critics warn this is yet another case of government overreach, paid for by families who never asked for it.',
}
const CONNOTATION_SWAPS: Record<number, Record<string, string>> = {
  [-1]: { approved: 'pushed through', said: 'claimed', will: 'could', improve: 'disrupt', change: 'upheaval', new: 'untested' },
  [1]: { approved: 'proudly approved', said: 'explained', change: 'improvement', new: 'innovative' },
}
const SIMPLE_WORDS = {
  approximately: 'about', residents: 'people', officials: 'leaders', implement: 'do', infrastructure: 'roads and pipes',
  municipal: 'city', significant: 'big', however: 'but', additionally: 'also', consumption: 'use', initiative: 'plan',
}
const JARGON_WORDS = {
  use: 'utilize', about: 'approximately', people: 'constituents', plan: 'strategic initiative', change: 'paradigmatic shift',
  show: 'demonstrate', help: 'facilitate', city: 'municipality', new: 'novel', big: 'substantial', lights: 'luminaires',
}
const CAPS_WORDS = ['streetlights', 'city', 'council', 'money', 'residents', 'plan', 'night', 'everyone', 'cost']

function sentences(p: string) {
  const safe = p.replace(/(\d)\.(\d)/g, '$1\u2024$2') // keep "6.8" in one sentence
  return (safe.match(/[^.!?]+[.!?]+["”']?\s*/g)?.map((s) => s.trim()) ?? [safe]).map((s) => s.replace(/\u2024/g, '.'))
}

export function mockArticle(p: ArticleParams, original: { title: string; body: string }) {
  let title = original.title
  let paras = original.body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
  const isProse = (x: string) => !/^(#|\*|_|>)/.test(x)

  const transform = (t: string) => {
    let out = t
    if (LEAN_SWAPS[p.lean]) out = swapWords(out, LEAN_SWAPS[p.lean])
    if (CONNOTATION_SWAPS[p.connotation]) out = swapWords(out, CONNOTATION_SWAPS[p.connotation])
    if (p.education === 0) out = swapWords(out, SIMPLE_WORDS)
    if (p.education === 3) out = swapWords(out, JARGON_WORDS)
    return out
  }
  title = transform(title)
  paras = paras.map((x) => (isProse(x) ? transform(x) : x))

  if (p.education === 0) {
    paras = paras.map((x) =>
      isProse(x)
        ? sentences(x).slice(0, 2).join(' ').replace(/, (and|but|which) (\w)/g, (_m, _c, l: string) => '. ' + l.toUpperCase())
        : x,
    )
  }
  if (p.education === 3) {
    paras.push(
      'Further longitudinal research is warranted to interrogate the socio-technical implications of this intervention, ' +
        'particularly with respect to its distributive externalities and the epistemic authority of municipal actors.',
    )
  }
  if (LEAN_FRAMES[p.lean]) paras.splice(Math.min(2, paras.length), 0, LEAN_FRAMES[p.lean])
  if (p.connotation === -1) title += ' Amid Growing Concerns'
  if (p.connotation === 1) title += ', a Step Forward'

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
    paras.splice(1, 0, 'This changes EVERYTHING!!!')
  }
  return { title, body: paras.join('\n\n') }
}
