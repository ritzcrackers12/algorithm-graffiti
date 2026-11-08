/** Editable interest taxonomy. Reel Lists + ad scoring both read from here. */

export const REEL_TOPICS = [
  'food', 'fitness', 'beauty/fashion', 'humor', 'animals', 'travel', 'music/dance', 'sports',
  'tech', 'money', 'relationships', 'news/politics', 'home/DIY', 'art', 'cars', 'gaming',
  'wellness', 'coffee', 'nightlife', 'luxury', 'mental-health', 'astrology', 'dating', 'fashion/streetwear',
  'finance/investing', 'crypto', 'tech/AI',
]

export const REEL_SUBTOPICS = [
  'looksmaxxing', 'skincare', 'streetwear', 'gym bro', 'pilates', 'mukbang', 'recipe', 'day trading',
  'crypto', 'side hustle', 'ASMR', 'prank', 'dating advice', 'conspiracy', 'motivational', 'cottagecore',
  'luxury lifestyle', 'life hack', 'ai slop', 'matcha', 'therapy', 'meditation', 'astrology', 'HIIT',
  'coffee', 'natural wine', 'dispensary', 'telehealth', 'AI tools', 'cookware', 'credit cards',
  'boutique fitness', 'smoothie',
]

export const REEL_AUDIENCES = [
  'general', 'teens', 'young women', 'young men', 'parents', 'students', 'professionals', 'older adults',
  'gamers', 'gym/fitness', 'self-improvement', 'hustle/finance', 'wellness/spiritual', 'politically left',
  'politically right', 'fringe', 'nyc', 'college grads',
]

/** One family per brand cluster — sponsored `ad_category` should use these names. */
export const AD_FAMILIES = [
  'payday loans', 'luxury', 'fitness/supplements', 'food delivery', 'dating', 'investing/crypto',
  'beauty', 'travel', 'gaming', 'wellness/therapy', 'tech gadgets', 'fashion',
  'wellness grocery', 'fast-casual food', 'boutique fitness', 'coffee', 'mental-health', 'meditation',
  'men\'s telehealth', 'women\'s telehealth', 'astrology', 'stock trading', 'streetwear', 'AI tools',
  'cookware', 'premium card', 'natural wine', 'cannabis', 'music streaming', 'betting', 'energy drink',
  'EV', 'nicotine', 'hustle course', 'selling course', 'Political UGC', 'AI Video company', 'dropship',
]

export const INTEREST_CLUSTERS: { id: string; keys: string[] }[] = [
  { id: 'wellness', keys: ['wellness', 'smoothie', 'clean', 'pilates', 'meditation', 'skincare', 'glow'] },
  { id: 'fitness', keys: ['fitness', 'gym', 'hiit', 'pilates', 'sweat', 'workout'] },
  { id: 'beauty', keys: ['skincare', 'beauty', 'glow', 'looksmaxxing'] },
  { id: 'fashion', keys: ['fashion', 'streetwear', 'sneakers', 'haul', 'luxury'] },
  { id: 'food', keys: ['food', 'bowl', 'lunch', 'grocery', 'cook'] },
  { id: 'coffee', keys: ['coffee', 'matcha', 'latte'] },
  { id: 'finance', keys: ['finance', 'invest', 'trading', 'stocks', 'markets'] },
  { id: 'crypto', keys: ['crypto', 'coin', 'bitcoin'] },
  { id: 'mental-health', keys: ['anxious', 'therapy', 'mental', 'lonely', 'stress', 'melancholy', 'numb'] },
  { id: 'tech', keys: ['tech', 'ai', 'chatgpt', 'productivity'] },
  { id: 'astrology', keys: ['astrology', 'spiritual', 'star', 'cosmic'] },
  { id: 'nightlife', keys: ['nightlife', 'wine', 'bar', 'dispensary'] },
  { id: 'luxury', keys: ['luxury', 'premium', 'status', 'platinum', 'aspirational'] },
  { id: 'dating', keys: ['dating', 'lonely', 'single', 'rizz'] },
  { id: 'gaming', keys: ['gaming', 'gamer', 'game'] },
  { id: 'sports', keys: ['sports', 'betting'] },
  { id: 'music', keys: ['music', 'audio', 'spotify', 'sound'] },
]

export const BROAD_FALLBACK_IDS = ['blank-slate', 'spinnr', 'freshleaf', 'foryou-finds']
export const LOW_CONFIDENCE = 0.36

/** Editable DigiPet → ad mapping. */
export const PET_AD_RULES = {
  premiumFamilies: ['luxury', 'fashion', 'streetwear', 'premium card', 'EV', 'beauty'],
  budgetFamilies: ['dropship', 'fast-casual food', 'hustle course', 'selling course'],
  categoryToFamily: {
    food: ['food delivery', 'fast-casual food', 'wellness grocery'],
    indulgence: ['food delivery', 'nightlife', 'music streaming'],
    hygiene: ['beauty', 'wellness/therapy'],
    health: ['wellness/therapy', 'mental-health', 'meditation'],
    goods: ['fashion', 'tech gadgets', 'streetwear'],
    luxury: ['luxury', 'fashion', 'premium card'],
  } as Record<string, string[]>,
  practicalFamilies: ['wellness grocery', 'mental-health', 'premium card'],
  indulgentFamilies: ['dropship', 'food delivery', 'nightlife', 'haul'],
  stressFamilies: ['payday loans', 'betting', 'hustle course', 'investing/crypto', 'crypto'],
}
