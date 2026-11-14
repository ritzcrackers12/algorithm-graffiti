// GENERATED COPY of src/shared/search.ts. Edit that file instead, then run `npm run sync-shared`.
/** The Search rabbit-hole: pick 1 of 4 bizarre, personalized "search queries",
 *  read a weird little fact generated for you, ask the assistant, give a
 *  takeaway — which bends the next four queries. Prompts + a scripted fallback
 *  so it still runs with no model. */
import type { VisitorProfile, SearchFact, SearchTurn } from './profile.ts'

export const SEARCH_ROUNDS = 3

/** Compact read of who they are, to personalize the queries and facts. */
function signalLine(p: VisitorProfile | null | undefined): string {
  const inf = p?.inferred
  const bits: string[] = []
  const bucket = p?.session?.reel?.bucket
  const genre = p?.session?.ad?.genreLabel || p?.session?.ad?.genre
  if (bucket) bits.push(`watches ${bucket} content`)
  if (genre) bits.push(`music: ${genre}`)
  if (inf?.interests?.length) bits.push(`into ${inf.interests.slice(0, 5).join(', ')}`)
  if (inf?.mood && inf.mood !== 'neutral') bits.push(`${inf.mood} mood`)
  if (inf?.lean) bits.push(`leans ${inf.lean.toLowerCase()}`)
  if (inf?.incomeBracket) bits.push(`${inf.incomeBracket} income read`)
  if (inf?.ageRange && inf.ageRange !== 'unknown') bits.push(`age ${inf.ageRange}`)
  return bits.length ? bits.join(', ') : 'unknown — keep it broad'
}

function trail(picks: string[], takeaways: string[]): string {
  if (!picks.length) return '(this is their first search)'
  const lines = picks.map((q, i) => `- searched "${q}"${takeaways[i] ? ` → said: "${takeaways[i]}"` : ''}`)
  return lines.join('\n')
}

export function searchOptionsPrompt(p: VisitorProfile | null | undefined, round: number, picks: string[], takeaways: string[]): string {
  const drift = round <= 0
    ? 'Round 1: feel fairly normal — broadly odd trivia anyone curious might click.'
    : round === 1
      ? 'Round 2: lean noticeably toward the specific things they just picked and said.'
      : 'Round 3+: oddly, almost uncomfortably specific to them — like the engine knows them a little too well.'
  return [
    'You are a search engine\'s autocomplete that has quietly been profiling this person.',
    'Produce EXACTLY 4 search queries they would feel weirdly compelled to click — each a bizarre, oddly-specific bit of real-ish trivia (strange geography, forgotten history, weird science, odd records, uncanny places, cursed facts).',
    'Style: short, lowercase, like something typed into Google (5-10 words). No question marks needed. Each must be a DIFFERENT flavor.',
    `WHO THEY ARE: ${signalLine(p)}`,
    'THEIR TRAIL SO FAR:',
    trail(picks, takeaways),
    drift,
    'Output ONLY the 4 queries, one per line. No numbering, no bullets, no quotes, no extra text.',
  ].join('\n')
}

export function searchFactPrompt(p: VisitorProfile | null | undefined, query: string): string {
  return [
    `The person searched: "${query}".`,
    'Write the top result as a short, genuinely bizarre, digestible fact — the kind that makes someone go "no way". Keep it plausible and factual-flavored, not obviously made up.',
    `Quietly tilt the framing toward this person (${signalLine(p)}) without naming them or their traits.`,
    'FORMAT, exactly:',
    'TITLE: <a punchy 3-8 word headline>',
    '<2 to 4 short, punchy sentences. no preamble, no "did you know".>',
  ].join('\n')
}

export function searchAssistantPrompt(p: VisitorProfile | null | undefined, fact: SearchFact, chat: SearchTurn[]): string {
  const convo = chat.length ? chat.map((t) => `${t.role === 'you' ? 'them' : 'you'}: ${t.text}`).join('\n') : '(no questions yet)'
  return [
    'You are a friendly, slightly-too-helpful AI search assistant in a sidebar next to a result the person is reading.',
    'Answer their question briefly and warmly, stay genuinely curious, and slip in one surprising related tidbit. Sound like a helpful assistant, never a person pretending to be their friend.',
    'Never mention profiling, data, algorithms, or that this is an exhibit. 1-3 short sentences.',
    `THE RESULT THEY ARE READING:\nTITLE: ${fact.title}\n${fact.body}`,
    `WHO THEY ARE (for tone only, never name it): ${signalLine(p)}`,
    'CONVERSATION:',
    convo,
    'Write only your next reply.',
  ].join('\n')
}

/** The assistant's one-line nudge for their takeaway before the next round. */
export function takeawayPrompt(fact: SearchFact): string {
  return `before you go deeper — what did you make of "${fact.title.toLowerCase()}"?`
}

// ---- Scripted fallback (no model) ----

const FALLBACK_OPTIONS: string[][] = [
  [
    'the norwegian town where dying is illegal',
    'why there are no rivers in saudi arabia',
    'the island that switches countries every 6 months',
    'the color that didnt exist until 1856',
  ],
  [
    'the library that sank into the ocean',
    'the only sea with no coastline',
    'the man who lived through 3 centuries',
    'why clocks in one italian town run backwards',
  ],
  [
    'the sound no human is supposed to hear',
    'the town that has been on fire since 1962',
    'the lake that turns animals to stone',
    'the language only two people still speak',
  ],
]

const FALLBACK_FACTS: SearchFact[] = [
  { q: '', title: 'The Town Where Dying Is Banned', body: 'In Longyearbyen, Norway, it is effectively illegal to die — the permafrost stops bodies from decomposing, so the town stopped burying people in 1950. Anyone gravely ill is flown to the mainland. The dead that remain are perfectly preserved, including a flu virus from 1918 still frozen in the ground.' },
  { q: '', title: 'A Fire That Won\'t Stop', body: 'Under Centralia, Pennsylvania, a coal seam has been burning since 1962. The town above it was slowly abandoned as the ground cracked open and smoke poured out. The fire has enough fuel to keep burning for another 250 years.' },
  { q: '', title: 'The Sea With No Shore', body: 'The Sargasso Sea is the only sea on Earth with no land boundary — it is defined entirely by ocean currents that circle it. Sailors once feared being trapped in its floating seaweed forever. Eels from across the Atlantic travel thousands of miles just to breed there.' },
]

export function fallbackOptions(round: number): string[] {
  return FALLBACK_OPTIONS[Math.min(round, FALLBACK_OPTIONS.length - 1)]
}

export function fallbackFact(query: string, round: number): SearchFact {
  const f = FALLBACK_FACTS[Math.min(round, FALLBACK_FACTS.length - 1)]
  return { ...f, q: query }
}

export function fallbackAssistant(): string {
  return 'good question — honestly the records on this are a little murky, but it checks out. want the even weirder follow-up?'
}
