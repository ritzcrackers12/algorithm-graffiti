import type { ObjectId } from './config.ts'

export const INPUT_IDS: ObjectId[] = ['article', 'reel']
export const OUTPUT_IDS: ObjectId[] = ['ad', 'chat']
export const ALL_OBJECT_IDS: ObjectId[] = ['article', 'reel', 'ad', 'chat']
/** Advertisement and Chatbot unlock after this many input objects have been opened. */
export const UNLOCK_AFTER = 2

export function objectsTouched(snap?: {
  display?: { used?: string[]; completed?: string[] }
  altered?: { article?: unknown; reel?: unknown; ad?: unknown; chat?: unknown }
  profile?: { session?: { reel?: { currentId?: string | null }; ad?: { brandId?: string | null }; chat?: { turns?: unknown[] } } }
} | null): string[] {
  const ids = new Set<string>([...(snap?.display?.used ?? []), ...(snap?.display?.completed ?? [])])
  if (snap?.altered?.article) ids.add('article')
  if (snap?.altered?.reel) ids.add('reel')
  if (snap?.altered?.ad) ids.add('ad')
  if (snap?.altered?.chat) ids.add('chat')
  if (snap?.profile?.session?.reel?.currentId) ids.add('reel')
  if (snap?.profile?.session?.ad?.brandId) ids.add('ad')
  if ((snap?.profile?.session?.chat?.turns?.length ?? 0) > 0) ids.add('chat')
  return [...ids]
}

export function inputCount(used: readonly string[] = []) {
  return INPUT_IDS.filter((id) => used.includes(id)).length
}

export function objectLocked(id: string, used: readonly string[] = []) {
  if (INPUT_IDS.includes(id as ObjectId)) return false
  if (OUTPUT_IDS.includes(id as ObjectId)) return inputCount(used) < UNLOCK_AFTER
  return true
}

export function reportReady(used: readonly string[] = []) {
  return ALL_OBJECT_IDS.every((id) => used.includes(id))
}
