// One shared, module-level connection per page. React components read it with useLive();
// nothing here is created inside effects, so StrictMode can't double-subscribe.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { CONFIG } from '../shared/config.ts'
import type { GenerateRequest, GenerateResponse, Snapshot } from '../shared/types.ts'
import { getBackend, type Command } from './backend.ts'

export type Role = 'library' | 'controller'

export interface Live {
  snap: Snapshot | null
  /** serverNow - Date.now(), so countdowns match the server clock */
  offset: number
  connected: boolean
  backendKind: 'supabase' | 'local' | null
  /** controller: this phone's turn ended or it was dropped from the line */
  ended: boolean
}

let state: Live = { snap: null, offset: 0, connected: false, backendKind: null, ended: false }
const subs = new Set<() => void>()
const set = (patch: Partial<Live>) => {
  state = { ...state, ...patch }
  subs.forEach((f) => f())
}

export function sessionId(): string {
  let id = sessionStorage.getItem('ag-session')
  if (!id) {
    id = 'v-' + crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    sessionStorage.setItem('ag-session', id)
  }
  return id
}

let role: Role | null = null
let lastOk = 0
let wantJoin = true
let wasInQueue = false
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let inflight = false

function applySnap(snap: Snapshot, mid: number) {
  if (state.snap && snap.serverNow < state.snap.serverNow) return // stale, out-of-order reply
  lastOk = Date.now()
  const patch: Partial<Live> = { snap, offset: snap.serverNow - mid, connected: true }
  if (role === 'controller') {
    if (snap.position >= 0) {
      wasInQueue = true
      wantJoin = false
    } else if (wasInQueue) {
      wasInQueue = false
      patch.ended = true
    }
  }
  set(patch)
}

async function refresh() {
  if (inflight) return
  inflight = true
  const b = await getBackend()
  const t0 = Date.now()
  try {
    const snap = role === 'controller' ? await b.heartbeat(sessionId(), wantJoin && !state.ended) : await b.tick()
    applySnap(snap, (t0 + Date.now()) / 2)
  } catch (e) {
    console.warn('heartbeat failed', e)
  } finally {
    inflight = false
  }
}

export function refreshSoon(ms = 120) {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => void refresh(), ms)
}

export function startLive(r: Role) {
  if (role) return
  role = r
  void getBackend().then((b) => {
    set({ backendKind: b.kind })
    b.onPoke(() => refreshSoon())
    void refresh()
    setInterval(() => void refresh(), CONFIG.HEARTBEAT_MS)
    setInterval(() => {
      const ok = Date.now() - lastOk < CONFIG.HEARTBEAT_MS * 2.5
      if (ok !== state.connected) set({ connected: ok })
    }, 1000)
  })
}

export function rejoinQueue() {
  wantJoin = true
  wasInQueue = false
  set({ ended: false })
  void refresh()
}

export const serverNow = () => Date.now() + state.offset
export const getLive = () => state

/** Re-renders the caller every `ms` (for countdowns). */
export function useNow(ms = 250) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
  return serverNow()
}

export async function sendCommand(cmd: Command, arg: string | null = null) {
  const b = await getBackend()
  const t0 = Date.now()
  try {
    const snap = await b.command(sessionId(), cmd, arg)
    applySnap(snap, (t0 + Date.now()) / 2)
    if (cmd !== 'touch') b.poke()
    return snap
  } catch (e) {
    console.warn('command failed', e)
    return null
  }
}

export async function sendGenerate(req: GenerateRequest): Promise<GenerateResponse> {
  const b = await getBackend()
  try {
    const res = await b.generate(req)
    b.poke()
    refreshSoon(50)
    return res
  } catch {
    return { ok: false, reason: 'error' }
  }
}

const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}
export const useLive = () => useSyncExternalStore(subscribe, () => state)
