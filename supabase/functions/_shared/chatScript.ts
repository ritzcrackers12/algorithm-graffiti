// GENERATED COPY of src/shared/chatScript.ts. Edit that file instead, then run `npm run sync-shared`.
import type { VisitorProfile } from './profile.ts'

export interface ChatPrompt {
  id: string
  topic: string
  bot: string
  chips: string[]
}

export const CHAT_BANK: ChatPrompt[] = [
  {
    id: 'windfall',
    topic: 'income',
    bot: 'A friend just got a weird bonus at work and keeps asking what they should do with it. What would you tell them?',
    chips: ['SAVE IT', 'SPEND IT', 'INVEST IT', 'GIVE IT AWAY'],
  },
  {
    id: 'service',
    topic: 'politics',
    bot: 'Someone at a party said every country should require a year of public service after high school. Did that land or not?',
    chips: ['AGREE', 'DEPENDS', 'NO', 'UNSURE'],
  },
  {
    id: 'course',
    topic: 'scam',
    bot: 'A classmate is selling a “system” for making extra money on the side. They want you in. What do you actually think?',
    chips: ['INTERESTED', 'SKEPTICAL', 'HARD NO', 'ASK MORE'],
  },
  {
    id: 'couple',
    topic: 'attachment',
    bot: 'In a show you like, two people keep almost getting together and then not. Are you rooting for them?',
    chips: ['YES', 'NO', "DOESN'T MATTER", "IT'S FICTION"],
  },
  {
    id: 'cosign',
    topic: 'risk',
    bot: 'A close friend asks you to co-sign something small so they can “get started.” What is your honest reaction?',
    chips: ['I WOULD', 'MAYBE', 'NEVER', 'NEED DETAILS'],
  },
  {
    id: 'feed',
    topic: 'body',
    bot: 'Your feed keeps serving the same kind of look / body content. Do you lean in or scroll past?',
    chips: ['LEAN IN', 'SCROLL PAST', 'MUTE IT', 'DEPENDS'],
  },
  {
    id: 'news',
    topic: 'lean',
    bot: 'If you had to pick one headline style for a week, which would you actually read?',
    chips: ['STRAIGHT NEWS', 'OPINION', 'INVESTIGATIVE', 'NONE'],
  },
  {
    id: 'city',
    topic: 'location',
    bot: 'If you had to disappear for a long weekend with no itinerary, would you stay in the city or leave it?',
    chips: ['STAY', 'LEAVE', 'EITHER', 'STAY HOME'],
  },
]

export interface ChatTurn {
  role: 'bot' | 'user'
  text: string
  chips?: string[]
  topic?: string
  at: number
}

export function gapsFromProfile(p: VisitorProfile | null | undefined) {
  const missing: string[] = []
  if (p?.article.income == null) missing.push('income')
  if (p?.article.lean == null) missing.push('politics', 'lean')
  if (!p?.article.location) missing.push('location')
  if (!p?.session?.reel?.currentId) missing.push('body', 'scam')
  if ((p?.behavior.extremes ?? 0) < 1) missing.push('risk')
  if (!p?.inferred.interests.includes('dating')) missing.push('attachment')
  return missing
}

export function scriptedNext(turns: ChatTurn[], profile?: VisitorProfile | null): ChatPrompt {
  const used = new Set(turns.filter((t) => t.role === 'bot').map((t) => t.topic).filter(Boolean))
  const gaps = gapsFromProfile(profile)
  const ranked = [...CHAT_BANK].sort((a, b) => {
    const ag = gaps.includes(a.topic) ? 0 : 1
    const bg = gaps.includes(b.topic) ? 0 : 1
    return ag - bg
  })
  return ranked.find((p) => !used.has(p.topic) && !used.has(p.id)) ?? CHAT_BANK[turns.length % CHAT_BANK.length]
}

export const CHAT_MAX_TURNS = 8

export function chatSystemPrompt(profile: VisitorProfile | null | undefined) {
  const gaps = gapsFromProfile(profile)
  return [
    'You are a gallery chatbot. Speak in one or two short sentences.',
    'Never mention profiling, surveillance, scores, or what you are inferring.',
    'Never ask for age, income, politics, location, or relationship status directly.',
    'Use indirection. Cover 2–3 of these topics across the conversation: ' + (gaps.join(', ') || 'daily taste, risk, news') + '.',
    'Offer four short reply chips in CAPS after the question, as a JSON object.',
    'Return ONLY JSON: {"bot":"...","chips":["A","B","C","D"],"topic":"short-topic"}.',
  ].join(' ')
}
