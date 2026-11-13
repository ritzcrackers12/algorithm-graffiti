// Lightweight phone->iPad "control" messages for transient display actions
// (station play/pause, article scroll) that don't belong in the DB snapshot.
// Mirrors reelSync: a broadcast event carries these, views subscribe to react.
export type ControlMsg =
  | { kind: 'audio'; action: 'play' | 'pause' | 'replay' }
  | { kind: 'scroll'; dir: 'up' | 'down'; pane?: 'original' | 'altered' | 'both' }

let last: (ControlMsg & { seq: number }) | null = null
let seq = 0
const subs = new Set<() => void>()

export function getControl() {
  return last
}

export function subscribeControl(cb: () => void) {
  subs.add(cb)
  return () => subs.delete(cb)
}

/** Record an incoming control (from the realtime channel) and notify views. */
export function noteControl(msg: ControlMsg) {
  seq += 1
  last = { ...msg, seq }
  subs.forEach((cb) => cb())
}

// Same-device fallback (?local mode, dev) via BroadcastChannel.
let bc: BroadcastChannel | null = null
function bus() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!bc) {
    bc = new BroadcastChannel('ag-control')
    bc.onmessage = (e) => {
      if (e.data && typeof e.data.kind === 'string') noteControl(e.data as ControlMsg)
    }
  }
  return bc
}
bus()

export function emitControlLocal(msg: ControlMsg) {
  bus()?.postMessage(msg)
  noteControl(msg)
}
