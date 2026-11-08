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
  { slotId: 'comedy-safe', clipId: '003', bucket: 'comedy', corner: 'safe-obscure', dials: [18, 82, 35], legitimacy: 74, sponsored: false, tags: ['dance', 'ugc'] },
  { slotId: 'comedy-mid', clipId: '004', bucket: 'comedy', corner: 'mid-battle', dials: [62, 55, 28], legitimacy: 80, sponsored: false, tags: ['rap', 'performance'] },
  { slotId: 'comedy-edgy', clipId: '002', bucket: 'comedy', corner: 'edgy-ironic', dials: [78, 48, 88], legitimacy: 38, sponsored: true, tags: ['political', 'ugc'] },
  { slotId: 'life-free', clipId: '003', bucket: 'lifestyle', corner: 'free-raw', dials: [22, 40, 70], legitimacy: 74, sponsored: false, tags: ['dance', 'youth'] },
  { slotId: 'life-looks', clipId: '001', bucket: 'lifestyle', corner: 'pricey-polished', dials: [48, 72, 78], legitimacy: 16, sponsored: true, tags: ['looksmaxxing', 'course'] },
  { slotId: 'life-slop', clipId: '005', bucket: 'lifestyle', corner: 'polished-mid', dials: [62, 85, 55], legitimacy: 22, sponsored: true, tags: ['ai', 'ad'] },
  { slotId: 'body-looks', clipId: '001', bucket: 'body', corner: 'aesthetic-niche', dials: [12, 48, 82], legitimacy: 16, sponsored: true, tags: ['looksmaxxing', 'face'] },
  { slotId: 'body-dance', clipId: '003', bucket: 'body', corner: 'performance-mid', dials: [70, 60, 50], legitimacy: 74, sponsored: false, tags: ['dance', 'movement'] },
  { slotId: 'body-hype', clipId: '005', bucket: 'body', corner: 'intense-broad', dials: [55, 70, 40], legitimacy: 22, sponsored: true, tags: ['ai', 'body'] },
  { slotId: 'mind-calm', clipId: '001', bucket: 'mind', corner: 'belief-mid', dials: [40, 30, 65], legitimacy: 16, sponsored: true, tags: ['self', 'course'] },
  { slotId: 'mind-hot', clipId: '002', bucket: 'mind', corner: 'activating-belief', dials: [80, 70, 55], legitimacy: 38, sponsored: true, tags: ['politics', 'identity'] },
  { slotId: 'mind-slop', clipId: '005', bucket: 'mind', corner: 'performative', dials: [72, 45, 80], legitimacy: 22, sponsored: true, tags: ['ai', 'ad'] },
  { slotId: 'money-grift', clipId: '001', bucket: 'money', corner: 'risky-fast-status', dials: [78, 82, 85], legitimacy: 16, sponsored: true, tags: ['course', 'hustle'] },
  { slotId: 'money-ads', clipId: '005', bucket: 'money', corner: 'mid-fast', dials: [55, 70, 60], legitimacy: 22, sponsored: true, tags: ['ad', 'spend'] },
  { slotId: 'money-safe', clipId: '002', bucket: 'money', corner: 'safer-mid', dials: [40, 50, 45], legitimacy: 38, sponsored: true, tags: ['politics', 'status'] },
  { slotId: 'cult-tech', clipId: '002', bucket: 'culture', corner: 'tech-heated', dials: [25, 82, 78], legitimacy: 38, sponsored: true, tags: ['politics', 'tech'] },
  { slotId: 'cult-hum', clipId: '004', bucket: 'culture', corner: 'humanities-mid', dials: [85, 58, 42], legitimacy: 80, sponsored: false, tags: ['rap', 'battle'] },
  { slotId: 'cult-calm', clipId: '003', bucket: 'culture', corner: 'calm-consensus', dials: [60, 30, 35], legitimacy: 74, sponsored: false, tags: ['dance', 'youth'] },
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
