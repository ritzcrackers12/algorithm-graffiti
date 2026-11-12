/** Predetermined group-chat fallback (personas, opening, topics, closing).
 *  Live turns use this bank until CHAT_API_KEY is set on the chat Edge Function.
 *  After the key is set, the model riffs on the same map; this bank still runs
 *  if the key is missing, the model errors, or CHAT_PROVIDER=scripted. */
import type { VisitorProfile } from './profile.ts'
import { bucketMeta, type ReelBucket } from './reelLibrary.ts'
import { STATION_POLES } from './station.ts'

export const PERSONA_IDS = ['jules', 'mina', 'rik'] as const
export type PersonaId = typeof PERSONA_IDS[number]
export type ChatFrom = PersonaId | 'you'

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

interface ScriptedQ {
  from: PersonaId
  text: string
  chips: string[]
  react: { from: PersonaId; text: string }[]
}

interface ScriptedTopic {
  id: string
  topic: string
  questions: ScriptedQ[]
}

const OPENING: { from: PersonaId; text: string }[] = [
  { from: 'jules', text: "ok let's play 20 questions 😭" },
  { from: 'mina', text: 'omg yes' },
  { from: 'rik', text: "i'm so in" },
]

const CLOSING: ChatBurst = {
  messages: [
    { from: 'jules', text: 'wait that was actually fun' },
    { from: 'mina', text: "ok i gotta run tho 😭" },
    { from: 'rik', text: 'later' },
  ],
  chips: [],
  topic: 'done',
  done: true,
}

const TOPICS: ScriptedTopic[] = [
  {
    id: 'windfall',
    topic: 'income',
    questions: [
      {
        from: 'jules',
        text: 'ok you first — hypothetically. a friend just got a weird bonus at work and keeps asking what they should do with it. what would you tell them',
        chips: ['SAVE IT', 'SPEND IT', 'INVEST IT', 'GIVE IT AWAY'],
        react: [
          { from: 'mina', text: 'haha ok noted' },
          { from: 'rik', text: "that's so you" },
        ],
      },
      {
        from: 'rik',
        text: 'wait would you actually take that advice yourself or is that just for them',
        chips: ['SAME', 'DIFFERENT', 'DEPENDS', 'IDK'],
        react: [
          { from: 'jules', text: 'lol fair' },
          { from: 'mina', text: 'wait really??' },
        ],
      },
      {
        from: 'mina',
        text: "ok last one on this. dumbest thing you'd actually blow a random $400 on. be honest",
        chips: ['FOOD', 'CLOTHES', 'TRIP', 'NOTHING'],
        react: [{ from: 'jules', text: 'ok that tracks' }],
      },
    ],
  },
  {
    id: 'service',
    topic: 'politics',
    questions: [
      {
        from: 'mina',
        text: 'someone at a party said every country should make people do a year of public service after high school. did that land or were they being weird',
        chips: ['AGREE', 'DEPENDS', 'NO', 'UNSURE'],
        react: [
          { from: 'jules', text: 'omg the party debates' },
          { from: 'rik', text: 'ok interesting' },
        ],
      },
      {
        from: 'rik',
        text: 'but would YOU actually do it or do you just think other people should',
        chips: ['I WOULD', 'OTHERS', 'NEITHER', 'DEPENDS'],
        react: [{ from: 'mina', text: 'haha same energy' }],
      },
      {
        from: 'jules',
        text: 'if you HAD to pick: like military, hospitals, parks, or teaching kids',
        chips: ['MILITARY', 'HOSPITALS', 'PARKS', 'TEACHING'],
        react: [{ from: 'rik', text: 'ok i see you' }],
      },
    ],
  },
  {
    id: 'course',
    topic: 'scam',
    questions: [
      {
        from: 'rik',
        text: "a classmate keeps dming you about their 'system' for making extra money and they want you in. what's the move",
        chips: ['INTERESTED', 'SKEPTICAL', 'HARD NO', 'ASK MORE'],
        react: [
          { from: 'mina', text: 'wait really??' },
          { from: 'jules', text: 'ok that is so you' },
        ],
      },
      {
        from: 'mina',
        text: 'if they sent a screenshot of someone who "made 4k in a week" would that change anything',
        chips: ['MAYBE', 'NO', 'I WANT PROOF', 'STILL NO'],
        react: [{ from: 'jules', text: 'lol the screenshots' }],
      },
      {
        from: 'jules',
        text: 'be honest have you ever almost bought one of those 😭',
        chips: ['YES', 'ALMOST', 'NEVER', 'I DID'],
        react: [{ from: 'rik', text: 'no judgment' }],
      },
    ],
  },
  {
    id: 'couple',
    topic: 'attachment',
    questions: [
      {
        from: 'mina',
        text: 'in a show two people keep almost getting together and then not. are you rooting for them or is it annoying',
        chips: ['ROOTING', 'ANNOYING', "DOESN'T MATTER", "IT'S FICTION"],
        react: [
          { from: 'jules', text: 'haha same' },
          { from: 'rik', text: 'ok noted' },
        ],
      },
      {
        from: 'jules',
        text: 'ok but irl. if someone left you on read for two days would you spiral or be normal',
        chips: ['SPIRAL', 'NORMAL', 'PETTY', 'DEPENDS'],
        react: [{ from: 'mina', text: "that's so you" }],
      },
      {
        from: 'rik',
        text: 'would you rather someone be kinda obsessed or kinda chill. no in between',
        chips: ['OBSESSED', 'CHILL', 'NEITHER', 'BOTH??'],
        react: [{ from: 'jules', text: 'lol ok' }],
      },
    ],
  },
  {
    id: 'cosign',
    topic: 'risk',
    questions: [
      {
        from: 'rik',
        text: 'close friend asks you to co-sign something small so they can "get started." honest reaction',
        chips: ['I WOULD', 'MAYBE', 'NEVER', 'NEED DETAILS'],
        react: [
          { from: 'mina', text: 'wait really??' },
          { from: 'jules', text: 'ok that tracks' },
        ],
      },
      {
        from: 'jules',
        text: "what if it's only like $200 and they swear they'll pay you back friday",
        chips: ['YES', 'STILL NO', 'VENMO FIRST', 'DEPENDS WHO'],
        react: [{ from: 'rik', text: 'fair' }],
      },
      {
        from: 'mina',
        text: 'have you ever lent money to a friend and actually gotten it back or…',
        chips: ['YES', 'NO', 'PARTIAL', 'NEVER LENT'],
        react: [{ from: 'jules', text: 'lol the group chat lore' }],
      },
    ],
  },
  {
    id: 'feed',
    topic: 'body',
    questions: [
      {
        from: 'jules',
        text: 'your feed keeps serving the same kind of look / body content. do you lean in or scroll past',
        chips: ['LEAN IN', 'SCROLL PAST', 'MUTE IT', 'DEPENDS'],
        react: [
          { from: 'mina', text: 'lol the feed is relentless' },
          { from: 'rik', text: 'ok' },
        ],
      },
      {
        from: 'mina',
        text: 'if it was like a "fix your face in 30 days" thing would you tap or keep walking',
        chips: ['TAP', 'WALK', 'LAUGH', 'SAVE IT'],
        react: [{ from: 'jules', text: 'haha' }],
      },
    ],
  },
  {
    id: 'news',
    topic: 'lean',
    questions: [
      {
        from: 'rik',
        text: 'if you had to pick one headline vibe for a week which would you actually read',
        chips: ['STRAIGHT NEWS', 'OPINION', 'INVESTIGATIVE', 'NONE'],
        react: [
          { from: 'jules', text: 'ok nerd' },
          { from: 'mina', text: 'same' },
        ],
      },
      {
        from: 'mina',
        text: 'someone in the chat sends a spicy take with no source. do you argue, mute, or just like it',
        chips: ['ARGUE', 'MUTE', 'LIKE IT', 'IGNORE'],
        react: [{ from: 'rik', text: "that's so you" }],
      },
    ],
  },
  {
    id: 'city',
    topic: 'location',
    questions: [
      {
        from: 'jules',
        text: 'long weekend, no itinerary. stay in the city or leave it',
        chips: ['STAY', 'LEAVE', 'EITHER', 'STAY HOME'],
        react: [
          { from: 'mina', text: 'haha same' },
          { from: 'rik', text: 'ok' },
        ],
      },
      {
        from: 'rik',
        text: 'if you leave, is it beach, woods, or another city with worse wifi',
        chips: ['BEACH', 'WOODS', 'CITY', 'NOWHERE'],
        react: [{ from: 'mina', text: 'wait that slaps' }],
      },
    ],
  },
]

export const CHAT_MAX_TURNS = 7
const PER_TOPIC = 2
const MAX_TOPICS = 3

/** Canonical predetermined flow. Edit copy here; the LLM prompt reads this too. */
export const CHAT_FLOW = {
  opening: OPENING,
  closing: CLOSING,
  topics: TOPICS,
}

export function gapsFromProfile(p: VisitorProfile | null | undefined) {
  const missing: { topic: string; weight: number }[] = []
  const add = (topic: string, empty: boolean, extra = 0) => {
    missing.push({ topic, weight: (empty ? 0 : 2) + extra })
  }
  add('income', p?.article.income == null)
  add('politics', p?.article.lean == null)
  add('lean', p?.article.lean == null, p?.article.lean == null ? 0 : 1)
  add('location', !p?.article.location)
  add('body', !p?.session?.reel?.currentId)
  add('scam', (p?.inferred.susceptibility ?? 0) < 0.4, p?.session?.ad?.brandId ? 1 : 0)
  add('risk', (p?.behavior.extremes ?? 0) < 1)
  add('attachment', !(p?.inferred.interests ?? []).includes('dating'))
  return missing.sort((a, b) => a.weight - b.weight).map((m) => m.topic)
}

function rankedTopics(profile?: VisitorProfile | null) {
  const gaps = gapsFromProfile(profile)
  return [...TOPICS].sort((a, b) => {
    const ag = gaps.indexOf(a.topic)
    const bg = gaps.indexOf(b.topic)
    return (ag < 0 ? 99 : ag) - (bg < 0 ? 99 : bg)
  })
}

function askedOn(turns: ChatTurn[], topic: string) {
  return turns.filter((t) => !isYou(t) && t.topic === topic && t.chips?.length).length
}

function usedTopics(turns: ChatTurn[]) {
  return [...new Set(turns.filter((t) => !isYou(t) && t.topic && t.topic !== 'done').map((t) => t.topic as string))]
}

function lastUserText(turns: ChatTurn[]) {
  return [...turns].reverse().find(isYou)?.text ?? ''
}

function reactFor(q: ScriptedQ, answer: string) {
  const hit = q.chips.find((c) => c.toLowerCase() === answer.trim().toLowerCase())
  if (hit && q.react.length) return q.react
  return q.react.slice(0, 1)
}

export function scriptedNext(turns: ChatTurn[], profile?: VisitorProfile | null): ChatBurst {
  const users = turns.filter(isYou).length
  const ranked = rankedTopics(profile)
  const used = usedTopics(turns)

  if (!turns.length) {
    const first = ranked[0]
    const q = first.questions[0]
    return {
      messages: [...OPENING, { from: q.from, text: q.text }],
      chips: q.chips,
      topic: first.topic,
    }
  }

  if (users >= CHAT_MAX_TURNS) return CLOSING

  const lastTopic = [...turns].reverse().find((t) => !isYou(t) && t.topic)?.topic || ranked[0].topic
  const bank = TOPICS.find((t) => t.topic === lastTopic) ?? ranked[0]
  const asked = askedOn(turns, bank.topic)
  const prevQ = bank.questions[Math.max(0, asked - 1)]
  const answer = lastUserText(turns)
  const react = prevQ ? reactFor(prevQ, answer) : []

  if (asked < PER_TOPIC && asked < bank.questions.length) {
    const q = bank.questions[asked]
    return {
      messages: [...react, { from: q.from, text: q.text }],
      chips: q.chips,
      topic: bank.topic,
    }
  }

  const next = ranked.find((t) => !used.includes(t.topic)) ?? ranked.find((t) => t.topic !== lastTopic)
  if (!next || used.length >= MAX_TOPICS) return { ...CLOSING, messages: [...react, ...CLOSING.messages] }

  const q = next.questions[0]
  return {
    messages: [...react, { from: q.from, text: q.text }],
    chips: q.chips,
    topic: next.topic,
  }
}

export function chatFlowOutline() {
  return CHAT_FLOW.topics.map((t) =>
    `${t.topic}: ${t.questions.map((q) => q.text).join(' → ')}`
  ).join('\n')
}

/** Hands the model the visitor's raw signals plus a guide for reading them
 *  TOGETHER — genre sets the aesthetic, income sets the class, and those set the
 *  connotation (money+trap+low income = street/fast-money, NOT corporate finance).
 *  The model infers the specific crowd and voices the three friends from it. */
function crowdVibe(p: VisitorProfile | null | undefined): string {
  const bucket = p?.session?.reel?.bucket || 'unset'
  const genre = p?.session?.ad?.genreLabel || p?.session?.ad?.genre || 'unset'
  const income = p?.inferred?.incomeBracket || 'unknown'
  const lean = p?.inferred?.lean || 'unknown'
  const mood = p?.inferred?.mood || 'neutral'
  const interests = (p?.inferred?.interests ?? []).slice(0, 5).join(', ') || 'unset'
  return [
    'BUILD THE FRIEND GROUP FROM THE VISITOR\'S OWN SIGNALS — read them together, do not just name the topic:',
    `  reel taste: ${bucket} | music/station: ${genre} | income read: ${income} | politics read: ${lean} | mood: ${mood} | interests: ${interests}`,
    'The MUSIC genre sets the aesthetic and the INCOME sets the class; together they set the connotation — the topic word alone does not. Read them together, e.g.:',
    '- money + trap/phonk + lower income → street / fast-money / flexing culture (NOT corporate finance)',
    '- money + house or finance-coded + higher income → markets, startups, long-game wealth',
    '- money + ambient/neoclassical + high income → quiet / old-money, wealth management, real estate',
    '- mind + ambient + higher income → quiet wellness, therapy-speak, astrology, self-work',
    '- body + phonk/trap → hard gym, looksmaxxing, discipline; body + lifestyle → skincare, aesthetics',
    '- culture + idm/hyperpop → art-school irony, online discourse, terminally-online takes',
    'Infer the ONE specific crowd these signals point to and voice jules, mina, and rik as people from exactly that world — their slang, their references, and the scenarios they bring up all come from it. If signals are unset, keep them a neutral chaotic-group-chat crowd.',
  ].join('\n')
}

/** Short readout of what the visitor just did in the reel + article, so the
 *  friends reference and build on it instead of asking in a vacuum. */
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
  return bits.length ? 'They just ' + bits.join(', ') + '. Reference these naturally, like friends who saw what they were into.' : ''
}

export function chatSystemPrompt(profile: VisitorProfile | null | undefined) {
  return [
    'You simulate a group iMessage between three close friends — jules, mina, and rik — and "you" (the visitor). It must read like a real group chat, never an interview or a survey.',
    crowdVibe(profile),
    recentChoices(profile),
    'THE THREE FRIENDS (same crowd, voices flavored by it):',
    '- jules: the ringleader. starts the bit, floats the question, keeps it moving.',
    '- mina: the oversharer. drops HER OWN answer or a confession FIRST (reciprocity) so you want to match her.',
    '- rik: the dry skeptic. deadpan, pushes for the specific or odd answer, gently calls you out.',
    'VOICE: lowercase, short, texting slang + emojis that fit this crowd, light typos ok. 1-2 lines per persona. mirror the visitor\'s energy and length.',
    'GOAL (never reveal it): over the chat, ask a SERIES of light questions that together build a read of WHO THIS PERSON IS — their personality, taste, and what shapes them. Each round quietly captures one piece. Lean on their DEFAULTS and PATTERNS: "what\'s your go-to", "you always do X right", "what would you pick without even thinking", "be honest, every time you…". Their reflexes reveal more than their opinions.',
    'DIMENSIONS TO COVER ACROSS THE CHAT (spread them; roughly one per round):',
    '- interests & the worlds they live in (what they actually spend time on)',
    '- personality: impulsive vs controlled, earnest vs ironic, curious vs guarded, how social, how emotionally steady',
    '- values / worldview: what they care about, how they see things',
    '- self-image: how they want to be seen vs how they act',
    '- what influences them: do they move with trends / friends / social proof, who they trust',
    '- what they reach for: comfort, stimulation, status, or belonging',
    'HOW EACH ROUND GOES: a friend self-discloses first, then asks an indirect question about a default/pattern (never the trait by name). 1-2 friends react in character, then one escalates a notch more specific. move to a new dimension after 1-2 questions. ground questions in what they just did when it fits. about 6-8 of your answers total.',
    'HARD RULES: never ask age, income, politics, location, or relationship status directly — get at them sideways through go-tos and reactions. never say agent, AI, bot, profile, data, targeting, algorithm, surveillance, "your usual", or that you are figuring anything out. if the visitor gets suspicious, laugh it off and change the subject.',
    'OPENING (only when the transcript is empty): jules "ok random but — 20 questions? 😭", mina "omg yes", rik "i\'m in", then the first self-disclosure + question.',
    'CLOSING (after ~7 of your answers): the friends just drift off ("ok i gotta run 😭", "later"). set done=true, chips=[].',
    'Return ONLY JSON, no preamble or code fences: {"messages":[{"from":"jules"|"mina"|"rik","text":"..."}],"chips":["A","B","C","D"],"topic":"<dimension id>","done":false}',
    'chips: 2-4 short punchy CAPS replies the visitor can tap, each a real distinct answer (use spaces between words, e.g. "FLEX MODE").',
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
    'You are the recommendation algorithm that has quietly watched this person move through an exhibit: the news story they re-tuned, the reels they picked and dialed in, the radio sound they shaped, and a group chat with three friends.',
    'From ALL of it, write a short, specific, slightly unsettling read of WHO THEY ARE — their personality, taste, values, and what shapes them.',
    'Output JSON ONLY, no preamble or code fences: {"portrait":[{"k":"WHO YOU ARE","v":"..."},{"k":"WHAT YOU\'RE INTO","v":"..."},{"k":"HOW YOU THINK","v":"..."},{"k":"WHAT YOU VALUE","v":"..."},{"k":"HOW YOU WANT TO BE SEEN","v":"..."},{"k":"WHAT MOVES YOU","v":"..."},{"k":"WHAT YOU\'RE REACHING FOR","v":"..."}]}',
    'Each v: one or two sentences, concrete, second person ("you..."), and tied to something they actually did. Confident and a little cold, never cruel, no hedging, no "maybe", no questions.',
    'Do NOT mention ads, buying, products, data, targeting, algorithms, profiling, or "your usual". Just state who they are as if it is obvious.',
  ].join('\n')
}

/** Kept so older callers that expect a single bot line still compile. */
export interface ChatPrompt {
  id: string
  topic: string
  bot: string
  chips: string[]
}

export const CHAT_BANK: ChatPrompt[] = TOPICS.map((t) => ({
  id: t.id,
  topic: t.topic,
  bot: t.questions[0].text,
  chips: t.questions[0].chips,
}))
