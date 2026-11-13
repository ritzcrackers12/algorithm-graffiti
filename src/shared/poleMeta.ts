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
    scale: ['basically elevator music', 'lo-fi homework beats to study to', 'you might bop your head', 'Celsius', 'you are bout to PR'],
  },
  'BAD|GOOD': {
    meaning: 'The emotional tone the music pushes you toward, from bleak and heavy to euphoric feel-good.',
    scale: ['you the joker', 'rainy day', 'robot monotone', 'highschool movie typa day', 'Euphoric'],
  },
  'SMOOTH|ROUGH': {
    meaning: 'How the sound is produced — glassy and polished at one end, distorted and lo-fi at the other.',
    scale: ['Buttery', 'lightly polished', 'A little fuzz and texture', 'Gritty, basement-recording raw', 'underground rapper with an airpod mic'],
  },

  // ---- Reel: comedy ----
  'SAFE|EDGY': {
    meaning: 'How far the jokes go — wholesome crowd-pleasers vs content that’s offensive on purpose.',
    scale: ['show your grandma', 'Mild, office-party safe', 'A tad naughty', 'Risking reputation at NYU', '2016 twitter'],
  },
  'MAINSTREAM|OBSCURE': {
    meaning: 'Whether the feed serves what everyone has already seen or deep cuts almost no one has.',
    scale: ['Drake', 'Not quite Drake but close', 'You and your friends know this', 'Late night reel pull', 'it has 12 views'],
  },
  'SINCERE|IRONIC': {
    meaning: 'Whether it means what it says or keeps everything at an ironic, winking distance.',
    scale: ['means every single word', 'Mostly sincere', 'Half-joking', 'parody comedy', 'so ironic you questioning if it is a skit'],
  },

  // ---- Reel: lifestyle ----
  'FREE|PRICEY': {
    meaning: 'The price tag of the lifestyle shown — thrifted and free vs luxury flex.',
    scale: ['free 99', 'Budget treat', 'Mid-range; LARP', 'Splurger', 'Brickell, Miami rich'],
  },
  'RAW|POLISHED': {
    meaning: 'How produced it looks — unfiltered phone footage vs glossy, ad-perfect production.',
    scale: ['Filmed on a potato, zero edits', 'casual, but slightly polished', 'Lightly edited', 'actually produced', 'Glossy - suspiciously ad-perfect'],
  },
  'BROAD|NICHE': {
    meaning: 'Who it is made for — universal appeal vs a hyper-specific inside world.',
    scale: ['For everyone alive', 'Wide appeal', 'A mixed crowd', 'For a specific little crowd', 'Niche final boss — no one knows what you mean'],
  },

  // ---- Reel: body ----
  'AESTHETIC|PERFORMANCE': {
    meaning: 'What the body content is really selling. AESTHETIC is how it looks on camera — the image, the mirror. PERFORMANCE is what the body can actually do — the results. The feed decides which one it shows you.',
    scale: ['Clav level looksmaxx', 'lift to look good', 'look good; be strong', 'The science behind your body', 'Deep cut russian bodybuilder content'],
  },
  'GENTLE|INTENSE': {
    meaning: 'How hard the content pushes you — soft and low-impact vs brutal, maximum-effort.',
    scale: ['Barely moving — a gentle stretch', 'Easy, low-impact', 'A real push', 'Hard — you’ll feel it tomorrow', 'Brutal — leaves you on the floor'],
  },

  // ---- Reel: mind ----
  'SOOTHING|ACTIVATING': {
    meaning: 'Whether it winds you down or winds you up — calm self-care vs adrenaline and urgency.',
    scale: ['15 minute sleep video that works', 'Cup of chamomile tea', 'Background music', 'stimming a bit', '50mg of Adderall'],
  },
  'EVIDENCE|BELIEF': {
    meaning: 'What it runs on — sourced facts and proof vs pure conviction and faith.',
    scale: ['Multiple academic sources', 'Would hold up in court', 'ChatGPT said it', 'Your homie told you a story', 'Joe Rogan Podcast'],
  },
  'SINCERE|PERFORMATIVE': {
    meaning: 'Whether the selfhood on display is genuinely felt or performed for an audience.',
    scale: ['From the heart', 'Mostly sincere', 'A little staged', 'Performing for the camera', 'All show — the camera is the whole point'],
  },

  // ---- Reel: money ----
  'SAFE|RISKY': {
    meaning: 'The risk appetite of the money content — guaranteed and boring vs an all-in gamble.',
    scale: ['Savings-account safe, deeply boring', 'Cautious, low stakes', 'Calculated risk', 'Options trading', 'Peak NFT market'],
  },
  'SLOW|FAST': {
    meaning: 'The time horizon — patient long-game wealth vs get-rich-overnight.',
    scale: ['Index fund', 'Buying a house when you’re young', 'Stocks', 'Build a business in 2 weeks', 'Day-trading'],
  },
  'NEED|STATUS': {
    meaning: 'What the spending is for — necessity and getting by vs the flex of being seen.',
    scale: ['Pure survival', 'Practical needs', 'Calm larp', 'flex', 'peak clout'],
  },

  // ---- Reel: culture ----
  'TECH|HUMANITIES': {
    meaning: 'Which side of the culture it sits on — code and systems vs people, art and meaning.',
    scale: ['Video that feels made in binary', 'Tech-leaning', 'Cool nerds', 'People, art, and emotion', 'All art and meaning, zero machines'],
  },
  'CALM|HEATED': {
    meaning: 'The temperature of the discourse — level-headed vs an all-out flame war.',
    scale: ['Zen', 'Calm, measured', 'Some tension', 'Heated', 'Comment-section warfare'],
  },
  'CONSENSUS|HETERODOX': {
    meaning: 'Whether it echoes the agreed-upon take or rejects the consensus entirely.',
    scale: ['Safest take', 'Mainstream consensus', '"I agree, but I also think ___"', 'Against the norm', 'Flaming hot-take'],
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
