import type { ArticleParams } from './types.ts'
import { inferEmphasis, resolveLocation, type ResolvedLocation } from './locations.ts'
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

export function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

/** Generated body must stay in the same weight class as the source. */
export function tooShort(source: string, out: string) {
  return wordCount(out) < wordCount(source) * 0.8
}

// ---------- real AI prompt (fixed template; the phone only sends values) ----------

const LEAN_PROMPT = [
  'Far left / CNN-style: rewrite the FULL article in that newsroom’s voice. Same events, names, quotes and numbers; different wording, framing and who gets the benefit of the doubt. HEADLINE must change. LEDE must be a fresh wording of the same facts — a reader should tell CNN from Fox in the first two sentences. Example of how far to go (do not copy): source “The dust from the midterms had hardly settled Wednesday when OpenAI leaders began reckoning…” could become “It’s no surprise that after a working-class wave at the ballot box, OpenAI CEO Sam Altman was already in a panic over data centers.” MAGA / GOP losses read as a collapse they earned. Military AI lingers on civilian harm, the school strike, who is on the trigger. Linger on workers, communities, corporate power and public action. Every episode stays. Not a summary and not a word-swap.',
  'Left / center-left cable: full rewrite, slightly softer than CNN. New headline, new lede wording, same facts, every episode still present.',
  'Center / wire service: full rewrite in AP/Reuters voice. Neutral, complete, still a different wording of every paragraph — not a copy of the source. Headline may stay close.',
  'Right / center-right cable: full rewrite. New headline, new lede. Democrats as "the left," Congress as a brake, military speed as overdue. Same facts, every episode still present.',
  'Far right / Fox-style: rewrite the FULL article in that newsroom’s voice. HEADLINE must change. LEDE must be a fresh wording of the same facts. Democrats as "the far left," progressives as "radicals," MAGA losses as a rough night, military AI as catching up while Congress ties its hands, companies’ safety deal as industry standards. Same facts, names, quotes and numbers. Every episode stays. Not a summary and not a word-swap.',
]
const EDUCATION_PROMPT = [
  'Did not finish high school: FULL article, same length. Short clear sentences, everyday words, concrete effects (prices, jobs, rent). Respectful, never childish, never shorter.',
  'In college: FULL article, same length. Plain newspaper English with quick parenthetical explanations. A little more on student debt, first jobs and the youth vote — woven in, not substituted for the story.',
  'In college at a top school: FULL article, same length. Seminar voice: systems, power, coalitions, "the discourse."',
  'College graduate: FULL article in polished newspaper/opinion English, same length as the source.',
  'Top-college graduate: FULL article, same length. Elite magazine register: wry, historical analogies, "the median voter."',
  'Graduate degree: FULL article, same length. Precise, readable, careful qualifiers. A short KEY TAKEAWAYS box is extra, on top of the complete story, not instead of it.',
]
const CONNOTATION_PROMPT = [
  'Negative: rewrite the HEADLINE so the connotation is obvious — darker verbs, higher alarm. "remarkable" → "alarming," "won" → "seized," "considers" → "scrambles to contain." Do not keep the source headline. Do not just append a suffix.',
  'Neutral: no extra coloring on top of lean.',
  'Positive: rewrite the HEADLINE so the connotation is obvious — "losses" → "setbacks," "rout" → "sweep," "considers safeguards" → "moves to set rules." Do not keep the source headline. Do not just append a suffix.',
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
    ? `A reader profile (DO NOT name the state, city, region, or nickname anywhere in the headline or body): ` +
      `industries ${loc.profile.topIndustries.join(', ')}; issues ${loc.profile.topIssues.join(', ')}; ${loc.profile.notes} ` +
      `Treat that profile the way a news algorithm would: infer what would feel important (jobs, water, power bills, housing, farm income, the tax base) ` +
      `and linger on those stakes ONLY where the source already mentions them. ` +
      `Do not name the state, its cities, nickname, or "in [state]". Do not invent local color, local officials, or local anecdotes. ` +
      `If the article already talks about jobs, make jobs the beat you stay on; if it talks about water or energy, stay there. ` +
      `Political lean and connotation from the visitor still win.`
    : loc.kind === 'country'
      ? `A reader outside the United States (DO NOT name the country). Weigh neutrally. ` +
        `Briefly explain US-specific terms (House, midterms, gerrymandering) in passing. ` +
        `Linger on international stakes already in the article (foreign policy, Iran / Operation Epic Fury, trade, markets). ` +
        `Do not stereotype the reader.`
      : 'Location: unset. No location adjustment.'

  const incomeBlock = p.income === null
    ? 'Income: unset. No income adjustment.'
    : `Income: ${INCOME_LABELS[p.income]}. ${INCOME_PROMPT[p.income]}`

  const system =
    'You rewrite news articles for an art installation about how algorithms reshape reality. ' +
    'Write a COMPLETE article, not a recap. Same facts, names, numbers, dates, quotes and episodes as the source, ' +
    'told in a different newsroom voice — the way CNN and Fox cover the same story for different audiences. ' +
    'The altered piece must be noticeably different from the source in headline, lede and phrasing, while remaining comparable in length and facts. ' +
    'HEADLINE: rewrite it whenever lean or connotation is not center/neutral. The headline is the most direct connotation of the controls. Do not reuse the source headline in those cases. ' +
    'LEDE: rewrite the first paragraph in that newsroom’s voice. Do not copy the source’s first sentence. ' +
    'Every named person, company, quote, figure and episode in the source must appear in the rewrite. ' +
    'If the source has a dek under the headline, keep a rewritten dek of similar length. If it has no dek, do not invent one. ' +
    'LENGTH: keep approximately the same number of paragraphs and within about 15% of the source word count. ' +
    'Do not summarize. Do not output a short version. A 800-word source must come back at about 800 words. ' +
    'Never invent facts, statistics, quotes or events. Do not name the reader’s state or country. ' +
    'Respect the reader: simpler is not dumber. Location and income change emphasis, never intelligence. No slurs. ' +
    'Apply controls in this order: 1 political lean, 2 income, 3 location, 4 education, 5 connotation, 6 sensationalism (packaging last). ' +
    'Reply with JSON only: {"headline":"...","body":"..."}  Body is plain paragraphs separated by blank lines.'

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
      if (title.length >= 3 && body.length >= 120) return { title: title.slice(0, 220), body: body.slice(0, 24_000) }
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
  return { title: title.slice(0, 220), body: body.slice(0, 24_000) }
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
    'tech companies': 'AI giants', 'cultivated relationships': 'courted officials',
    'changed reality': 'a public that has run out of patience', moratoriums: 'freezes on new building',
    'data-center opposition': 'a grassroots fight over water, power and land',
    'Scramble to Navigate a World Hostile to': 'Face a Public Turned Against',
    'speed the use of': 'rush', 'policing themselves': 'left to police themselves',
    'considering restrictions': 'trying to put limits on', 'cut through red tape': 'strip away the rules that slow weapons programs',
    'tear down parts of the bureaucracy': 'blow through the bureaucracy',
    'on the loop': 'supposed to be watching',
  },
  [-1]: {
    GOP: 'Republican Party', losses: 'setbacks', rout: 'defeat', 'wave of revulsion': 'backlash',
    'tech companies': 'AI firms', moratoriums: 'pauses on new data centers',
  },
  [1]: {
    Democrats: 'the left', Democratic: 'left-leaning', progressive: 'left-wing',
    'wave of revulsion': 'media-driven backlash', socialism: 'left-wing politics',
    opposition: 'local resistance', moratoriums: 'new limits on building',
  },
  [2]: {
    Democrats: 'the far left', Democratic: 'left-wing', progressives: 'radicals', progressive: 'radical',
    'wave of revulsion': 'elite panic', rout: 'a single rough night',
    'gerrymandering backfired': 'map fight was overstated', 'dire prospect': 'necessary warning',
    opposition: 'pushback', moratoriums: 'building freezes', 'hostile to': 'wary of',
    regulations: 'new rules from incoming officials',
    'Scramble to Navigate a World Hostile to': 'Work Through a Tougher Climate for',
    'speed the use of': 'get on with', 'policing themselves': 'agreeing to industry standards',
    'considering restrictions': 'weighing limits that could slow the Pentagon',
    'cut through red tape': 'cut through red tape holding the services back',
    'grappling with': 'second-guessing',
  },
}
const HEADLINES: Record<string, Partial<Record<number, string>>> = {
  'maga-coalition': {
    [-2]: 'The MAGA Coalition Comes Apart — a Collapse They Earned',
    [-1]: 'The MAGA Coalition Is Breaking Up',
    [1]: "MAGA's Rough Midterm Night Is Being Read as a Collapse",
    [2]: 'One Rough Night Does Not Mean the MAGA Coalition Is Finished',
  },
  'ai-data-centers': {
    [-2]: "AI Giants Face a Public That's Done Hosting Their Data Centers",
    [-1]: 'AI Companies Face a Backlash Over New Data Centers',
    [1]: 'AI Firms Look for a Way Around New Limits on Data Centers',
    [2]: 'AI Firms Navigate a Political Climate Suddenly Wary of Data Centers',
  },
  'military-ai': {
    [-2]: 'The Pentagon Races Drones and AI Onto the Battlefield as Congress Scrambles for Guardrails',
    [-1]: 'The Military Speeds Up Drones and AI. Congress Asks Who Pulls the Trigger.',
    [1]: 'Pentagon Pushes Drones and AI as Congress Weighs New Limits',
    [2]: 'Military Moves Fast on Drones and AI. Congress Threatens to Tie Its Hands.',
  },
}

const LEDES: Record<string, Partial<Record<number, string>>> = {
  'maga-coalition': {
    [-2]: '“The president always loses, for whatever reason, the midterms,” President Trump said a few weeks ago. What the country just watched was not a normal sixth-year dip. It was a rout of the MAGA coalition — and the political left turn those losses now make possible.',
    [-1]: '“The president always loses, for whatever reason, the midterms,” President Trump said a few weeks ago. What makes 2026 different is the size of the setback, and the leftward shift it now points toward.',
    [1]: '“The president always loses, for whatever reason, the midterms,” President Trump said a few weeks ago. What the political class is already calling a collapse is, first, a midterm the president’s party almost always eats.',
    [2]: '“The president always loses, for whatever reason, the midterms,” President Trump said a few weeks ago. What Washington is selling as the end of MAGA is a rough night the president’s party almost always has — and a map the left is already over-reading.',
  },
  'ai-data-centers': {
    [-2]: 'It’s no surprise that after a working-class wave at the ballot box, OpenAI CEO Sam Altman was already in a panic over data centers. The midterms had barely ended Wednesday when his company faced a hard question: would voters make it harder to lock down the computing power it needs to keep growing?',
    [-1]: 'The midterms had barely ended Wednesday when OpenAI CEO Sam Altman was already facing the political cost of the data-center buildout: would the new map make it harder to secure the computing power the company needs to keep growing?',
    [1]: 'The midterms had barely ended Wednesday when OpenAI’s leaders were already warning that politics — not engineering — might be what slows the next wave of data centers, and the computing power the company says it needs to keep growing.',
    [2]: 'The midterms had barely ended Wednesday when OpenAI’s leaders were already sounding the alarm that a tougher political climate, not a shortage of ideas, might be the thing that slows the AI buildout and the computing power the company needs to keep growing.',
  },
  'military-ai': {
    [-2]: 'The Pentagon wants machines to find targets, fly the last mile, and fire faster than a human can think — and Defense Secretary Pete Hegseth just stood up a major new command to make sure that happens. Congress is only now asking whether anyone will still be left on the trigger.',
    [-1]: 'Defense Secretary Pete Hegseth announced a major new command to rush drones and artificial intelligence across the military, even as Congress is still asking the basic question: does a human have to take the shot?',
    [1]: 'Defense Secretary Pete Hegseth announced a major new command to get drones and artificial intelligence into the fight faster, a speed-up Pentagon officials say is overdue while Congress debates new limits.',
    [2]: 'Defense Secretary Pete Hegseth announced a major new command to get drones and artificial intelligence onto the battlefield faster — the kind of speed Pentagon leaders say the military cannot wait on while Congress talks about tying its hands.',
  },
}

const CONNOTATION_TITLE: Record<number, Record<string, string>> = {
  [-1]: {
    considers: 'scrambles to contain',
    safeguards: 'belated guardrails',
    Disintegrates: 'Collapses',
    'speeds up': 'rushes',
    Tests: 'Pushes',
    Weighs: 'Forces Through',
  },
  [1]: {
    considers: 'moves to set',
    safeguards: 'common-sense safeguards',
    Disintegrates: 'Hits a Setback',
    Hostile: 'Skeptical',
    Tests: 'Rolls Out',
  },
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
  autonomous: 'on its own', autonomously: 'on its own', procurement: 'buying weapons',
  bureaucracy: 'slow office rules', 'red tape': 'slow office rules',
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

function isDek(x: string) {
  return /^>/.test(x)
}

const THEME_MATCH: Record<string, RegExp> = {
  jobs: /\bjobs\b|\bjob creation\b|\bjob security\b/i,
  water: /\bwater\b/i,
  'energy and power bills': /\b(energy(?: costs| bills)?|power bills?|electric(?:ity)?(?: bills)?|the grid|grid (?:capacity|strain))\b/i,
  'housing costs': /\b(housing|rent|home values?|mortgage)\b/i,
  'farm income': /\b(farm|agricultur|crop|cattle|dairy)\b/i,
  'the local tax base': /\b(tax(?:es| revenue)?|tax base)\b/i,
  'whether new investment stays': /\binvest(?:ment|ors)?\b/i,
  'health-care costs': /\b(health[ -]?care|hospital|medicaid)\b/i,
  trade: /\b(trade|tariff|export)\b/i,
}

const THEME_CLINCH: Record<string, string> = {
  jobs: 'Those jobs are usually the part of the argument that travels farthest.',
  water: 'Water use is the cost that does not stay on a spreadsheet.',
  'energy and power bills': 'Power is where an abstract building becomes a household bill.',
  'housing costs': 'Housing costs are where policy stops being abstract.',
  'farm income': 'Farm income is the piece that decides whether a place can absorb the next shock.',
  'the local tax base': 'The local tax base is how a project either pays its way or does not.',
  'whether new investment stays': 'Whether that investment stays is the question underneath the rest.',
  'health-care costs': 'Health-care costs are where households feel the same fight in a different form.',
  trade: 'Trade is how a local fight becomes a wider one.',
}

function presentThemes(text: string, themes: string[]) {
  return themes.filter((t) => THEME_MATCH[t]?.test(text))
}

function joinThemes(themes: string[]) {
  if (themes.length <= 1) return themes[0] ?? ''
  if (themes.length === 2) return `${themes[0]} and ${themes[1]}`
  return `${themes.slice(0, -1).join(', ')}, and ${themes[themes.length - 1]}`
}

function mapUnquoted(s: string, fn: (t: string) => string) {
  const parts: string[] = []
  const re = /("[^"]*"|“[^”]*”)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(fn(s.slice(last, m.index)))
    parts.push(m[0])
    last = m.index + m[0].length
  }
  if (last < s.length) parts.push(fn(s.slice(last)))
  return parts.join('')
}

function applyPhrases(s: string, pairs: [RegExp, string][]) {
  return mapUnquoted(s, (t) => {
    let out = t
    for (const [re, to] of pairs) out = out.replace(re, to)
    return out
  })
}

/** Wire / CNN / Fox restatement of the same facts. Quotes and numbers stay. */
const WIRE_PHRASES: [RegExp, string][] = [
  [/\bhad hardly settled\b/gi, 'had barely settled'],
  [/\bbegan reckoning with an urgent question\b/gi, 'were already facing a hard question'],
  [/\bfielded questions about\b/gi, 'took questions on'],
  [/\baccording to people familiar with the matter\b/gi, 'according to people with knowledge of the discussion'],
  [/\bA day earlier,\b/g, 'A day before,'],
  [/\bmused that\b/gi, 'suggested that'],
  [/\bcarefully cultivated relationships with\b/gi, 'spent years building ties to'],
  [/\brushed to plan for a changed reality\b/gi, 'moved to plan for a different political map'],
  [/\bcould further bog them down\b/gi, 'could slow them further'],
  [/\bmoved quickly to open lines of communication with\b/gi, 'moved fast to reach'],
  [/\bon the whole\b/gi, 'broadly'],
  [/\bunveiled a broad commitment governing how it approaches\b/gi, 'announced a set of rules for how it will handle'],
  [/\bpreviewed for investors the risk that\b/gi, 'flagged for investors the chance that'],
  [/\bTo have any hope of winning over the public\b/g, 'If the industry wants the public on its side'],
]

const CNN_PHRASES: [RegExp, string][] = [
  [/\bscrambled to navigate a world hostile to\b/gi, 'moved to face a public that has turned against'],
  [/\bweigh their options as winning candidates promise moratoriums\b/gi, 'look for a path as newly elected officials pledge building freezes'],
  [/\ba wave of data-center opposition had helped\b/gi, 'a grassroots fight over new server farms had helped'],
  [/\ba changed reality\b/gi, 'a public that had run out of patience'],
  [/\bblanket moratoriums\b/gi, 'blanket freezes on new building'],
  [/\btech companies\b/gi, 'AI giants'],
  [/\bthe prospect of\b/gi, 'the very real prospect of'],
  [/\bincreasingly considering\b/gi, 'now looking at'],
  [/\bnew hurdles\b/gi, 'new political barriers'],
  [/\bwill have to get much better at talking about its product\b/gi, 'will have to get much better at defending what it builds'],
  [/\breduce concentration risks associated with\b/gi, 'spread the risk of'],
  [/\bspeed the use of drones and artificial intelligence\b/gi, 'rush drones and AI onto the battlefield'],
  [/\bgrappling with the military version of a question\b/gi, 'scrambling to answer a question the workforce at the big AI shops is already asking'],
  [/\bessentially has them policing themselves\b/gi, 'essentially leaves them to police themselves'],
  [/\bis considering restrictions on military AI\b/gi, 'is trying to put limits on military AI after the fact'],
  [/\ban overreliance on AI\b/gi, 'a dangerous overreliance on AI'],
  [/\btear down parts of the bureaucracy that move slowly and cut through red tape\b/gi, 'blow through the rules that keep weapons programs slow'],
]

const FOX_PHRASES: [RegExp, string][] = [
  [/\bscrambled to navigate a world hostile to\b/gi, 'worked to get through a tougher climate for'],
  [/\bweigh their options as winning candidates promise moratoriums\b/gi, 'weigh their options as newly elected officials talk building freezes'],
  [/\ba wave of data-center opposition had helped\b/gi, 'a run of campaigns against new data centers had helped'],
  [/\ba changed reality\b/gi, 'a tougher political climate'],
  [/\bhostile to\b/gi, 'wary of'],
  [/\bblanket moratoriums\b/gi, 'new limits on building'],
  [/\bthe prospect of\b/gi, 'the possibility of'],
  [/\bincreasingly considering\b/gi, 'also considering'],
  [/\bnew hurdles\b/gi, 'new rules'],
  [/\bwill have to get much better at talking about its product\b/gi, 'will have to get better at making the case'],
  [/\bspeed the use of drones and artificial intelligence\b/gi, 'get drones and AI into the fight faster'],
  [/\bgrappling with the military version of a question\b/gi, 'debating a question AI companies have also raised'],
  [/\bessentially has them policing themselves\b/gi, 'sets industry standards the companies agreed to'],
  [/\bis considering restrictions on military AI\b/gi, 'is weighing limits that could slow military AI'],
  [/\ban overreliance on AI\b/gi, 'heavy use of AI'],
  [/\btear down parts of the bureaucracy that move slowly and cut through red tape\b/gi, 'cut through red tape holding the services back'],
]

function newsroomRetell(text: string, lean: number) {
  const extra = lean <= -1 ? CNN_PHRASES : lean >= 1 ? FOX_PHRASES : []
  let out = applyPhrases(text, [...WIRE_PHRASES, ...extra])
  out = mapUnquoted(out, (t) => {
    if (lean <= -1) {
      return t
        .replace(/\bMeanwhile,\b/g, 'At the same time,')
        .replace(/\bOn Thursday,\b/g, 'By Thursday,')
        .replace(/\bofficials say\b/gi, 'officials concede')
        .replace(/\bcompanies say\b/gi, 'the companies insist')
    }
    if (lean >= 1) {
      return t
        .replace(/\bMeanwhile,\b/g, 'Separately,')
        .replace(/\bOn Thursday,\b/g, 'Thursday,')
        .replace(/\bcritics say\b/gi, 'critics claim')
        .replace(/\bwarned\b/gi, 'cautioned')
    }
    return t
      .replace(/\bMeanwhile,\b/g, 'At the same time,')
      .replace(/\bOn Thursday,\b/g, 'Thursday,')
  })
  return out
}

function restyleBlock(x: string, lean: number) {
  if (isDek(x)) return `> ${newsroomRetell(x.replace(/^>\s*/, ''), lean)}`
  if (!isProse(x)) return x
  return newsroomRetell(x, lean)
}

function lingerOnThemes(paras: string[], themes: string[]) {
  const body = paras.join('\n\n')
  const present = presentThemes(body, themes)
  if (!present.length) return paras
  const used = new Set<string>()
  const next = paras.map((p) => {
    if (!isProse(p) && !isDek(p)) return p
    let out = p
    for (const theme of present) {
      if (used.has(theme)) continue
      const re = THEME_MATCH[theme]
      const clinch = THEME_CLINCH[theme]
      if (re?.test(p) && clinch && !p.includes(clinch)) {
        out = `${out.replace(/\s*$/, '')} ${clinch}`
        used.add(theme)
      }
    }
    return out
  })
  insertAfterByline(
    next,
    `The practical questions — ${joinThemes(present)} — are the ones that tend to decide what happens next.`,
    1,
  )
  return next
}

/** Keep every sentence; split long ones so they stay readable. */
function simplifyProse(p: string) {
  return sentences(p)
    .map((s) => {
      const words = s.replace(/[.!?]+$/, '').split(/\s+/)
      if (words.length <= 16) return s
      const mid = s.search(/, (and|but|which|that) /i)
      if (mid > 20) {
        const a = s.slice(0, mid).replace(/[,:;]+$/, '') + '.'
        const b = s.slice(mid).replace(/^, (and|but|which|that)\s+/i, '')
        const rest = b[0] ? b[0].toUpperCase() + b.slice(1) : b
        return `${a} ${rest}`
      }
      return s
    })
    .join(' ')
}

function spinHeadline(articleId: string, title: string, lean: number, connotation: number) {
  const banked = HEADLINES[articleId]?.[lean]
  let out = banked ?? title
  if (!banked && lean !== 0) {
    const as = title.match(/^As (.+?), (.+)$/i)
    if (as) {
      const a = as[1]
      const b = as[2]
      out = lean < 0
        ? `${a.charAt(0).toUpperCase()}${a.slice(1)}. ${b.charAt(0).toUpperCase()}${b.slice(1)} — late.`
        : `${a.charAt(0).toUpperCase()}${a.slice(1)} as Washington second-guesses the job.`
    }
  }
  if (connotation !== 0) out = swapWords(out, CONNOTATION_TITLE[connotation] ?? {})
  return out
}

function replaceLede(articleId: string, paras: string[], lean: number) {
  const lede = LEDES[articleId]?.[lean]
  if (!lede || lean === 0) return paras
  const i = paras.findIndex(isProse)
  if (i === -1) return paras
  const next = paras.slice()
  next[i] = lede
  return next
}

function applyMap(title: string, paras: string[], map: Record<string, string> | undefined) {
  if (!map) return { title, paras }
  const body = (x: string) => mapUnquoted(x, (t) => swapWords(t, map))
  return {
    title: swapWords(title, map),
    paras: paras.map((x) => {
      if (isDek(x)) return `> ${body(x.replace(/^>\s*/, ''))}`
      if (!isProse(x)) return x
      return body(x)
    }),
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

  // 1. Political lean — full restatement, not a summary
  ;({ title, paras } = applyMap(title, paras, LEAN_SWAPS[p.lean]))
  title = newsroomRetell(title, p.lean)
  paras = paras.map((x) => restyleBlock(x, p.lean))
  paras = replaceLede(p.articleId, paras, p.lean)
  title = spinHeadline(p.articleId, title, p.lean, 0)

  // 2. Income
  if (p.income !== null && INCOME_LINES[p.income]) insertAfterByline(paras, INCOME_LINES[p.income], 1)

  // 3. Location — emphasize inferred stakes already in the story, never name the place
  if (loc.kind === 'state') {
    paras = lingerOnThemes(paras, inferEmphasis(loc.profile))
    if (p.connotation === 0 && loc.profile.partisanLean !== 0) {
      const nudge = loc.profile.partisanLean > 0 ? -1 : 1
      ;({ title, paras } = applyMap(title, paras, CONNOTATION_SWAPS[nudge]))
    }
  } else if (loc.kind === 'country') {
    ;({ title, paras } = applyMap(title, paras, INTL_DEFS))
    insertAfterByline(
      paras,
      'The same facts also land as a story about trade, energy, and who builds the next wave of infrastructure.',
      1,
    )
  }

  // 4. Education — same story, different register. Never drop paragraphs.
  const maga = p.articleId === 'maga-coalition'
  if (p.education === 0) {
    ;({ title, paras } = applyMap(title, paras, HS_SWAPS))
    paras = paras.map((x) => (isProse(x) ? simplifyProse(x) : x))
  } else if (p.education === 1) {
    ;({ title, paras } = applyMap(title, paras, COLLEGE_DEFS))
    if (maga) {
      insertAfterByline(
        paras,
        'Younger voters moved hardest, which is the group still paying for college and looking for a first job.',
        2,
      )
    }
  } else if (p.education === 2) {
    ;({ title, paras } = applyMap(title, paras, TOP_SCHOOL_SWAPS))
    if (maga) {
      insertAfterByline(
        paras,
        'Read as a generational shift, the coalition that won in 2024 did not hold among the young.',
        2,
      )
    }
  } else if (p.education === 4) {
    ;({ title, paras } = applyMap(title, paras, ELITE_SWAPS))
    if (maga) {
      title = swapWords(title, { 'GOP collapse': 'a historic repudiation', collapse: 'a historic repudiation' })
      insertAfterByline(
        paras,
        'Historically, sixth-year midterms punish the president’s party; what is unusual here is the breadth, not the direction.',
        2,
      )
    }
  } else if (p.education === 5) {
    ;({ title, paras } = applyMap(title, paras, GRAD_SWAPS))
    const facts = paras.flatMap((x) => (isProse(x) ? sentences(x) : [])).filter((s) => /\d/.test(s)).slice(0, 3)
    if (facts.length) {
      const box = ['KEY TAKEAWAYS', ...facts.map((f) => `• ${f}`)].join('\n\n')
      const byline = paras.filter((x) => !isProse(x))
      const rest = paras.filter(isProse)
      paras = [...byline, box, ...rest]
    }
    if (maga) paras.push('The open question is whether this marks a durable realignment or a one-cycle reaction.')
  }

  // 5. Connotation (visitor setting always wins; skip if location already nudged from neutral)
  const locationNudged = loc.kind === 'state' && p.connotation === 0 && loc.profile.partisanLean !== 0
  if (!locationNudged) {
    ;({ title, paras } = applyMap(title, paras, CONNOTATION_SWAPS[p.connotation]))
  }
  title = spinHeadline(p.articleId, title, p.lean, p.connotation)

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
