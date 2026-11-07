export interface ReelClip {
  id: string
  ended: boolean
  duration: number
}

let clip: ReelClip | null = null
const subs = new Set<() => void>()

export function getReelClip() {
  return clip
}

export function subscribeReelClip(cb: () => void) {
  subs.add(cb)
  return () => subs.delete(cb)
}

export function noteReelClip(next: { id: string; ended?: boolean; duration?: number }) {
  const prev = clip?.id === next.id ? clip : { id: next.id, ended: false, duration: 0 }
  clip = {
    id: next.id,
    ended: next.ended ?? prev.ended,
    duration: typeof next.duration === 'number' && next.duration > 0 ? next.duration : prev.duration,
  }
  subs.forEach((cb) => cb())
}

let bc: BroadcastChannel | null = null
function bus() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!bc) {
    bc = new BroadcastChannel('ag-reel')
    bc.onmessage = (e) => {
      if (e.data && typeof e.data.id === 'string') noteReelClip(e.data)
    }
  }
  return bc
}
bus()

export function emitReelClip(next: { id: string; ended?: boolean; duration?: number }) {
  noteReelClip(next)
  const payload = getReelClip()
  if (payload) bus()?.postMessage(payload)
}
