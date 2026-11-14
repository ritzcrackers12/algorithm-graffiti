/** Five real clips, mapped onto bucket/dial slots. Same mp4 may sit in several corners. Do not invent extra videos. */

export type ReelBucket = 'comedy' | 'lifestyle' | 'body' | 'mind' | 'money' | 'culture'

export interface ReelBucketMeta {
  id: ReelBucket
  label: string
  subtitle: string
  poles: [[string, string], [string, string], [string, string]]
}

export const REEL_BUCKETS: ReelBucketMeta[] = [
  { id: 'comedy', label: 'COMEDY', subtitle: 'jokes, bits, chaos', poles: [['SAFE', 'EDGY'], ['MAINSTREAM', 'OBSCURE'], ['SINCERE', 'IRONIC']] },
  { id: 'lifestyle', label: 'LIFESTYLE', subtitle: 'taste, things, scenes', poles: [['FREE', 'PRICEY'], ['RAW', 'POLISHED'], ['BROAD', 'NICHE']] },
  { id: 'body', label: 'BODY', subtitle: 'looks, moves, health', poles: [['AESTHETIC', 'PERFORMANCE'], ['GENTLE', 'INTENSE'], ['BROAD', 'NICHE']] },
  { id: 'mind', label: 'MIND', subtitle: 'calm, beliefs, selfhood', poles: [['SOOTHING', 'ACTIVATING'], ['EVIDENCE', 'BELIEF'], ['SINCERE', 'PERFORMATIVE']] },
  { id: 'money', label: 'MONEY', subtitle: 'hustle, risk, status', poles: [['SAFE', 'RISKY'], ['SLOW', 'FAST'], ['NEED', 'STATUS']] },
  { id: 'culture', label: 'CULTURE', subtitle: 'takes, tech, debate', poles: [['TECH', 'HUMANITIES'], ['CALM', 'HEATED'], ['CONSENSUS', 'HETERODOX']] },
]

export interface ReelSlot {
  slotId: string
  clipId: string
  bucket: ReelBucket
  corner: string
  dials: [number, number, number]
  legitimacy: number
  sponsored: boolean
  tags: string[]
}

export const REEL_SLOTS: ReelSlot[] = [
  { slotId: 'comedy-1', clipId: 'Comedy1', bucket: 'comedy', corner: 'wholesome-viral', dials: [0, 0, 0], legitimacy: 75, sponsored: false, tags: ['wholesome', 'viral'] },
  { slotId: 'comedy-2', clipId: 'Comedy2', bucket: 'comedy', corner: 'relatable-skit', dials: [25, 25, 50], legitimacy: 75, sponsored: false, tags: ['skit', 'relatable'] },
  { slotId: 'comedy-3', clipId: 'Comedy3', bucket: 'comedy', corner: 'underground-dance', dials: [25, 100, 25], legitimacy: 75, sponsored: false, tags: ['dance', 'ugc'] },
  { slotId: 'comedy-4', clipId: 'Comedy4', bucket: 'comedy', corner: 'edgy-street-bit', dials: [100, 25, 75], legitimacy: 75, sponsored: false, tags: ['standup', 'edgy'] },
  { slotId: 'comedy-5', clipId: 'Comedy5', bucket: 'comedy', corner: 'deep-fried-meme', dials: [50, 75, 100], legitimacy: 75, sponsored: false, tags: ['meme', 'ironic'] },
  { slotId: 'comedy-6', clipId: 'Comedy6', bucket: 'comedy', corner: 'political-everyman-ad', dials: [75, 50, 75], legitimacy: 18, sponsored: true, tags: ['political', 'ugc'] },
  { slotId: 'lifestyle-1', clipId: 'Lifestyle1', bucket: 'lifestyle', corner: 'thrift-haul', dials: [0, 25, 25], legitimacy: 75, sponsored: false, tags: ['thrift', 'haul'] },
  { slotId: 'lifestyle-2', clipId: 'Lifestyle2', bucket: 'lifestyle', corner: 'clean-girl-routine', dials: [75, 100, 25], legitimacy: 75, sponsored: false, tags: ['routine', 'aesthetic'] },
  { slotId: 'lifestyle-3', clipId: 'Lifestyle3', bucket: 'lifestyle', corner: 'miami-luxury-flex', dials: [100, 75, 75], legitimacy: 75, sponsored: false, tags: ['luxury', 'flex'] },
  { slotId: 'lifestyle-4', clipId: '001', bucket: 'lifestyle', corner: 'glow-up-course-ad', dials: [50, 75, 100], legitimacy: 18, sponsored: true, tags: ['looksmaxxing', 'course'] },
  { slotId: 'lifestyle-5', clipId: '005', bucket: 'lifestyle', corner: 'ai-slop-ad-ad', dials: [50, 100, 50], legitimacy: 18, sponsored: true, tags: ['ai', 'ad'] },
  { slotId: 'lifestyle-6', clipId: 'Lifestyle6', bucket: 'lifestyle', corner: 'cottagecore-niche', dials: [25, 50, 100], legitimacy: 75, sponsored: false, tags: ['cottagecore', 'niche'] },
  { slotId: 'body-1', clipId: 'Body1', bucket: 'body', corner: 'mirror-looksmax', dials: [0, 25, 100], legitimacy: 75, sponsored: false, tags: ['looksmaxxing', 'face'] },
  { slotId: 'body-2', clipId: 'Body2', bucket: 'body', corner: 'pilates-glow', dials: [25, 25, 25], legitimacy: 75, sponsored: false, tags: ['pilates', 'aesthetic'] },
  { slotId: 'body-3', clipId: 'Body3', bucket: 'body', corner: 'gym-pr-hype', dials: [75, 100, 25], legitimacy: 75, sponsored: false, tags: ['gym', 'hype'] },
  { slotId: 'body-4', clipId: 'Body4', bucket: 'body', corner: 'science-of-training', dials: [100, 50, 75], legitimacy: 75, sponsored: false, tags: ['science', 'fitness'] },
  { slotId: 'body-5', clipId: 'Body5', bucket: 'body', corner: 'russian-hardcore', dials: [100, 100, 100], legitimacy: 75, sponsored: false, tags: ['bodybuilding', 'niche'] },
  { slotId: 'body-6', clipId: 'Body6', bucket: 'body', corner: 'transformation-ad-ad', dials: [25, 75, 0], legitimacy: 18, sponsored: true, tags: ['supplement', 'ad'] },
  { slotId: 'mind-1', clipId: 'Mind1', bucket: 'mind', corner: 'sleep-asmr', dials: [0, 50, 0], legitimacy: 75, sponsored: false, tags: ['asmr', 'sleep'] },
  { slotId: 'mind-2', clipId: 'Mind2', bucket: 'mind', corner: 'therapy-speak', dials: [25, 25, 0], legitimacy: 75, sponsored: false, tags: ['therapy', 'mental-health'] },
  { slotId: 'mind-3', clipId: 'Mind3', bucket: 'mind', corner: 'astrology-manifest', dials: [50, 100, 75], legitimacy: 75, sponsored: false, tags: ['astrology', 'belief'] },
  { slotId: 'mind-4', clipId: 'Mind4', bucket: 'mind', corner: 'hustle-mindset-ad', dials: [100, 75, 75], legitimacy: 18, sponsored: true, tags: ['self', 'course'] },
  { slotId: 'mind-5', clipId: 'Mind5', bucket: 'mind', corner: 'podcast-hot-take', dials: [75, 75, 50], legitimacy: 75, sponsored: false, tags: ['podcast', 'identity'] },
  { slotId: 'mind-6', clipId: 'Mind6', bucket: 'mind', corner: 'ai-self-help-slop-ad', dials: [75, 50, 100], legitimacy: 18, sponsored: true, tags: ['ai', 'ad'] },
  { slotId: 'money-1', clipId: 'Money1', bucket: 'money', corner: 'index-fund-boring', dials: [0, 0, 25], legitimacy: 75, sponsored: false, tags: ['investing', 'safe'] },
  { slotId: 'money-2', clipId: 'Money2', bucket: 'money', corner: 'buy-a-house-young', dials: [25, 25, 50], legitimacy: 75, sponsored: false, tags: ['finance', 'practical'] },
  { slotId: 'money-3', clipId: 'Money3', bucket: 'money', corner: 'day-trading-flex', dials: [75, 100, 75], legitimacy: 75, sponsored: false, tags: ['trading', 'flex'] },
  { slotId: 'money-4', clipId: 'Money4', bucket: 'money', corner: 'crypto-nft-peak', dials: [100, 75, 100], legitimacy: 75, sponsored: false, tags: ['crypto', 'status'] },
  { slotId: 'money-5', clipId: 'Money5', bucket: 'money', corner: 'get-rich-course-ad', dials: [100, 100, 100], legitimacy: 18, sponsored: true, tags: ['course', 'hustle'] },
  { slotId: 'money-6', clipId: 'Money6', bucket: 'money', corner: 'spend-ad-ad', dials: [50, 50, 75], legitimacy: 18, sponsored: true, tags: ['ad', 'spend'] },
  { slotId: 'culture-1', clipId: 'Culture1', bucket: 'culture', corner: 'tech-explainer', dials: [0, 0, 0], legitimacy: 75, sponsored: false, tags: ['tech', 'news'] },
  { slotId: 'culture-2', clipId: 'Culture2', bucket: 'culture', corner: 'humanities-essay', dials: [100, 25, 25], legitimacy: 75, sponsored: false, tags: ['humanities', 'essay'] },
  { slotId: 'culture-3', clipId: '002', bucket: 'culture', corner: 'heated-political-ugc-ad', dials: [25, 100, 75], legitimacy: 18, sponsored: true, tags: ['political', 'tech'] },
  { slotId: 'culture-4', clipId: '004', bucket: 'culture', corner: 'rap-battle', dials: [100, 50, 25], legitimacy: 75, sponsored: false, tags: ['rap', 'battle'] },
  { slotId: 'culture-5', clipId: 'Culture5', bucket: 'culture', corner: 'contrarian-hot-take', dials: [50, 75, 100], legitimacy: 75, sponsored: false, tags: ['contrarian', 'debate'] },
  { slotId: 'culture-6', clipId: 'Culture6', bucket: 'culture', corner: 'clean-viral-dance', dials: [50, 0, 0], legitimacy: 75, sponsored: false, tags: ['dance', 'youth'] },
]

export function bucketMeta(id: ReelBucket) {
  return REEL_BUCKETS.find((b) => b.id === id) ?? REEL_BUCKETS[0]
}

export function slotsIn(bucket: ReelBucket) {
  return REEL_SLOTS.filter((s) => s.bucket === bucket)
}

export function dist3(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function nearestSlot(bucket: ReelBucket, dials: [number, number, number]) {
  const rows = slotsIn(bucket)
  let best = rows[0]
  let bestD = Infinity
  for (const row of rows) {
    const d = dist3(dials, row.dials)
    if (d < bestD) {
      best = row
      bestD = d
    }
  }
  return { slot: best, distance: bestD }
}

export function twistDistance(from: [number, number, number], to: [number, number, number]) {
  return Math.round(dist3(from, to))
}
