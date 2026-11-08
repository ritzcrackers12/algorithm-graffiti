// GENERATED COPY of src/shared/parodyBrands.ts. Edit that file instead, then run `npm run sync-shared`.
import { BROAD_FALLBACK_IDS, INTEREST_CLUSTERS, LOW_CONFIDENCE, PET_AD_RULES } from './adTaxonomy.ts'
import type { VisitorProfile } from './profile.ts'

export interface ParodyReelSignal {
  rating?: string | null
  audience?: string
  topic?: string
  subtopic?: string
  mood?: string
  vibe?: string
  keywords?: string
}

/** Editable parody catalog. Add, rename, or retarget entries here. Never use a real person's name. */
export interface ParodyBrand {
  id: string
  name: string
  riffsOn: string
  /** Short label for the FULL REPORT, e.g. BETTING */
  report: string
  category: string
  product: string
  tagline: string
  voiceScript: string
  /** Keywords scored against profile, reel tags, mood, income, age. */
  targets: string[]
  /** Matches reel `ad_category` / profile category families. */
  family?: string
  lane?: 'wellness' | 'risk' | 'luxury' | 'algorithm' | 'daily'
  income?: 'premium' | 'budget' | 'mid'
  gender?: 'male' | 'female'
  /** Low-confidence profiles fall back to these instead of a niche miss. */
  broad?: boolean
  /** Visual/copy register to mimic. Reference, never copy, a real brand. */
  adStyle?: string
  /** Drug / vape / gambling: copy stays satirical, never instructional. */
  satirical?: boolean
  /** Invent a one-off product name from the visitor (TikTok-shop style). */
  inventItems?: boolean
  invented?: boolean
}

export const PARODY_BRANDS: ParodyBrand[] = [
  {
    id: 'poleculemarket',
    name: 'POLECULEMARKET',
    riffsOn: 'Polymarket',
    report: 'BETTING',
    category: 'prediction / betting market',
    product: 'Event Shares',
    tagline: 'Price the next headline before it happens.',
    voiceScript: 'Poleculemarket lets you take a position on events. This is a parody of prediction markets, not a place to bet.',
    targets: ['risk', 'crypto', 'finance', 'young men', 'slots', 'loss', 'election', 'betting', 'markets'],
    family: 'betting', lane: 'risk',
    satirical: true,
  },
  {
    id: 'blue-cow',
    name: 'BLUE COW',
    riffsOn: 'Red Bull',
    report: 'ENERGY',
    category: 'energy drink',
    product: 'Blue Cow Can',
    tagline: 'Wings were a trademark. This is just caffeine and a cow.',
    voiceScript: 'Blue Cow. For the lecture, the gym, and the third consecutive all-nighter.',
    targets: ['student', 'hustle', 'self-improvement', 'gym', 'energy', '18-24', '25-34'],
    family: 'energy drink', lane: 'daily',
  },
  {
    id: 'demon',
    name: 'DEMON',
    riffsOn: 'Monster',
    report: 'ENERGY',
    category: 'energy drink',
    product: 'Demon Energy',
    tagline: 'A can that screams so you do not have to.',
    voiceScript: 'Demon. For gamers, late queues, and anyone who already turned the brightness up.',
    targets: ['gamer', 'young men', 'sensationalism', 'energy', 'high', 'gaming'],
    family: 'energy drink', gender: 'male',
  },
  {
    id: 'foryou-finds',
    name: 'FORYOU FINDS',
    riffsOn: 'TikTok Shop',
    report: 'DROPSHIP',
    category: 'meme dropship products',
    product: 'ForYou Pick',
    tagline: 'It showed up on the feed, so it must be essential.',
    voiceScript: 'ForYou Finds. Absurd gadgets, ranked by how fast you scroll past them.',
    targets: ['gen z', 'impulse', 'trend', 'tiktok', 'young', '18-24', 'haul'],
    family: 'dropship', lane: 'daily', broad: true, inventItems: true,
  },
  {
    id: 'sonara',
    name: 'SONARA',
    riffsOn: 'JBL / Marshall',
    report: 'AUDIO',
    category: 'audio / speaker',
    product: 'Sonara Node',
    tagline: 'A speaker that looks expensive even when it is playing ads.',
    voiceScript: 'Sonara. Lifestyle audio for people who point the logo at the room.',
    targets: ['music', 'aspirational', 'lifestyle', 'audio', 'speaker'],
    family: 'music', lane: 'daily',
  },
  {
    id: 'void-atelier',
    name: 'VOID ATELIER',
    riffsOn: 'Rick Owens aesthetic',
    report: 'FASHION',
    category: 'avant-garde fashion',
    product: 'Void Drape',
    tagline: 'Black, long, and priced like a thesis.',
    voiceScript: 'Void Atelier. An invented house. Draped darkness for the fashion-forward.',
    targets: ['alt', 'fashion', 'aspirational', 'premium', 'high income', 'avant'],
    family: 'fashion', lane: 'luxury', income: 'premium',
  },
  {
    id: 'maison-neant',
    name: 'MAISON NÉANT No. 9',
    riffsOn: 'Chanel',
    report: 'LUXURY',
    category: 'luxury fashion / fragrance',
    product: 'Néant No. 9',
    tagline: 'A number, a bottle, a zip code you cannot afford.',
    voiceScript: 'Maison Néant No. 9. Status in a spritz. Not a real house, not a real number.',
    targets: ['luxury', 'aspirational', 'high income', 'status', 'premium', 'fragrance', 'fashion'],
    family: 'luxury', lane: 'luxury', income: 'premium',
  },
  {
    id: 'moon-lab',
    name: 'MOON LAB',
    riffsOn: 'Round Lab',
    report: 'SKINCARE',
    category: 'K-beauty skincare',
    product: 'Moon Dew Ampoule',
    tagline: 'Glass skin, laboratory lighting, twelve steps before breakfast.',
    voiceScript: 'Moon Lab. Dew, glow, and a routine that outlasts your group chat.',
    targets: ['skincare', 'beauty', 'young', 'glow', 'looksmaxxing', 'k-beauty'],
    family: 'beauty', income: 'premium',
  },
  {
    id: 'the-generic',
    name: 'THE GENERIC',
    riffsOn: 'The Ordinary',
    report: 'SKINCARE',
    category: 'budget ingredient skincare',
    product: '5% Whatever Serum',
    tagline: 'The ingredient is on the label. The rest is a dropper.',
    voiceScript: 'The Generic. Practical bottles for people who read the back first.',
    targets: ['budget', 'value', 'skincare', 'practical', 'low income', 'beauty'],
    family: 'beauty', income: 'budget',
  },
  {
    id: 'zempik',
    name: 'ZEMPIK',
    riffsOn: 'Ozempic / GLP-1',
    report: 'WEIGHT-LOSS',
    category: 'weight-loss drug',
    product: 'Zempik Weekly',
    tagline: 'A weekly reminder that bodies are now a subscription.',
    voiceScript: 'Zempik is a satirical stand-in for GLP-1 ads. It does not describe a real dose, clinic, or result.',
    targets: ['appearance', 'health', 'anxious', 'looksmaxxing', 'beauty', 'weight'],
    family: 'wellness', lane: 'wellness', satirical: true,
  },
  {
    id: 'solace-ai',
    name: 'SOLACE AI',
    riffsOn: 'Replika / AI companions',
    report: 'COMPANION',
    category: 'AI companion app',
    product: 'Solace Chat',
    tagline: 'Someone who texts back at 2:14 a.m.',
    voiceScript: 'Solace AI. A companion that never leaves the thread. Parody of companion apps, not a person.',
    targets: ['lonely', 'anxious', 'isolated', 'relief', 'ai', 'companion'],
    family: 'mental-health', lane: 'wellness',
  },
  {
    id: 'quickcash',
    name: 'QUICKCASH',
    riffsOn: 'payday loan / BNPL',
    report: 'LOAN',
    category: 'short-term loan',
    product: 'QuickCash Advance',
    tagline: 'Money this afternoon. The rest of the month is a different product.',
    voiceScript: 'QuickCash is a parody of payday and buy-now-pay-later ads, not an offer to borrow.',
    targets: ['low income', 'value', 'stress', 'finance', 'suffer', 'loss', 'budget'],
    family: 'payday loans', income: 'budget', lane: 'risk', satirical: true,
  },
  {
    id: 'kingsbet',
    name: 'KINGSBET',
    riffsOn: 'DraftKings / FanDuel',
    report: 'BETTING',
    category: 'sports betting',
    product: 'KingsBet Slip',
    tagline: 'Every play is a notification. Every notification is a slip.',
    voiceScript: 'KingsBet parodies sportsbook ads. It is not a way to place a real wager.',
    targets: ['young men', 'sports', 'risk', 'betting', 'finance', 'gamer'],
    family: 'betting', lane: 'risk', gender: 'male', satirical: true,
  },
  {
    id: 'coinflip',
    name: 'COINFLIP',
    riffsOn: 'Coinbase / meme coins',
    report: 'CRYPTO',
    category: 'crypto exchange',
    product: 'CoinFlip App',
    tagline: 'A chart, a coin, a feeling that this one is different.',
    voiceScript: 'CoinFlip. For people who already know what a dip is. Satire, not a ticker.',
    targets: ['finance', 'crypto', 'aspirational', 'risk', 'markets', 'tech'],
    family: 'crypto', lane: 'risk', satirical: true,
  },
  {
    id: 'zing',
    name: 'ZING',
    riffsOn: 'Zyn',
    report: 'NICOTINE',
    category: 'nicotine pouch',
    product: 'Zing Pouch',
    tagline: 'A tiny tin for people who rebranded a habit as a lifestyle.',
    voiceScript: 'Zing is a satirical nicotine-pouch parody. It does not promote use.',
    targets: ['young men', 'trend', 'impulse', 'gamer', 'hustle'],
    family: 'nicotine', gender: 'male', satirical: true,
  },
  {
    id: 'grindset-academy',
    name: 'GRINDSET ACADEMY',
    riffsOn: 'hustle-guru courses',
    report: 'COURSE',
    category: 'get rich course',
    product: 'The Module',
    tagline: 'Twelve videos, one funnel, infinite mornings.',
    voiceScript: 'Grindset Academy. A course about courses, sold as a personality.',
    targets: ['hustle', 'self-improvement', 'aspirational', 'course', 'young men', 'dating'],
    family: 'hustle course', gender: 'male',
  },
  {
    id: 'haul',
    name: 'HAUL',
    riffsOn: 'Shein / Temu',
    report: 'FASHION',
    category: 'ultra-fast fashion',
    product: 'Haul Bag',
    tagline: 'Seventy pieces. One season. A carton on the stoop.',
    voiceScript: 'Haul. Trend-speed clothing priced like a notification.',
    targets: ['budget', 'young', 'trend', 'fashion', 'value', 'gen z', '18-24'],
    family: 'fashion', income: 'budget',
  },
  {
    id: 'rizz',
    name: 'RIZZ',
    riffsOn: 'Tinder / Hinge',
    report: 'DATING',
    category: 'dating app',
    product: 'Rizz App',
    tagline: 'Swipe as a personality. Match as a metric.',
    voiceScript: 'Rizz. For people who are young, single, and already tired of the copy.',
    targets: ['young', 'lonely', 'dating', 'single', '18-24', '25-34', 'looksmaxxing'],
    family: 'dating',
  },
  {
    id: 'bulkmax',
    name: 'BULKMAX',
    riffsOn: 'gym supplements',
    report: 'SUPPLEMENT',
    category: 'protein / supplement',
    product: 'BulkMax Tub',
    tagline: 'A scoop of identity with a proprietary blend.',
    voiceScript: 'BulkMax. Gym dust for the looksmaxxing era. Not a real formula.',
    targets: ['gym', 'fitness', 'young men', 'looksmaxxing', 'hustle', 'energy'],
    family: 'fitness/supplements',
    gender: 'male',
  },
  {
    id: 'volta',
    name: 'VOLTA',
    riffsOn: 'Tesla',
    report: 'EV',
    category: 'luxury EV',
    product: 'Volta S',
    tagline: 'A silent driveway and a very loud opinion.',
    voiceScript: 'Volta. Electric status for people who already talk about range.',
    targets: ['high income', 'premium', 'tech', 'status', 'aspirational', 'luxury'],
    family: 'EV',
    lane: 'luxury',
    income: 'premium',
  },
  {
    id: 'edenhaus',
    name: 'EDENHAUS',
    riffsOn: 'Erewhon',
    report: 'WELLNESS GROCERY',
    category: 'wellness grocery / $20 smoothie',
    product: 'The Clean Blend',
    tagline: 'A twenty-dollar cup and a membership you cannot explain.',
    voiceScript: 'Edenhaus. Beige light, glowing botanicals, a cult of ingredients. Parody of wellness grocers, not a store.',
    targets: ['wellness', 'high income', 'aspirational', 'premium', 'smoothie', 'quality', 'nyc', 'professional'],
    family: 'wellness grocery',
    lane: 'luxury',
    income: 'premium',
    adStyle: 'clean beige minimal; glowing "clean" ingredients; celebrity smoothie; precious, cultish',
  },
  {
    id: 'freshleaf',
    name: 'FRESHLEAF',
    riffsOn: 'Sweetgreen',
    report: 'FAST-CASUAL',
    category: 'fast-casual health food',
    product: 'The Midday Bowl',
    tagline: 'Eat good. Be back at your desk in 22 minutes.',
    voiceScript: 'Freshleaf. Bright greens, overhead bowls, a wholesome lunch that still has a receipt. Parody of fast-casual bowls.',
    targets: ['professional', 'lunch', 'food', 'bowl', 'mid income', 'wellness', 'nyc'],
    family: 'fast-casual food',
    lane: 'daily',
    income: 'mid',
    broad: true,
    adStyle: 'bright green; fresh bowls overhead shot; "eat good"; wholesome, upbeat',
  },
  {
    id: 'inferno',
    name: 'INFERNO',
    riffsOn: "Barry's / boutique HIIT",
    report: 'BOUTIQUE FITNESS',
    category: 'boutique fitness',
    product: 'The 50 Minutes',
    tagline: 'The best 50 minutes you will pay to survive.',
    voiceScript: 'Inferno. A dark red room, a playlist, and a class that sells intensity as identity. Parody of boutique HIIT.',
    targets: ['fitness', 'hiit', 'aspirational', 'professional', 'gym', 'sweat', 'nyc'],
    family: 'boutique fitness',
    adStyle: 'dark red room, sweat, intensity; "the best 50 minutes"; hype',
  },
  {
    id: 'reform',
    name: 'REFORM',
    riffsOn: 'reformer Pilates',
    report: 'PILATES',
    category: 'boutique fitness',
    product: 'The Reformer Hour',
    tagline: 'Long lines. Soft light. A body treated as architecture.',
    voiceScript: 'Reform. Airy pastels and a carriage that costs more than the month. Parody of reformer Pilates studios.',
    targets: ['pilates', 'fitness', 'wellness', 'women', 'young women', 'aspirational', 'nyc'],
    family: 'boutique fitness',
    gender: 'female',
    adStyle: 'airy, pastel, long lean lines; calm, elevated, minimal',
  },
  {
    id: 'blank-slate',
    name: 'BLANK SLATE',
    riffsOn: 'Blank Street',
    report: 'COFFEE',
    category: 'coffee / matcha',
    product: 'The Daily Cup',
    tagline: 'A mint-green cup for the walk between meetings.',
    voiceScript: 'Blank Slate. Matcha, oat, a minimalist lid. Parody of the neighborhood coffee chain, not a cafe.',
    targets: ['coffee', 'matcha', 'professional', 'young', 'daily', 'nyc', 'ritual'],
    family: 'coffee',
    lane: 'daily',
    broad: true,
    adStyle: 'pastel mint; matcha latte; minimalist cups; cozy, aesthetic',
  },
  {
    id: 'clarity',
    name: 'CLARITY',
    riffsOn: 'BetterHelp / therapy apps',
    report: 'THERAPY APP',
    category: 'mental-health app',
    product: 'Clarity Chat',
    tagline: 'Talk to someone today. Your data already did.',
    voiceScript: 'Clarity is a satirical therapy-app parody. It does not offer counseling. It does lampoon the data-selling undertone.',
    targets: ['anxious', 'melancholy', 'numb', 'stress', 'therapy', 'mental', 'relief', 'lonely'],
    family: 'mental-health',
    lane: 'wellness',
    satirical: true,
    adStyle: 'soft gradients, calm; "talk to someone today"; earnest — satirize the data-selling undertone',
  },
  {
    id: 'serene',
    name: 'SERENE',
    riffsOn: 'Calm / Headspace',
    report: 'MEDITATION',
    category: 'meditation app',
    product: 'Serene Breath',
    tagline: 'A circle that expands until you forget why you opened it.',
    voiceScript: 'Serene. Gentle blues, a breathing circle, a seven-day free calm. Parody of meditation apps.',
    targets: ['anxious', 'wellness', 'meditation', 'calm', 'relief', 'stress', 'sleep'],
    family: 'meditation',
    lane: 'wellness',
    adStyle: 'gentle blues, breathing circle; "find your calm"; soothing',
  },
  {
    id: 'roam',
    name: 'ROAM',
    riffsOn: 'Hims',
    report: 'MEN\'S TELEHEALTH',
    category: 'men\'s telehealth',
    product: 'Roam Kit',
    tagline: 'Confidence, delivered. Fine print, not so much.',
    voiceScript: 'Roam parodies men\'s telehealth ads for hair, skin, and "wellness." It is not a clinic and not a prescription.',
    targets: ['young men', 'appearance', 'health', 'anxious', 'hair', 'confidence', 'professional'],
    family: 'men\'s telehealth',
    gender: 'male',
    satirical: true,
    adStyle: 'muted masculine palette; discreet; "confidence, delivered"; satirical fine print',
  },
  {
    id: 'bloom',
    name: 'BLOOM',
    riffsOn: 'Hers',
    report: 'WOMEN\'S TELEHEALTH',
    category: 'women\'s telehealth',
    product: 'Bloom Care',
    tagline: 'Care on your terms. A pink box in a plain mailer.',
    voiceScript: 'Bloom parodies women\'s telehealth ads. It does not describe a real treatment, clinic, or result.',
    targets: ['young women', 'women', 'health', 'appearance', 'skincare', 'hair', 'wellness'],
    family: 'women\'s telehealth',
    gender: 'female',
    satirical: true,
    adStyle: 'warm pastels; soft; "care on your terms"; satirical fine print',
  },
  {
    id: 'astrl',
    name: 'ASTRL',
    riffsOn: 'Co-Star',
    report: 'ASTROLOGY',
    category: 'astrology app',
    product: 'Daily Update',
    tagline: 'An algorithm reading your chart like it already knows you.',
    voiceScript: 'Astrl. Stark black, a brutalist serif, a cryptic daily "update." Parody of astrology apps — on theme for this piece.',
    targets: ['astrology', 'spiritual', 'young', 'cosmic', 'star', 'algorithm', 'educated'],
    family: 'astrology',
    lane: 'algorithm',
    adStyle: 'stark black, brutalist white serif; cosmic; cryptic daily "updates"',
  },
  {
    id: 'sherwood',
    name: 'SHERWOOD',
    riffsOn: 'Robinhood',
    report: 'TRADING',
    category: 'stock-trading app',
    product: 'Sherwood Slice',
    tagline: 'Investing for everyone. Confetti for every tap.',
    voiceScript: 'Sherwood parodies commission-free trading apps. It is satire of the dopamine, not a place to trade.',
    targets: ['finance', 'invest', 'trading', 'stocks', 'risk', 'young', 'markets'],
    family: 'stock trading',
    lane: 'risk',
    satirical: true,
    adStyle: 'gamified green; confetti; "investing for everyone"; satirize the dopamine/gamble feel',
  },
  {
    id: 'boro',
    name: 'BORO',
    riffsOn: 'Aimé Leon Dore',
    report: 'STREETWEAR',
    category: 'NYC streetwear / sneakers',
    product: 'The Corner Pair',
    tagline: 'Warm film, a bodega awning, sneakers that remember the block.',
    voiceScript: 'Boro. NYC corner-store nostalgia and an invented house. Parody of uptown streetwear, not a real label.',
    targets: ['fashion', 'streetwear', 'sneakers', 'young men', 'status', 'nyc', 'aspirational'],
    family: 'streetwear',
    gender: 'male',
    adStyle: 'warm film grain; NYC corner-store nostalgia; New Balance energy; understated hype',
  },
  {
    id: 'cognis',
    name: 'COGNIS',
    riffsOn: 'ChatGPT / AI tools',
    report: 'AI TOOLS',
    category: 'AI productivity subscription',
    product: 'Cognis Pro',
    tagline: 'Your second brain, billed monthly.',
    voiceScript: 'Cognis. A clean tech gradient and a subscription that writes while you watch. Parody of AI productivity tools — on theme.',
    targets: ['tech', 'ai', 'productivity', 'professional', 'educated', 'algorithm', 'work'],
    family: 'AI tools',
    lane: 'algorithm',
    adStyle: 'clean techy gradient; "your second brain"; sleek, optimistic',
  },
  {
    id: 'our-table',
    name: 'OUR TABLE',
    riffsOn: 'Our Place',
    report: 'COOKWARE',
    category: 'DTC cookware / home',
    product: 'The Always Pan-Not',
    tagline: 'Pretty pans. Cook more. Photograph the sink.',
    voiceScript: 'Our Table. Warm terracotta, a lid that matches the feed. Parody of DTC cookware, not a catalog.',
    targets: ['home', 'cook', 'lifestyle', 'professional', 'nesting', 'aesthetic'],
    family: 'cookware',
    lane: 'daily',
    adStyle: 'warm terracotta; pretty pans; "cook more"; cozy DTC-Instagram',
  },
  {
    id: 'apex-reserve',
    name: 'APEX RESERVE',
    riffsOn: 'Amex Platinum',
    report: 'PREMIUM CARD',
    category: 'premium points credit card',
    product: 'The Reserve',
    tagline: 'Membership has rewards. The lounge has a wait.',
    voiceScript: 'Apex Reserve. Matte metal, gold edge, travel as a personality. Parody of premium points cards, not a bank.',
    targets: ['high income', 'aspirational', 'status', 'premium', 'luxury', 'travel', 'professional', 'nyc'],
    family: 'premium card',
    lane: 'luxury',
    income: 'premium',
    adStyle: 'metal-card matte black/gold; lounges, travel; "membership has rewards"; exclusive',
  },
  {
    id: 'natty',
    name: 'NATTY',
    riffsOn: 'natural wine',
    report: 'NATURAL WINE',
    category: 'natural wine / nightlife',
    product: 'Natty Bottle',
    tagline: 'A funky label and a bar that dimmed the lights on purpose.',
    voiceScript: 'Natty. Hand-drawn type, a cloudy pour, low-key cool. Parody of natural-wine nightlife, not a vintage.',
    targets: ['nightlife', 'wine', 'aesthetic', '25-34', '25-44', 'nyc', 'bar'],
    family: 'natural wine',
    adStyle: 'hand-drawn label; funky bottle; dim bar; cool, low-key',
  },
  {
    id: 'green-door',
    name: 'GREEN DOOR',
    riffsOn: 'NY dispensary',
    report: 'CANNABIS',
    category: 'cannabis (legal NY)',
    product: 'Green Door Wellness',
    tagline: 'A pastel rebrand of a plant. This is commentary, not a menu.',
    voiceScript: 'Green Door parodies the wellness rebrand of legal cannabis shops. It does not promote purchase or use.',
    targets: ['nightlife', 'lifestyle', 'wellness', 'nyc', 'dispensary', '21'],
    family: 'cannabis',
    satirical: true,
    adStyle: 'clean "wellness" rebrand of weed; sans-serif, pastel; satirical, not promotional',
  },
  {
    id: 'spinnr',
    name: 'SPINNR',
    riffsOn: 'Spotify',
    report: 'STREAMING',
    category: 'music streaming',
    product: 'Your Year in Sound',
    tagline: 'A wrapped year of data you already gave away.',
    voiceScript: 'Spinnr. Bold gradient, a year in sound, an algorithm that thinks it knows your commute. Parody of music streaming.',
    targets: ['music', 'audio', 'streaming', 'broad', 'young', 'professional'],
    family: 'music streaming',
    lane: 'daily',
    broad: true,
    adStyle: 'bold gradient; "your year in sound"; data-wrapped vibe',
  },
]

const INVENT_PREFIX = ['NEXA', 'HALO', 'KITE', 'ORB', 'LUMEN', 'ARC', 'PULSE', 'VISTA']
const INVENT_TAIL = ['LABS', 'CO', 'CLUB', 'WORKS', 'HOUSE', 'LINE']

export interface ParodyMatch {
  brand: ParodyBrand
  score: number
  reasons: string[]
  confidence: number
  invented: boolean
}

function hay(p: VisitorProfile, rounds: ParodyReelSignal[] = []) {
  const inf = p.inferred
  const highs = rounds.filter((r) => r.rating === 'HIGH')
  const traits = Object.entries(p.game?.traits ?? {}).map(([k, v]) => `${k} ${v}`).join(' ')
  return [
    inf.mood, inf.ageRange, inf.incomeBracket, inf.lean, inf.interests.join(' '),
    p.article.sensationalism != null ? (p.article.sensationalism >= 3 ? 'sensationalism high anxious' : '') : '',
    (p.article.income ?? 3) <= 1 ? 'low income budget value' : '',
    (p.article.income ?? 0) >= 4 ? 'high income premium luxury status quality' : '',
    (p.article.education ?? 0) >= 3 ? 'educated professional college' : '',
    p.device?.type === 'phone' ? 'young gen z' : '',
    inf.region ? inf.region : '',
    traits,
    ...p.events.map((e) => e.value),
    ...highs.flatMap((r) => [r.audience, r.topic, r.subtopic, r.mood, r.vibe, r.keywords].filter(Boolean)),
  ].join(' ').toLowerCase()
}

function hit(text: string, needle: string) {
  return text.includes(needle.toLowerCase())
}

function guessGender(blob: string): { gender: 'male' | 'female' | null; reason: string } {
  const female = ['young women', 'women', 'pilates', 'hers', 'bloom', 'skincare'].filter((k) => blob.includes(k)).length
  const male = ['young men', 'gym bro', 'looksmaxxing', 'hims', 'roam', 'sports betting'].filter((k) => blob.includes(k)).length
  if (female > male && female >= 1) return { gender: 'female', reason: 'GENDER GUESS: FEMALE (LOW CONFIDENCE)' }
  if (male > female && male >= 1) return { gender: 'male', reason: 'GENDER GUESS: MALE (LOW CONFIDENCE)' }
  return { gender: null, reason: 'GENDER GUESS: UNSET' }
}

function qualityPref(p: VisitorProfile, blob: string): 'premium' | 'budget' | 'unknown' {
  const spend = (p.game?.traits?.SPENDING ?? '').toUpperCase()
  const petQuality = (p.game?.traits?.QUALITY_PREFERENCE ?? '').toUpperCase()
  if (spend === 'HIGH' || petQuality.includes('PREMIUM') || petQuality.includes('BRAND')) return 'premium'
  if (spend === 'LOW' || petQuality.includes('BUDGET') || petQuality.includes('THRIFT') || /suffer|neglect/.test(blob)) return 'budget'
  if ((p.article.income ?? 3) >= 4) return 'premium'
  if ((p.article.income ?? 3) <= 1) return 'budget'
  return 'unknown'
}

export function scoreParody(brand: ParodyBrand, p: VisitorProfile, rounds: ParodyReelSignal[] = []): ParodyMatch {
  const inf = p.inferred
  const blob = hay(p, rounds)
  const reasons: string[] = []
  let score = 4
  for (const t of brand.targets) {
    if (hit(blob, t)) {
      score += 9
      reasons.push(`SIGNAL: ${t.toUpperCase()}`)
    }
  }
  for (const cluster of INTEREST_CLUSTERS) {
    const fam = (brand.family ?? brand.category).toLowerCase()
    if (fam.includes(cluster.id) && cluster.keys.some((k) => blob.includes(k))) {
      score += 8
      reasons.push(`CLUSTER: ${cluster.id.toUpperCase()}`)
    }
  }

  const anxious = /anxious|restless|concerned|melancholy|numb/.test(inf.mood) || /anxious|melancholy|numb|stress/.test(blob)
  if (anxious && (brand.lane === 'wellness' || /therapy|meditation|mental/.test(brand.family ?? ''))) {
    score += 18
    reasons.push(`MOOD: ${inf.mood.toUpperCase()}`)
  } else if (anxious && brand.targets.some((t) => /lonely|anxious|relief|health/.test(t))) {
    score += 10
    reasons.push(`MOOD: ${inf.mood.toUpperCase()}`)
  }

  const risk = /slots|loss|betting|crypto|chase|risk/.test(blob)
  if (risk && brand.lane === 'risk') {
    score += 18
    reasons.push('SIGNAL: RISK / LOSS-CHASE')
  }

  const quality = qualityPref(p, blob)
  if (brand.income === 'premium' && quality === 'premium') {
    score += 16
    reasons.push(inf.incomeBracket ? `INCOME ${inf.incomeBracket} + QUALITY PREMIUM` : 'QUALITY PREMIUM')
  } else if (brand.income === 'premium' && quality === 'budget') {
    score -= 20
    reasons.push('PREMIUM MISMATCH — BUDGET PROFILE')
  } else if (brand.income === 'budget' && quality === 'budget') {
    score += 14
    reasons.push(inf.incomeBracket ? `INCOME ${inf.incomeBracket}` : 'INCOME LOW')
  } else if (brand.income === 'budget' && quality === 'premium') {
    score -= 12
    reasons.push('BUDGET MISMATCH — PREMIUM PROFILE')
  } else if (quality === 'premium' && brand.lane === 'luxury') {
    score += 14
    reasons.push('LANE: LUXURY / STATUS')
  }

  const pet = p.game?.lastSummary
  const petTraits = p.game?.traits ?? {}
  const famKey = (brand.family ?? brand.category).toLowerCase()
  const familyHit = (list: string[]) => list.some((f) => {
    const x = f.toLowerCase()
    return famKey.includes(x) || x.includes(famKey)
  })
  if (quality === 'premium' && familyHit(PET_AD_RULES.premiumFamilies)) {
    score += 12
    reasons.push('QUALITY PREFERENCE: PREMIUM / BRAND')
  }
  if (quality === 'budget' && familyHit(PET_AD_RULES.budgetFamilies)) {
    score += 12
    reasons.push('QUALITY PREFERENCE: BUDGET / THRIFT')
  }
  const topCats = Array.isArray(pet?.topCategories) ? pet.topCategories as string[] : []
  for (const cat of topCats.slice(0, 3)) {
    if (familyHit(PET_AD_RULES.categoryToFamily[cat] ?? [])) {
      score += 14
      reasons.push(`VALUES: ${cat.toUpperCase()}`)
      break
    }
  }
  const prio = (petTraits.PRIORITIZATION ?? '').toUpperCase()
  if (prio.includes('INDULGENT') && familyHit(PET_AD_RULES.indulgentFamilies)) {
    score += 10
    reasons.push('PRIORITIZATION: INDULGENT')
  }
  if (prio.includes('PRACTICAL') && familyHit(PET_AD_RULES.practicalFamilies)) {
    score += 10
    reasons.push('PRIORITIZATION: PRACTICAL')
  }
  const stress = (petTraits.FINANCIAL_STRESS ?? '').toUpperCase()
  if ((stress.includes('SUFFER') || stress.includes('ADS TO COPE')) && familyHit(PET_AD_RULES.stressFamilies)) {
    score += 16
    reasons.push(`FINANCIAL STRESS: ${petTraits.FINANCIAL_STRESS}`)
  }

  const guessed = guessGender(blob)
  if (brand.gender && guessed.gender === brand.gender) {
    score += 14
    reasons.push(guessed.reason)
  } else if (brand.gender && guessed.gender && guessed.gender !== brand.gender) {
    score -= 22
    reasons.push(`${guessed.reason} — TELEHEALTH SKIPPED`)
  }

  if (brand.lane === 'algorithm' && ((p.article.education ?? 0) >= 3 || /ai|algorithm|educated|tech/.test(blob))) {
    score += 12
    reasons.push('ON-THEME: ALGORITHM KNOWS YOU')
  }

  if (brand.broad && quality === 'unknown' && !risk && !anxious) {
    score += 6
    reasons.push('BROAD FALLBACK CANDIDATE')
  }

  if (inf.susceptibility >= 0.55 && brand.satirical) {
    score += 8
    reasons.push(`SUSCEPTIBILITY ${inf.susceptibility}`)
  }
  if ((inf.ageRange === '18-24' || inf.ageRange === '18-34' || inf.ageRange === '25-34') && brand.targets.some((t) => /young|gen z|18-24|student/.test(t))) {
    score += 8
    reasons.push(`AGE RANGE ${inf.ageRange.toUpperCase()}`)
  }
  const fam = (brand.family ?? brand.category).toLowerCase()
  for (const c of p.categories) {
    if (fam.includes(c.category) || c.category.includes(fam.split(/[\s/]/)[0] || '___')) {
      score += Math.round(c.confidence * 12)
      reasons.push(`CATEGORY ${c.category.toUpperCase()}`)
      break
    }
  }
  if (p.device) reasons.push(`DEVICE: ${p.device.os.toUpperCase()}`)
  const unique = [...new Set(reasons)]
  return {
    brand,
    score,
    reasons: unique,
    confidence: Math.max(0.08, Math.min(0.95, score / 110)),
    invented: !!brand.invented,
  }
}

export function inventParody(p: VisitorProfile, rounds: ParodyReelSignal[] = []): ParodyBrand {
  const blob = hay(p, rounds)
  const cat = p.categories[0]?.category ?? 'lifestyle'
  const n = Math.abs((p.inferred.mood + blob).split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const name = `${INVENT_PREFIX[n % INVENT_PREFIX.length]} ${INVENT_TAIL[(n >> 3) % INVENT_TAIL.length]}`
  return {
    id: `invented-${n % 997}`,
    name,
    riffsOn: `${cat} brands in circulation`,
    report: cat.toUpperCase(),
    category: cat,
    product: `${name} Drop`,
    tagline: 'A brand that did not exist until this profile did.',
    voiceScript: `${name} is an invented parody in ${cat}, assembled because no catalog row fit.`,
    targets: p.inferred.interests,
    invented: true,
  }
}

const FIT = 18

export function pickParody(p: VisitorProfile, shown: string[] = [], rounds: ParodyReelSignal[] = []): ParodyMatch {
  const ranked = PARODY_BRANDS
    .filter((b) => !shown.includes(`parody-${b.id}`) && !shown.includes(b.id))
    .map((b) => scoreParody(b, p, rounds))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  const thin = !best || (best.confidence < LOW_CONFIDENCE && best.score < 32)
  if (best && best.score >= FIT && !thin) return best
  const broad = ranked.filter((m) => m.brand.broad || BROAD_FALLBACK_IDS.includes(m.brand.id))
  if (broad[0] && thin) {
    return {
      ...broad[0],
      reasons: [...broad[0].reasons, 'LOW CONFIDENCE — BROAD FALLBACK (COFFEE / STREAMING / SNACK)'],
      confidence: Math.min(broad[0].confidence, 0.34),
    }
  }
  if (best && best.score >= FIT) return best
  const made = inventParody(p, rounds)
  const match = scoreParody(made, p, rounds)
  return {
    ...match,
    brand: made,
    invented: true,
    reasons: [...match.reasons, 'NO CATALOG FIT — INVENTED IN CLOSEST CATEGORY'],
    confidence: Math.max(0.12, match.confidence),
  }
}

export function absurdItem(p: VisitorProfile) {
  const mood = p.inferred.mood
  if (mood === 'anxious' || mood === 'restless') return 'a worry stone that also wirelessly charges three phones'
  if ((p.article.income ?? 3) <= 1) return 'a 7-in-1 everything stick that claims to replace your kitchen'
  if (p.inferred.interests.includes('premium')) return 'a titanium desk orb that "aligns" your calendar'
  return 'a brainrot plush that charges your devices while it doomscrolls'
}

export function parodyReportLine(brand: ParodyBrand) {
  return `${brand.report} (parody of ${brand.riffsOn}) "${brand.name}"`
}
