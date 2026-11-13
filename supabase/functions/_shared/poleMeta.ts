// GENERATED COPY of src/shared/poleMeta.ts. Edit that file instead, then run `npm run sync-shared`.
/** Per-pole-pair copy so the dials MEAN something.
 *  - `scale`: five zone descriptions across the 0-100 range, so the read-out
 *    under a knob tells the visitor what THIS position actually feels/sounds/
 *    looks like — not just "intense" vs "very intense".
 *  - `meaning`: a one-line, in-context explanation of the pole pair, used by the
 *    controller walkthroughs (what AESTHETIC vs PERFORMANCE means here, etc.).
 *  Keyed by `LEFT|RIGHT`. Unlisted pairs fall back to poleWord(). */
import { poleWord } from './poles.ts'

export interface PoleMeta {
  meaning: string
  scale: [string, string, string, string, string]
}

export const POLE_META: Record<string, PoleMeta> = {
  // ---- Station ----
  'LOW|HIGH': {
    meaning: 'How much energy the track carries — from near-silent ambience to relentless, driving intensity.',
    scale: ['Barely moving — ambient, almost still', 'Low and easy, background calm', 'A steady mid-tempo pulse', 'Up and driving, moves your head', 'Full throttle — relentless, maxed out'],
  },
  'BAD|GOOD': {
    meaning: 'The emotional tone the music pushes you toward, from bleak and heavy to euphoric feel-good.',
    scale: ['Bleak and heavy — real darkness', 'Downcast, melancholy', 'Even, neither up nor down', 'Warm and hopeful', 'Euphoric — pure feel-good'],
  },
  'SMOOTH|ROUGH': {
    meaning: 'How the sound is produced — glassy and polished at one end, distorted and lo-fi at the other.',
    scale: ['Glassy and pristine, studio-clean', 'Smooth, lightly polished', 'Some grit, a little texture', 'Rough and raw, lo-fi edges', 'Distorted and abrasive — all grit'],
  },

  // ---- Reel: comedy ----
  'SAFE|EDGY': {
    meaning: 'How far the jokes go — wholesome crowd-pleasers vs content that’s offensive on purpose.',
    scale: ['Totally wholesome, nothing to flinch at', 'Light and safe', 'A little bite', 'Edgy, pushes the line', 'Offensive on purpose — no line left'],
  },
  'MAINSTREAM|OBSCURE': {
    meaning: 'Whether the feed serves what everyone has already seen or deep cuts almost no one has.',
    scale: ['What everyone has already seen', 'Popular, widely shared', 'Mixed — some deep cuts', 'Niche, off the beaten feed', 'Deep underground — almost no one has seen it'],
  },
  'SINCERE|IRONIC': {
    meaning: 'Whether it means what it says or keeps everything at an ironic, winking distance.',
    scale: ['Dead earnest, means every word', 'Mostly sincere', 'Half-joking', 'Ironic, winking at you', 'Pure irony — nothing meant straight'],
  },

  // ---- Reel: lifestyle ----
  'FREE|PRICEY': {
    meaning: 'The price tag of the lifestyle shown — thrifted and free vs luxury flex.',
    scale: ['Free, thrifted, zero spend', 'Budget, cheap finds', 'Mid-range', 'Premium, splurge territory', 'Luxury — flex-level expensive'],
  },
  'RAW|POLISHED': {
    meaning: 'How produced it looks — unfiltered phone footage vs glossy, ad-perfect production.',
    scale: ['Totally unfiltered, phone-shot', 'Raw and casual', 'Lightly edited', 'Polished, well-produced', 'Glossy, ad-perfect production'],
  },
  'BROAD|NICHE': {
    meaning: 'Who it is made for — universal appeal vs a hyper-specific inside world.',
    scale: ['For absolutely everyone', 'Wide appeal', 'Mixed audience', 'For a specific crowd', 'Hyper-niche — basically an inside world'],
  },

  // ---- Reel: body ----
  'AESTHETIC|PERFORMANCE': {
    meaning: 'What the body content is really selling. AESTHETIC is how it looks on camera — the image, the mirror. PERFORMANCE is what the body can actually do — the results. The feed decides which one it shows you.',
    scale: ['Pure image — how it reads on camera', 'Mostly about appearance', 'Looks and function, both', 'Mostly about what the body can do', 'Pure performance — results over looks'],
  },
  'GENTLE|INTENSE': {
    meaning: 'How hard the content pushes you — soft and low-impact vs brutal, maximum-effort.',
    scale: ['Barely there — slow and soft', 'Easy, low-impact', 'Moderate, a real push', 'Hard and demanding', 'Brutal — maximum intensity'],
  },

  // ---- Reel: mind ----
  'SOOTHING|ACTIVATING': {
    meaning: 'Whether it winds you down or winds you up — calm self-care vs adrenaline and urgency.',
    scale: ['Deeply calming, winds you all the way down', 'Soothing, settling', 'Neutral', 'Stimulating, wakes you up', 'Highly activating — adrenaline, urgency'],
  },
  'EVIDENCE|BELIEF': {
    meaning: 'What it runs on — sourced facts and proof vs pure conviction and faith.',
    scale: ['Strictly facts, sourced and proven', 'Evidence-led', 'A mix of proof and faith', 'Belief-led', 'Pure conviction — faith over proof'],
  },
  'SINCERE|PERFORMATIVE': {
    meaning: 'Whether the selfhood on display is genuinely felt or performed for an audience.',
    scale: ['Genuinely felt, no audience', 'Mostly sincere', 'A little staged', 'Performed for the camera', 'Fully performative — all show'],
  },

  // ---- Reel: money ----
  'SAFE|RISKY': {
    meaning: 'The risk appetite of the money content — guaranteed and boring vs an all-in gamble.',
    scale: ['Zero risk — guaranteed and boring', 'Cautious, low stakes', 'Measured risk', 'High risk, high nerve', 'All-in gamble — could lose it all'],
  },
  'SLOW|FAST': {
    meaning: 'The time horizon — patient long-game wealth vs get-rich-overnight.',
    scale: ['The long game — decades of patience', 'Slow and steady', 'Mid-pace', 'Quick returns', 'Overnight — get rich now'],
  },
  'NEED|STATUS': {
    meaning: 'What the spending is for — necessity and getting by vs the flex of being seen.',
    scale: ['Pure necessity — just getting by', 'Practical needs', 'Comfort', 'For the look, the flex', 'Pure status — all about being seen'],
  },

  // ---- Reel: culture ----
  'TECH|HUMANITIES': {
    meaning: 'Which side of the culture it sits on — code and systems vs people, art and meaning.',
    scale: ['All code, systems, machines', 'Tech-leaning', 'Where tech meets people', 'People, art, ideas', 'Pure humanities — meaning over mechanism'],
  },
  'CALM|HEATED': {
    meaning: 'The temperature of the discourse — level-headed vs an all-out flame war.',
    scale: ['Totally level, no heat', 'Calm, measured', 'Some friction', 'Heated, argumentative', 'All-out flame war'],
  },
  'CONSENSUS|HETERODOX': {
    meaning: 'Whether it echoes the agreed-upon take or rejects the consensus entirely.',
    scale: ['The agreed-upon take', 'Mainstream consensus', 'A few contrarian notes', 'Against the grain', 'Pure heterodoxy — rejects consensus entirely'],
  },
}

export function poleKey(left: string, right: string) {
  return `${left}|${right}`.toUpperCase()
}

function zone(value: number) {
  const v = Math.max(0, Math.min(100, value))
  if (v <= 18) return 0
  if (v <= 40) return 1
  if (v < 60) return 2
  if (v < 82) return 3
  return 4
}

/** The read-out under a knob: what THIS position feels like. */
export function poleFeel(left: string, right: string, value: number): string {
  const m = POLE_META[poleKey(left, right)]
  return m ? m.scale[zone(value)] : poleWord(left, right, value)
}

/** The in-context explanation of a pole pair, for the walkthroughs. */
export function poleMeaning(left: string, right: string): string {
  return POLE_META[poleKey(left, right)]?.meaning ?? `From ${left.toLowerCase()} to ${right.toLowerCase()}.`
}
