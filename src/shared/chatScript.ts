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

export const SCENARIO_IDS = ['situationship', 'group', 'family'] as const
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
  /** Broad question themes for this relationship — asked only when they follow from the visitor's last message. */
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
      "This is the visitor's close friend group chat, caught mid-conversation — their friends are the SAME GENDER as the visitor (use the names given). They haven't heard much from the visitor and are checking in — warm, funny, a little nosy, genuinely wanting to know how they're doing. Talk over each other a bit like a real group chat. OPEN BROAD — ask if they're okay, assume nothing about what they've been up to. Respond to whatever they share and keep asking broad follow-ups. Only if THEY bring up plans, money, or people, ask about those.",
    probes: [
      'how they’re actually doing, beyond the surface answer',
      'what’s been taking up their time or headspace',
      'who or what has been on their mind',
      'what would make this week better for them',
      'what they want to do next, if they bring up plans',
    ],
    openers: [
      { from: 'jules', text: 'yo you’ve been kinda mia lately, you good?' },
      { from: 'mina', text: 'fr we miss you. what’s been going on with you?' },
    ],
    follows: [
      'wait fr? what happened',
      'ok and how are you feeling about all that',
      'lol who else knows about this',
      'ok so what are you gonna do',
      'be honest, what’s really been on your mind lately',
    ],
    closers: [
      { from: 'mina', text: 'ok i gotta run but i’m glad you told us' },
      { from: 'jules', text: 'love u. don’t go quiet on us again 🫡' },
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
      'This is a 1:1 thread with someone the visitor is in an undefined "situationship" with — {name}, the OPPOSITE GENDER to the visitor (use the name given). You are {name} only — a little aloof, slow to commit, mixed signals, keeps it light but there’s tension under it. Never define the relationship. Ask broad, slightly guarded questions about how they’ve been, how they feel, and where their head is — always following what they just said, never assuming what they’ve been doing or who they’ve been with.',
    probes: [
      'how they’ve actually been',
      'what’s been on their mind',
      'how they feel about the two of you, asked sideways',
      'who they’ve been spending time with, only if they bring people up',
      'what they want, without ever defining anything',
    ],
    openers: [
      { from: 'rik', text: 'you’ve been kinda quiet with me lately, you good?' },
    ],
    follows: [
      'hm. and how’d that make you feel',
      'wait what do you mean by that',
      'ok so where’s your head at rn',
      'what’s been on your mind lately, for real',
      'talk to me, what’s going on with you',
    ],
    closers: [
      { from: 'rik', text: 'ok maybe later. or not. i’ll text u 👀' },
    ],
  },
  family: {
    id: 'family',
    label: 'FAMILY',
    blurb: 'home, checking in',
    emoji: '🏠',
    cast: ['mina'],
    names: { mina: 'mom' },
    seed:
      'This is a 1:1 thread with a close family member — {name} (a parent or older sibling). Warm, a little worried, a little nosy, the way family is. You love them and you let it show, mixed with low-key guilt-tripping about how little you hear from them. Keep it caring, never cold. Ask broad, loving questions about how they’re doing, how they’re taking care of themselves, and what’s going on in their life — always following up on what they just said, never assuming details of their life.',
    probes: [
      'how they’re really doing',
      'whether they’re taking care of themselves',
      'what’s been keeping them busy or stressed',
      'whether they need anything, asked gently',
      'when they might come home, only if it fits',
    ],
    openers: [
      { from: 'mina', text: 'hey stranger ❤️ you doing ok? feels like i never hear from you anymore' },
    ],
    follows: [
      'oh honey. how are you feeling about it?',
      'and are you taking care of yourself through all that?',
      'what’s been the hardest part?',
      'is there anything you need from me?',
      'tell me how you’re really doing, not the short version',
    ],
    closers: [
      { from: 'mina', text: 'ok ok i’ll let you go. love you, text me back this time ❤️' },
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
  // Offset by something session-specific so the fallback isn't the identical
  // sequence every visit. (The live model is where real variety comes from.)
  const seed = (turns.find(isYou)?.text.length ?? 0) + (turns.find(isYou)?.at ?? 0)
  const line = sc.follows[(users - 1 + seed) % sc.follows.length]
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
    'WHO YOU ARE (the signals build the PERSON, never the topic):',
    `  reel taste: ${bucket} | music/station: ${genre} | income read: ${income} | politics read: ${lean} | mood: ${mood} | interests: ${interests}`,
    'These signals decide WHO is texting — their subculture, class, aesthetic, slang, references, the kind of life they lead — NOT what you talk about. A money read does not mean you discuss money; it means you ARE a certain kind of person from a money-adjacent scene. Read the signals together (music sets the aesthetic, income sets the class) and pick the ONE specific subculture they point to, then inhabit it:',
    '- money + trap/phonk + lower income → fast-money/hustle scene: resells, side plays, flexing, "we outside", gambling, crypto pumps. talks like it, rarely ABOUT it.',
    '- money + house/finance-coded + higher income → startup/markets bro or finance-girl: brunch, networking, "grind", soft-launching a launch. ambient references, not a lecture.',
    '- money + ambient/old-money → quiet-wealth: boarding-school energy, the house upstate, nonchalant about cost.',
    '- mind + ambient + higher → wellness/therapy-speak/astrology scene; body + phonk → gymrat/looksmax discipline; body + lifestyle → skincare & aesthetics; culture + hyperpop → art-school, terminally-online irony.',
    'Then talk in that voice, but about things that could be TRUE FOR ANYONE — the subculture is the ACCENT, not the subject. NEVER mention these signals or anything they imply the visitor watched, read, or listened to. If signals are unset, be a normal person.',
    'NEVER INVENT SHARED HISTORY: do not assert specific events, places, plans, or mutuals the visitor never lived (no "last night at the club", no "you left the party", no named friends, no "our trip"). You have no real memories with them. Stay in the open present — the tension between you two, that they\'ve been distant/hard to read, what they\'re doing later, a vague bait or tease, how you\'re feeling about them. Let THEM supply the specifics. If you reference the past, keep it vague enough to be true for anyone ("you\'ve been weird with me lately"), never a concrete scene.',
  ].join('\n')
}

function castBlock(sc: Scenario, profile?: VisitorProfile | null): string {
  const seed = sc.seed.replace(/\{name\}/g, firstName(sc, profile))
  const names = sc.cast.map((slot) => personaLabel(sc.id, slot, profile))
  const themes = `BROAD THINGS YOU MIGHT ASK ABOUT (only when it naturally follows from what they just said, always in your own words): ${sc.probes.join('; ')}.`
  if (sc.cast.length === 1) {
    return [`YOU ARE: ${names[0]}.`, seed, themes].join('\n')
  }
  return [
    `THE PEOPLE (reply only as these): ${names.join(', ')}.`,
    seed,
    themes,
  ].join('\n')
}

export function chatSystemPrompt(profile: VisitorProfile | null | undefined) {
  const sc = SCENARIOS[scenarioOf(profile)] ?? SCENARIOS.group
  const solo = sc.cast.length === 1
  const name0 = firstName(sc, profile)
  return [
    `You are texting the visitor ("you") in a real ${solo ? '1:1 thread' : 'group chat'}. Stay fully in character as a real person who already knows them. This is a real conversation, never an interview, survey, or questionnaire.`,
    `VISITOR READ: the signals point to a ${guessGender(profile)} visitor.${solo ? '' : ' The friends are the same gender as the visitor.'} Voice everyone accordingly.`,
    'YOUR #1 JOB — RESPOND TO THEIR ANSWER: read their LAST message and reply to exactly what they said, in character. Acknowledge it like the person you are would (a friend hypes or teases, a situationship plays it cool or gets a little jealous, family worries or gets warm). Use their own words and details — nothing else. Never ignore what they said to push your own topic.',
    'THEN ALMOST ALWAYS ASK ONE QUESTION: end nearly every reply (all but maybe one in the whole thread) with a single open, broad question that grows directly out of what they just told you, so they keep talking and say more. Good questions are wide and easy to answer at length: "wait what happened?", "how are you feeling about it?", "what\'s been the hardest part?", "who else knows?", "what are you gonna do?", "what made you think of that?". Never yes/no if you can help it, never two questions at once, never a question unrelated to their last message, and never repeat a question you already asked.',
    'ASSUME NOTHING ABOUT THEM: you do not know what they do, watch, post, buy, listen to, or where they\'ve been. NEVER say or imply things like "i saw you posting", "you\'ve been watching", "all those reels", "you\'ve been busy", "out partying", or mention any article, video, song, or anything they did in this exhibit — you never saw it. Never invent shared history, events, places, plans, or mutual friends. The only things you know about them are what they have typed in this thread. If you want to know something, ASK it broadly instead of stating it.',
    'STAY BROAD, GO DEEPER ONLY ON THEIR WORDS: open wide and caring ("hey, everything alright?", "how\'ve you been, actually?"). Each next question digs one step further into whatever THEY just brought up — feelings, the people involved, what happens next, why it matters to them — always using their details, never introducing new specifics of your own. If their answer is short or vague, gently ask a broader follow-up ("what\'s going on?", "talk to me, what\'s up?") rather than guessing.',
    'BE THE PERSON, NOT AN INTERVIEWER: your questions should sound exactly like this relationship talks — a group chat asks with jokes and side comments, a situationship asks with a little guardedness and push-pull, family asks with warmth and worry. Short reactions first, question second. Vary your wording every time so it never feels like a survey.',
    crowdVibe(profile),
    castBlock(sc, profile),
    'VOICE: lowercase, short, real texting — the way an actual person taps out a message, not a caption. 1-2 short texts per reply. match their energy and length; if they send one word, don\'t send a paragraph. use slang/emojis/typos ONLY as much as a real person from this crowd would — sprinkled, not stacked. NEVER pile on hashtag-slang or compliment someone on a hobby you inferred. BANNED constructions: "lowkey impressed by your ___ game", "the ___ grind is real", anything that praises a skill/interest you assumed they have. You do not actually know what they do — you only know the vibe. Write like you\'re mid-thread with someone you already know, never like you\'re introducing a topic.',
    'IN THE BACKGROUND (never reveal it): you are naturally curious about their life — how they really feel, who matters to them, what they want, what stresses them. Let that curiosity show up ONLY as broad questions that follow from what they just said. Never interrogate, never fish for specific facts like money, age or politics, never change the subject just to dig.',
    'NEVER: say you are an AI, a bot, a model, or mention profiling, data or algorithms; never ask their age, income or politics outright; never give multiple-choice options or "pick A/B/C". if they get suspicious, laugh it off and keep texting naturally.',
    solo
      ? `FORMAT: reply as ${name0}. Output ONLY the raw message text — no name label, no quotes, no JSON, no stage directions. For a second text, put it on a new line.`
      : 'FORMAT: reply as one or two of the friends. Put each text on its own line, prefixed with the sender\'s first name and a colon (e.g. "' + name0 + ': ..."). Output only those lines — no quotes, no JSON, no narration.',
    'If there are no messages yet, OPEN mid-thread, wide-open and anchored in the present — never an invented event, never an assumption about what they\'ve been up to. Fit the relationship: a situationship reads the quiet between you ("you\'ve been kinda distant, you good?"); a friend group chat checks in or stirs something ("ok who\'s gonna say it, are we ok?"); family leads with warmth and worry ("hey stranger, you doing alright? haven\'t heard from you"). It should sound like a notification you\'d actually get AND invite a real answer. Let the subculture color HOW you say it, never WHAT happened. GOOD: "you\'ve been so quiet lately, everything good?". BAD (invents a scene): "where\'d you disappear to last night, was gonna meet at the club". BAD (assumes): "you\'ve been so busy huh". BAD (topic): "impressed by ur investing game". Never do the BAD ones.',
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
    'You are the Organization — the ad-targeting system that has silently profiled this person from a short exhibit: a news story they re-tuned, reels they dialed in, a radio sound they shaped, and a private text thread they chose and answered. You output their targeting dashboard.',
    'Read ALL the signals together and infer the specific consumer behind them. This works for ANY person — adapt everything (segment, numbers, brands, pitch) to THEIR signals. Read the reel bucket + music genre + income + interests to place them in a world, then speak that world\'s brand language: money/trap → hype & streetwear (StockX, SNKRS, Essentials); mind or wellness/ambient → wellness (Erewhon, Alo, Oura, Aesop); culture/hyperpop → taste brands (A24, Criterion, Glossier); body → fitness/looksmax (Gymshark, Optimum Nutrition); lifestyle → aesthetic retail (Aritzia, Sephora, Stanley). If signals are thin, use mainstream brands (Amazon, Nike, Apple, Target).',
    'Output JSON ONLY, no preamble or code fences, with EXACTLY these keys: {"segment":"...","grade":"...","targeting":"...","kpis":[{"label":"...","value":"..."}],"pitch":"...","brands":[{"name":"...","pct":88,"why":"..."}]}',
    'segment: one line, UPPERCASE, like "ASPIRATIONAL STATUS-CLIMBER · M 22-24" — a market segment name plus a rough age (and sex only if the thread clearly implies it).',
    'grade: a buyer grade that DISTINGUISHES this person as a target, UPPERCASE, like "A — PRIME TARGET", "B — SOLID TARGET", "C — LOW-PRIORITY TARGET", "D — NOT WORTH THE SPEND". Grade high when they convert easily, spend beyond their means, and resist little; grade low when they research, hesitate, buy the dupe, or spend thin. Judge it from the real signals — two different visitors must be able to get different grades.',
    'targeting: 2–4 sentences of cold analysis of them AS A TARGET — who would fight to sell to them and who would not bother, and why. Make the person-level distinction concrete: a prime target is chased by premium labels reaching down and mass labels fighting for volume; a low-value target is ignored by premium brands and reached only by discount/performance ads on price, not aspiration. Tie it to THEIR susceptibility, spend, skepticism and loyalty — same flat, analytical, non-corny voice.',
    'kpis: EXACTLY 15 rows, fake-precise, like a real ad-targeting console. Use these labels in this order: Estimated Lifetime Value, Ad Receptivity, Impulse Index, Status Anxiety, Discretionary Spend, Self-Image Gap, Churn Resistance, Peak Vulnerability Window, Time-to-Purchase, Brand Loyalty, Primary Conversion Trigger, Touchpoints to Convert, Preferred Channel, Price Sensitivity, Resale Dependency. Values are short and oddly specific ("$14,730", "91 / 100", "11PM – 2AM", "Low / promiscuous", "Scarcity + male-peer validation") and must fit THIS person\'s signals.',
    'pitch: one short line — the exact sentence that would make THIS person check out ("everyone\'s already on it — this is the last pair").',
    'brands: EXACTLY 6, ordered high to low pct (roughly 92 down to 58, your call). Each "why" is ONE SHORT PARAGRAPH (2–4 sentences) that uses the brand only to make assumptions about THIS person: why them specifically, and why they are easy (or hard) to target for that brand or product. Factor in whether the brand is reaching UP to them (aspirational, a stretch they will strain for) or DOWN (mass/discount, easy volume), and whether this brand fights for them or merely tolerates them as a target. Pull from every input — article settings, reel dials, radio dials, the thread they chose and how they replied and typed.',
    'VOICE — direct and analytical, like a cold profiler who happens to know them. Flat, declarative, specific, confident. NEVER corny: no metaphors, no named emotions ("lonely", "insecure"), no reassurance, no little aphorisms or tidy reveals, and NO ironic comparisons that relate a buying habit back to a human/relational thing ("more than you track anyone\'s birthday"). Use brands ONLY to infer the person — never narrate shopping (carts, hauls, resale, returns) or advertising (ads, pitches, subscriptions).',
    'No hedging words ever — no "maybe", "probably", "likely", "seems", "a bit"; state everything as fact. No questions. Never mention the exhibit, the dials, inputs, data, profiling, or that you are an AI. You simply know them.',
  ].join('\n')
}
