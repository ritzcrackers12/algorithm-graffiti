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
    scale: ['Comatose — basically elevator music', 'Chill, lo-fi homework vibes', 'A steady head-nod', 'Hyped, pre-game energy', 'Unhinged — the gym-bro anthem'],
  },
  'BAD|GOOD': {
    meaning: 'The emotional tone the music pushes you toward, from bleak and heavy to euphoric feel-good.',
    scale: ['Villain-origin-story sad', 'Rainy-day melancholy', 'Emotionally neutral, like a hold tone', 'Good mood, main-character energy', 'Euphoric — serotonin maxed out'],
  },
  'SMOOTH|ROUGH': {
    meaning: 'How the sound is produced — glassy and polished at one end, distorted and lo-fi at the other.',
    scale: ['Buttery — spa-playlist clean', 'Smooth, lightly polished', 'A little fuzz and texture', 'Gritty, basement-recording raw', 'Blown out — your speakers are scared'],
  },

  // ---- Reel: comedy ----
  'SAFE|EDGY': {
    meaning: 'How far the jokes go — wholesome crowd-pleasers vs content that’s offensive on purpose.',
    scale: ['Grandma-approved, zero risk', 'Mild, office-party safe', 'A little spicy', 'Edgy — toeing the line', 'Cancelable — there is no line left'],
  },
  'MAINSTREAM|OBSCURE': {
    meaning: 'Whether the feed serves what everyone has already seen or deep cuts almost no one has.',
    scale: ['The #1 clip everyone already sent you', 'Popular, widely shared', 'A few deep cuts mixed in', 'Off the beaten feed', 'So underground it has 12 views'],
  },
  'SINCERE|IRONIC': {
    meaning: 'Whether it means what it says or keeps everything at an ironic, winking distance.',
    scale: ['Earnest — means every single word', 'Mostly sincere', 'Half-joking, you decide', 'Ironic, permanently winking', 'So ironic no one knows what it believes'],
  },

  // ---- Reel: lifestyle ----
  'FREE|PRICEY': {
    meaning: 'The price tag of the lifestyle shown — thrifted and free vs luxury flex.',
    scale: ['Thrifted, free, zero dollars spent', 'Budget — treat-yourself-on-sale', 'Mid-range and reasonable', 'Splurge — treating yourself loudly', 'Rent-money flex, fiscally reckless'],
  },
  'RAW|POLISHED': {
    meaning: 'How produced it looks — unfiltered phone footage vs glossy, ad-perfect production.',
    scale: ['Filmed on a potato, zero edits', 'Raw and casual', 'Lightly edited', 'Polished, actually produced', 'Glossy — suspiciously ad-perfect'],
  },
  'BROAD|NICHE': {
    meaning: 'Who it is made for — universal appeal vs a hyper-specific inside world.',
    scale: ['For literally everyone alive', 'Wide appeal', 'A mixed crowd', 'For a specific little crowd', 'Niche final boss — no one knows what you mean'],
  },

  // ---- Reel: body ----
  'AESTHETIC|PERFORMANCE': {
    meaning: 'What the body content is really selling. AESTHETIC is how it looks on camera — the image, the mirror. PERFORMANCE is what the body can actually do — the results. The feed decides which one it shows you.',
    scale: ['Pure thirst trap — all mirror, no gym', 'Mostly about the look', 'Looks and gains, both', 'Mostly about what the body can do', 'Pure athlete — results, no posing'],
  },
  'GENTLE|INTENSE': {
    meaning: 'How hard the content pushes you — soft and low-impact vs brutal, maximum-effort.',
    scale: ['Barely moving — a gentle stretch', 'Easy, low-impact', 'A real push', 'Hard — you’ll feel it tomorrow', 'Brutal — leaves you on the floor'],
  },

  // ---- Reel: mind ----
  'SOOTHING|ACTIVATING': {
    meaning: 'Whether it winds you down or winds you up — calm self-care vs adrenaline and urgency.',
    scale: ['Horizontal — asleep by minute two', 'Soothing, settling', 'Neutral, just vibing', 'Wakes you up, lights on', 'Full adrenaline — fix-your-life-now'],
  },
  'EVIDENCE|BELIEF': {
    meaning: 'What it runs on — sourced facts and proof vs pure conviction and faith.',
    scale: ['Cited, sourced, peer-reviewed', 'Evidence-led', 'Half facts, half faith', 'Running on belief', 'Pure vibes — “trust me bro”'],
  },
  'SINCERE|PERFORMATIVE': {
    meaning: 'Whether the selfhood on display is genuinely felt or performed for an audience.',
    scale: ['Genuinely felt, no audience', 'Mostly sincere', 'A little staged', 'Performing for the camera', 'All show — the camera is the whole point'],
  },

  // ---- Reel: money ----
  'SAFE|RISKY': {
    meaning: 'The risk appetite of the money content — guaranteed and boring vs an all-in gamble.',
    scale: ['Savings-account safe, deeply boring', 'Cautious, low stakes', 'Measured risk', 'High-risk, sweaty-palms', 'All-in on a coin named after a dog'],
  },
  'SLOW|FAST': {
    meaning: 'The time horizon — patient long-game wealth vs get-rich-overnight.',
    scale: ['Retire-in-40-years patient', 'Slow and steady', 'Mid-pace', 'Quick returns', 'Rich by Friday or bust'],
  },
  'NEED|STATUS': {
    meaning: 'What the spending is for — necessity and getting by vs the flex of being seen.',
    scale: ['Pure survival — rent and ramen', 'Practical needs', 'A little comfort', 'For the flex', 'Pure clout — bought to be seen'],
  },

  // ---- Reel: culture ----
  'TECH|HUMANITIES': {
    meaning: 'Which side of the culture it sits on — code and systems vs people, art and meaning.',
    scale: ['All code, zero feelings', 'Tech-leaning', 'Where nerds meet poets', 'People, art, big feelings', 'All art and meaning, zero machines'],
  },
  'CALM|HEATED': {
    meaning: 'The temperature of the discourse — level-headed vs an all-out flame war.',
    scale: ['Zen — nothing rattles it', 'Calm, measured', 'Mild friction', 'Heated, caps-lock energy', 'Comment-section warfare'],
  },
  'CONSENSUS|HETERODOX': {
    meaning: 'Whether it echoes the agreed-upon take or rejects the consensus entirely.',
    scale: ['The approved, agreed-on take', 'Mainstream consensus', 'A couple contrarian notes', 'Against the grain', 'Devil’s advocate nobody asked for'],
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
