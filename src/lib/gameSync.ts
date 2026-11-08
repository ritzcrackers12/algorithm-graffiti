import type { AdPlacement } from '../shared/ads.ts'
import type { GameId } from '../shared/games.ts'

export interface GameButton {
  id: string
  label: string
  primary?: boolean
  disabled?: boolean
}

export interface GameWire {
  gameId: GameId | null
  recommended: GameId | null
  controls: GameButton[]
  locked: boolean
  inputSeq: number
  actionId: string | null
  eventSeq: number
  eventType: string | null
  eventData: unknown
  adSeq: number
  adStatus: 'idle' | 'request' | 'playing' | 'done'
  adWatched: boolean
  adPlace: AdPlacement | null
  ended: boolean
  summary: Record<string, unknown> | null
  /** Monotonic. Older snapshots must not wipe newer START/controls. */
  rev: number
}

const EMPTY: GameWire = {
  gameId: null,
  recommended: null,
  controls: [],
  locked: false,
  inputSeq: 0,
  actionId: null,
  eventSeq: 0,
  eventType: null,
  eventData: null,
  adSeq: 0,
  adStatus: 'idle',
  adWatched: false,
  adPlace: null,
  ended: false,
  summary: null,
  rev: 0,
}

const KEY = 'ag-game-wire'
const subs = new Set<() => void>()

function readStored(): GameWire {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    return { ...EMPTY, ...JSON.parse(raw) as GameWire }
  } catch {
    return EMPTY
  }
}

let wire: GameWire = typeof window !== 'undefined' ? readStored() : EMPTY

export function getGameWire() {
  return wire
}

export function subscribeGameWire(cb: () => void) {
  subs.add(cb)
  return () => subs.delete(cb)
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(wire)) } catch { /* ignore */ }
  subs.forEach((cb) => cb())
}

function note(patch: Partial<GameWire>) {
  const incomingRev = patch.rev
  if (incomingRev != null && incomingRev < (wire.rev ?? 0)) return
  const rev = incomingRev != null ? incomingRev : (wire.rev ?? 0) + 1
  wire = { ...wire, ...patch, rev }
  persist()
}

function applyRemote(incoming: GameWire) {
  const hasRev = incoming.rev != null
  const incomingRev = incoming.rev ?? 0
  if (hasRev && incomingRev < (wire.rev ?? 0)) return
  wire = { ...EMPTY, ...incoming, rev: hasRev ? incomingRev : (wire.rev ?? 0) + 1 }
  persist()
}

let bc: BroadcastChannel | null = null
function bus() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!bc) {
    bc = new BroadcastChannel('ag-game')
    bc.onmessage = (e) => {
      if (e.data && typeof e.data === 'object') applyRemote(e.data as GameWire)
    }
  }
  return bc
}
bus()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return
    try {
      applyRemote({ ...EMPTY, ...JSON.parse(e.newValue) as GameWire })
    } catch { /* ignore */ }
  })
}

export function emitGameWire(patch: Partial<GameWire>) {
  note(patch)
  bus()?.postMessage(getGameWire())
}

export function resetGameWire(keep?: Partial<GameWire>) {
  emitGameWire({ ...EMPTY, ...keep, rev: (wire.rev ?? 0) + 1 })
}
