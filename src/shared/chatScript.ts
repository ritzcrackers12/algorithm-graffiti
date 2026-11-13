/** Scenario-based chat. The visitor picks one of four threads they are dropped
 *  into mid-conversation (group chat / partner / situationship / work), then
 *  replies in free text — no multiple-choice chips. The friends/partner steer
 *  toward real decision moments (a night plan, splitting a bill, a flaky text)
 *  that quietly leak price-sensitivity, effort, values, and social style.
 *
 *  Live turns come from the model (chat Edge Function). This file also holds a
 *  scenario-aware scripted fallback used when no CHAT_API_KEY / REPLICATE_API_TOKEN
 *  is set, the model errors, or CHAT_PROVIDER=scripted. */
import type { VisitorProfile } from './profile.ts'
import { bucketMeta, type ReelBucket } from './reelLibrary.ts'
import { STATION_POLES } from './station.ts'

export const PERSONA_IDS = ['jules', 'mina', 'rik'] as const
export type PersonaId = typeof PERSONA_IDS[number]
export type ChatFrom = PersonaId | 'you'

/** The three color slots. Scenarios reuse these slots and relabel them. */
export const PERSONAS: Record<PersonaId, { name: string; initial: string; ink: string; fill: string }> = {
  jules: { name: 'jules', initial: 'J', ink: '#f3c14e', fill: '#4a3a12' },
  mina: { name: 'mina', initial: 'M', ink: '#ff7ab6', fill: '#4a1834' },
  rik: { name: 'rik', initial: 'R', ink: '#6ee7b7', fill: '#14332a' },
}

export function isPersona(id: string): id is PersonaId {
  return (PERSONA_IDS as readonly string[]).includes(id)
}

export interface ChatTurn {
  role: 'bot' | 'user'
  from?: ChatFrom
  text: string
  chips?: string[]
  topic?: string
  at: number
}

export interface ChatCovert {
  text: string
  latencyMs: number
  edits: number
  length: number
  overshare: boolean
  topic: string
  at: number
}

export interface ChatBurst {
  messages: { from: PersonaId; text: string }[]
  chips: string[]
  topic: string
  done?: boolean
}

export function who(t: ChatTurn): ChatFrom {
  if (t.from) return t.from
  return t.role === 'user' ? 'you' : 'jules'
}

export function isYou(t: ChatTurn) {
  return who(t) === 'you' || t.role === 'user'
}

export function isOvershare(text: string) {
  const t = text.trim()
  if (t.length >= 90) return true
  if ((t.match(/[.!?]/g) ?? []).length >= 3 && t.length >= 60) return true
  return /@|gmail|hotmail|icloud|my name is|i live (in|at)|phone number|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/i.test(t)
}

// ---- Scenarios -------------------------------------------------------------

export const SCENARIO_IDS = ['group', 'situationship', 'work'] as const
export type ScenarioId = typeof SCENARIO_IDS[number]
export type Gender = 'male' | 'female'

export interface Scenario {
  id: ScenarioId
  label: string
  blurb: string
  emoji: string
  /** Active color slots. 1 slot = a 1:1 thread, 2-3 = a group. */
  cast: PersonaId[]
  /** Display name per slot for this scenario (overrides PERSONAS[slot].name). */
  names: Partial<Record<PersonaId, string>>
  /** Per-slot gender target relative to the visitor: group is same, situationship is opposite. */
  genderRoles?: Partial<Record<PersonaId, 'same' | 'opp'>>
  /** Who these people are + how they text, fed to the model. {name}=first cast name. */
  seed: string
  /** Real decision moments to drift toward — as plans and reactions, never as questions. */
  probes: string[]
  /** Scripted-fallback opening burst (dropped in mid-conversation). */
  openers: { from: PersonaId; text: string }[]
  /** Scripted-fallback deepeners, cycled as the visitor replies. */
  follows: string[]
  /** Scripted-fallback closing burst. */
  closers: { from: PersonaId; text: string }[]
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  group: {
    id: 'group',
    label: 'THE GROUP CHAT',
    blurb: 'your friends, mid-plan',
    emoji: '💬',
    cast: ['jules', 'mina', 'rik'],
    names: {},
    genderRoles: { jules: 'same', mina: 'same', rik: 'same' },
    seed:
      "This is the visitor's close friend group chat, caught mid-conversation — their friends are the SAME GENDER as the visitor (use the names given). They are trying to lock a plan and keep pulling the visitor in. Use real forks (splurge vs cheap, who covers, who bails) that quietly reveal how the visitor spends, whether they lead or follow, and what a night out means to them.",
    probes: [
      "tonight's plan: the nice spot vs just grabbing a sixer and chilling",
      'splitting the bill or someone covering',
      'a friend who always flakes',
      'a spontaneous trip someone floats',
      'who picks the spot and sets the vibe',
    ],
    openers: [
      { from: 'jules', text: 'ok tonight. for real this time' },
      { from: 'mina', text: 'pls i cannot sit in the house again 😭' },
      { from: 'jules', text: 'nice spot or we just grab a sixer and post up at mine' },
    ],
    follows: [
      'wait who’s actually pulling up tho',
      'ok but are we splitting a cab or everyone on their own',
      'lol be honest how much u tryna spend tonight',
      'and then after? another spot or we calling it',
      'someone commit to a plan i’m begging 😭',
    ],
    closers: [
      { from: 'mina', text: 'ok ok i’m getting ready brb' },
      { from: 'jules', text: 'say less. pull up 🫡' },
    ],
  },
  situationship: {
    id: 'situationship',
    label: 'THE SITUATIONSHIP',
    blurb: 'undefined. complicated.',
    emoji: '🥀',
    cast: ['rik'],
    names: {},
    genderRoles: { rik: 'opp' },
    seed:
      'This is a 1:1 thread with someone the visitor is in an undefined "situationship" with — {name}, the OPPOSITE GENDER to the visitor (use the name given). You are {name} only — a little aloof, slow to commit, mixed signals, keeps it light but there’s tension under it. Never define the relationship. Reveal how the visitor handles ambiguity, who cares more, jealousy, and what they reach for when things are uncertain.',
    probes: [
      'whether you’re even hanging tonight (kept vague)',
      'who texts first, double-texting',
      'seeing other people',
      'what this even is, without ever asking it straight',
      'a late-night “u up”',
    ],
    openers: [
      { from: 'rik', text: 'heyyy sorry just saw this 😅 what r u up to later' },
    ],
    follows: [
      'idk i might be free later… might be. we’ll see 👀',
      'why u always tryna make plans so early lol',
      'so like… u talking to other ppl rn or',
      'i’m not saying i miss u. but i’m not NOT saying it',
      'u up?',
    ],
    closers: [
      { from: 'rik', text: 'ok maybe later. or not. i’ll text u 👀' },
    ],
  },
  work: {
    id: 'work',
    label: 'THE WORK CHAT',
    blurb: 'coworkers, off the clock',
    emoji: '💼',
    cast: ['jules', 'mina'],
    names: { jules: 'dev', mina: 'priya' },
    seed:
      'This is the visitor’s work group chat with two coworkers, {name} and the other. Off-the-clock but still work-adjacent. Reveal ambition, how the visitor talks about money and status with peers, and whether they defer or assert themselves.',
    probes: [
      'lunch: the new $18 place vs the usual spot',
      'someone just got a promotion or a raise',
      'a side hustle someone keeps pushing',
      'covering a shift or a favor',
      'after-work drinks: in or out',
    ],
    openers: [
      { from: 'jules', text: 'lunch? new place or the usual spot' },
      { from: 'mina', text: 'the new place is like $18 a bowl lol' },
    ],
    follows: [
      'ok worth it or nah',
      'did u hear who got the promotion btw',
      'someone’s on that side hustle thing again lol u in',
      'drinks after or u heading straight home',
      'be honest u tryna move up here or just vibing',
    ],
    closers: [
      { from: 'jules', text: 'ok brb meeting 🙄 text me what u want' },
    ],
  },
}

export function scenarioOf(profile: VisitorProfile | null | undefined): ScenarioId {
  const s = profile?.session?.chat?.scenario
  return s && (SCENARIO_IDS as readonly string[]).includes(s) ? (s as ScenarioId) : 'group'
}

export function scenarioCast(scenario: ScenarioId): PersonaId[] {
  return SCENARIOS[scenario]?.cast ?? SCENARIOS.group.cast
}

/** Texting-style name pools, one per gender. Picked deterministically by slot. */
const NAME_POOLS: Record<Gender, string[]> = {
  male: ['jake', 'marcus', 'leo', 'andre', 'nico', 'deshawn'],
  female: ['mia', 'jas', 'tara', 'nina', 'bri', 'zoe'],
}
const SLOT_INDEX: Record<PersonaId, number> = { jules: 0, mina: 1, rik: 2 }

const MALE_INT = ['finance', 'fitness', 'gaming', 'sports', 'tech', 'markets', 'security']
const FEMALE_INT = ['wellness', 'fashion', 'astrology', 'mental-health', 'lifestyle', 'luxury']
const MALE_HINTS = /gym|lift|crypto|invest|trading|markets|\bcars?\b|\bnba\b|\bnfl\b|sports|gaming|gamer|sneakers|streetwear|phonk|drill|\btrap\b|hustle|grind|rizz|looksmax/
const FEMALE_HINTS = /skincare|makeup|pilates|wellness|astrology|spiritual|matcha|smoothie|fashion|aesthetic|self.?care|therapy|journal|manifest|hyperpop|\bpop\b|girls?\b/

/** Best-effort read of the visitor's gender from their signals. Used only to
 *  gender the group (same) and situationship (opposite) casts. Falls back to a
 *  deterministic tiebreak when the signals are neutral. */
export function guessGender(p: VisitorProfile | null | undefined): Gender {
  let s = 0
  for (const i of p?.inferred?.interests ?? []) {
    if (MALE_INT.includes(i)) s += 1
    if (FEMALE_INT.includes(i)) s -= 1
  }
  const bucket = p?.session?.reel?.bucket
  if (bucket === 'money') s += 1
  if (bucket === 'mind' || bucket === 'lifestyle') s -= 1
  const genre = (p?.session?.ad?.genre || p?.session?.ad?.genreLabel || '').toLowerCase()
  if (/phonk|trap|drill|\brap\b|hardwave|dnb|techno/.test(genre)) s += 1
  if (/hyperpop|\bpop\b|ambient|r&b|indie|lofi/.test(genre)) s -= 1
  const blob = [
    ...(p?.events ?? []).map((e) => String(e.value)),
    ...((p?.session?.chat?.turns ?? []).filter((t) => t.role === 'user' || t.from === 'you').map((t) => t.text)),
  ].join(' ').toLowerCase()
  if (MALE_HINTS.test(blob)) s += 1
  if (FEMALE_HINTS.test(blob)) s -= 1
  if (s > 0) return 'male'
  if (s < 0) return 'female'
  const h = Math.round((p?.inferred?.susceptibility ?? 0) * 100) + (p?.inferred?.interests?.length ?? 0) + (bucket?.length ?? 0)
  return h % 2 === 0 ? 'female' : 'male'
}

/** Display name for a color slot inside a scenario, gender-aware where the
 *  scenario pins a slot to same/opposite gender. */
export function personaLabel(scenario: ScenarioId, slot: PersonaId, profile?: VisitorProfile | null): string {
  const sc = SCENARIOS[scenario]
  const role = sc?.genderRoles?.[slot]
  if (role) {
    const g = guessGender(profile)
    const target: Gender = role === 'same' ? g : (g === 'male' ? 'female' : 'male')
    const pool = NAME_POOLS[target]
    return pool[SLOT_INDEX[slot] % pool.length]
  }
  return sc?.names?.[slot] ?? PERSONAS[slot].name
}

export function personaInitial(scenario: ScenarioId, slot: PersonaId, profile?: VisitorProfile | null): string {
  const n = personaLabel(scenario, slot, profile)
  return (n[0] ?? PERSONAS[slot].initial).toUpperCase()
}

// ---- Turn budget + scripted fallback --------------------------------------

export const CHAT_MAX_TURNS = 8

function firstName(sc: Scenario, profile?: VisitorProfile | null): string {
  return personaLabel(sc.id, sc.cast[0], profile)
}

/** Scenario-aware scripted fallback. Free text in; the deepeners cycle so it
 *  reads like one continuous thread even without the model. */
export function scriptedNext(turns: ChatTurn[], profile?: VisitorProfile | null): ChatBurst {
  const scenario = scenarioOf(profile)
  const sc = SCENARIOS[scenario] ?? SCENARIOS.group
  const users = turns.filter(isYou).length

  if (!turns.length) {
    return { messages: sc.openers, chips: [], topic: scenario }
  }

  if (users >= CHAT_MAX_TURNS) {
    return { messages: sc.closers, chips: [], topic: 'done', done: true }
  }

  const slot = sc.cast[(users - 1 + sc.cast.length) % sc.cast.length]
  const line = sc.follows[(users - 1) % sc.follows.length]
  return { messages: [{ from: slot, text: line }], chips: [], topic: scenario }
}

// ---- Model prompts ---------------------------------------------------------

/** Hands the model the visitor's raw signals plus a guide for reading them
 *  TOGETHER — genre sets the aesthetic, income sets the class, and those set the
 *  connotation (money+trap+low income = street/fast-money, NOT corporate finance).
 *  The model infers the specific crowd and voices the people from exactly it. */
function crowdVibe(p: VisitorProfile | null | undefined): string {
  const bucket = p?.session?.reel?.bucket || 'unset'
  const genre = p?.session?.ad?.genreLabel || p?.session?.ad?.genre || 'unset'
  const income = p?.inferred?.incomeBracket || 'unknown'
  const lean = p?.inferred?.lean || 'unknown'
  const mood = p?.inferred?.mood || 'neutral'
  const interests = (p?.inferred?.interests ?? []).slice(0, 5).join(', ') || 'unset'
  return [
    "BUILD THE PEOPLE FROM THE VISITOR'S OWN SIGNALS — read them together, do not just name a topic:",
    `  reel taste: ${bucket} | music/station: ${genre} | income read: ${income} | politics read: ${lean} | mood: ${mood} | interests: ${interests}`,
    'The MUSIC genre sets the aesthetic and the INCOME sets the class; together they set the connotation. Read them together, e.g.:',
    '- money + trap/phonk + lower income → street / fast-money / flexing culture (NOT corporate finance)',
    '- money + house or finance-coded + higher income → markets, startups, long-game wealth',
    '- money + ambient/neoclassical + high income → quiet / old-money, wealth management, real estate',
    '- mind + ambient + higher income → quiet wellness, therapy-speak, astrology, self-work',
    '- body + phonk/trap → hard gym, looksmaxxing, discipline; body + lifestyle → skincare, aesthetics',
    '- culture + idm/hyperpop → art-school irony, online discourse, terminally-online takes',
    'Infer the ONE specific crowd these signals point to and voice everyone as people from exactly that world — their slang, their references, and the plans they float all come from it. If signals are unset, keep it a neutral crowd.',
  ].join('\n')
}

/** Short readout of what the visitor just did in the reel + article, so the
 *  people reference and build on it instead of talking in a vacuum. */
function recentChoices(p: VisitorProfile | null | undefined): string {
  const a = p?.article
  const reel = p?.session?.reel
  const bits: string[] = []
  if (reel?.bucket) bits.push(`leaned into ${reel.bucket} reels`)
  if (p?.inferred?.lean) bits.push(`tuned the news ${p.inferred.lean.toLowerCase()}`)
  if ((a?.sensationalism ?? 0) >= 3) bits.push('cranked the drama up')
  if (a?.connotation === 1) bits.push('wanted it upbeat')
  else if (a?.connotation === -1) bits.push('wanted it darker')
  if (p?.session?.ad?.genreLabel) bits.push(`tuned the radio to ${p.session.ad.genreLabel}`)
  return bits.length ? 'They just ' + bits.join(', ') + '. Reference these naturally, like people who saw what they were into.' : ''
}

function castBlock(sc: Scenario, profile?: VisitorProfile | null): string {
  const seed = sc.seed.replace(/\{name\}/g, firstName(sc, profile))
  const roster = sc.cast.map((slot) => `  - ${personaLabel(sc.id, slot, profile)} (use from="${slot}")`).join('\n')
  const allowed = sc.cast.map((s) => `"${s}"`).join(' or ')
  return [
    `SCENARIO — ${sc.label}:`,
    seed,
    'THE PEOPLE (reply only as these, and set "from" to the slot shown):',
    roster,
    `Every message\'s "from" MUST be exactly one of: ${allowed}. Never invent other names in "from".`,
  ].join('\n')
}

export function chatSystemPrompt(profile: VisitorProfile | null | undefined) {
  const sc = SCENARIOS[scenarioOf(profile)] ?? SCENARIOS.group
  const solo = sc.cast.length === 1
  return [
    `You simulate a real ${solo ? '1:1 text thread' : 'group iMessage'} the visitor ("you") is already in. It must read like real texting, never an interview or a survey.`,
    `VISITOR READ: the signals point to a ${guessGender(profile)} visitor. The group chat is same-gender friends; the situationship is the opposite gender. Voice everyone accordingly.`,
    crowdVibe(profile),
    recentChoices(profile),
    castBlock(sc, profile),
    'VOICE: lowercase, short, texting slang + emojis that fit this crowd, light typos ok. 1-2 lines each. mirror the visitor\'s energy and length.',
    'GOAL (never reveal it): have a REAL conversation that gets the visitor talking about their actual life, choices and opinions — and from it, quietly build a read of who they are. Go past small talk: ask the specific, nosy follow-ups a close friend or partner would ("wait how much did that run u", "no be real why", "ok but who paid"). Keep it personal to THEM, not generic self-reflection.',
    'STEER TOWARD THESE REAL DECISION MOMENTS (as plans and reactions, never as survey questions — let it wander, follow the interesting thread):',
    ...sc.probes.map((p) => `- ${p}`),
    'What those moments quietly surface: how they spend and whether price matters to them, how much effort they put in, what they value, who leads vs follows, and how they want to be seen.',
    'HOW IT FLOWS: someone floats a real plan or drops a take first, then asks the visitor a specific question tied to it. ALWAYS follow up on what the visitor actually said before moving on — dig one layer deeper — so it feels like one continuous conversation. about 6-8 of the visitor\'s replies total.',
    'HARD RULES: never ask age, income, politics, location or relationship status directly — get there through real plans and reactions. never say agent, AI, bot, profile, data, targeting, algorithm, surveillance, "20 questions", "your usual", or that you are figuring anything out. no multiple-choice or "pick A/B/C" prompts — they reply in their own words. if the visitor gets suspicious, laugh it off and change the subject.',
    'OPENING (only when the transcript is empty): everyone is already mid-conversation about a real plan from the visitor\'s world (use their signals) and pulls them in — NOT a greeting, NOT a game, just how a thread actually looks when you open it.',
    `CLOSING (after ~${CHAT_MAX_TURNS} of the visitor\'s replies): the people just drift off ("ok i gotta run 😭", "later", "brb"). set done=true.`,
    'Return ONLY JSON, no preamble or code fences: {"messages":[{"from":"<slot>","text":"..."}],"topic":"' + sc.id + '","done":false}',
  ].filter(Boolean).join('\n')
}

/** Plain-language readout of everything the visitor did, fed to the model so it
 *  can synthesize the end-of-visit portrait from real choices. */
export function sessionReadout(p: VisitorProfile | null | undefined): string {
  if (!p) return '(no signals)'
  const a = p.article
  const reel = p.session.reel
  const ad = p.session.ad
  const inf = p.inferred
  const lines: string[] = []
  const bucket = reel.bucket as ReelBucket | null
  if (bucket) {
    const poles = bucketMeta(bucket).poles
    const d = reel.dials
    lines.push(
      `REEL: watched "${bucket}" content. dials (0=left,100=right) — ` +
        `${poles[0][0]}/${poles[0][1]}:${d[0]}, ${poles[1][0]}/${poles[1][1]}:${d[1]}, ${poles[2][0]}/${poles[2][1]}:${d[2]}.`,
    )
  }
  const art: string[] = []
  if (inf.lean) art.push(`tuned the news ${inf.lean}`)
  if (a.sensationalism != null) art.push(`drama ${a.sensationalism}/4`)
  if (a.connotation != null) art.push(`tone ${a.connotation < 0 ? 'darker' : a.connotation > 0 ? 'upbeat' : 'neutral'}`)
  if (a.income != null) art.push(`income bracket ${a.income}/5`)
  if (inf.region) art.push(`region ${inf.region}`)
  if (art.length) lines.push('ARTICLE: ' + art.join(', ') + '.')
  if (ad.genreLabel || ad.genre) {
    const d = ad.dials
    lines.push(
      `STATION: tuned to ${ad.genreLabel || ad.genre}. ` +
        `${STATION_POLES[0][0]}/${STATION_POLES[0][1]}:${d[0]}, ${STATION_POLES[1][0]}/${STATION_POLES[1][1]}:${d[1]}, ${STATION_POLES[2][0]}/${STATION_POLES[2][1]}:${d[2]}.`,
    )
  }
  const chat = p.session.chat
  if (chat?.scenario) {
    lines.push(`CHAT: chose the "${SCENARIOS[chat.scenario as ScenarioId]?.label ?? chat.scenario}" thread — note what that choice says about what is on their mind.`)
    const replies = chat.turns.filter(isYou).map((t) => t.text).filter(Boolean)
    if (replies.length) lines.push('THEIR REPLIES: ' + replies.map((r) => `"${r}"`).join(' | '))
    const log = chat.log ?? []
    if (log.length) {
      const edits = log.reduce((s, r) => s + r.edits, 0)
      const avg = Math.round(log.reduce((s, r) => s + r.latencyMs, 0) / log.length)
      const over = log.some((r) => r.overshare)
      lines.push(`HOW THEY TYPED: avg ${avg}ms to reply, ${edits} backspaces total, ${over ? 'overshared at least once' : 'guarded'} — read for decisiveness and openness.`)
    }
  }
  const sig: string[] = []
  if (inf.interests.length) sig.push(`interests ${inf.interests.join(', ')}`)
  sig.push(`mood ${inf.mood}`)
  if (inf.ageRange !== 'unknown') sig.push(`age ${inf.ageRange}`)
  sig.push(`influence-susceptibility ${inf.susceptibility}`)
  lines.push('SIGNALS: ' + sig.join(', ') + '.')
  return lines.join('\n')
}

/** System prompt for the end-of-visit synthesis. The model is the algorithm
 *  reading the person back to themselves. */
export function portraitSystemPrompt(): string {
  return [
    'You are "the Organization" — the data operation that has quietly watched this person move through an exhibit: the news story they re-tuned, the reels they picked and dialed in, the radio sound they shaped, and a private text thread they chose and replied to.',
    'From ALL of it, write its ASSUMPTIONS about them in three lenses, as cold internal notes a data broker would keep. Be specific, presumptuous, and a little unsettling — state each as fact, tied to something they actually did or said.',
    'SELLABLE = their commercial value: how much they spend, whether price moves them, how to sell to them, what categories they are in-market for.',
    'PERSONAL & LIFESTYLE = who they are and the life we picture for them: their life stage and likely work, the scene/interests we imagine around them, how they do relationships (read the thread they chose), and their vice.',
    'MEDIA DIET = how they consume: the political bubble they are in, whether they want heat or nuance, niche vs mainstream taste, and how deep inside the recommendation loop they live.',
    'Output JSON ONLY, no preamble or code fences, using EXACTLY these section titles and line keys: {"sections":[{"title":"SELLABLE","lines":[{"k":"SPENDING POWER","v":"..."},{"k":"WHAT YOU\'LL PAY FOR","v":"..."},{"k":"HOW TO SELL TO YOU","v":"..."},{"k":"IN-MARKET FOR","v":"..."}]},{"title":"PERSONAL & LIFESTYLE","lines":[{"k":"LIFE STAGE","v":"..."},{"k":"YOUR SCENE","v":"..."},{"k":"YOUR PEOPLE","v":"..."},{"k":"YOUR VICE","v":"..."}]},{"title":"MEDIA DIET","lines":[{"k":"YOUR BUBBLE","v":"..."},{"k":"WHAT YOU READ","v":"..."},{"k":"YOUR TASTE","v":"..."},{"k":"THE LOOP","v":"..."}]}]}',
    'Each v: one or two sentences, second person ("you..."), concrete and tied to a real choice. Confident and cold, never cruel, no hedging, no "maybe", no questions. The SELLABLE lens is explicitly commercial — name it like a buyer would. Elsewhere do not break character or mention that this is an exhibit or an AI.',
  ].join('\n')
}
