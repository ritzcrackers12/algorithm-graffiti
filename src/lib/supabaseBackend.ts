import { createClient } from '@supabase/supabase-js'
import { CONFIG } from '../shared/config.ts'
import type { Backend } from './backend.ts'
import type { Snapshot } from '../shared/types.ts'

const TOPIC = 'ag-installation'

export function createSupabaseBackend(url: string, key: string): Backend {
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const listeners = new Set<() => void>()
  const fire = () => listeners.forEach((cb) => cb())

  // One channel for the whole app (never created inside React effects, so StrictMode can't double it).
  const channel = sb.channel(TOPIC, { config: { broadcast: { self: false } } })
  channel.on('broadcast', { event: 'state' }, fire)
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') fire()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fire()
  })

  const P = {
    p_turn: CONFIG.TURN_SECONDS,
    p_idle: CONFIG.IDLE_SECONDS,
    p_gone: CONFIG.GONE_SECONDS,
    p_wait: CONFIG.WAITING_GONE_SECONDS,
    p_reset: CONFIG.RESET_MODE,
  }
  const rpc = async (fn: string, args: Record<string, unknown>): Promise<Snapshot> => {
    const { data, error } = await sb.rpc(fn, args)
    if (error) throw error
    return data as Snapshot
  }

  return {
    kind: 'supabase',
    heartbeat: (session, join) => rpc('ag_heartbeat', { p_session: session, p_join: join, ...P }),
    tick: () => rpc('ag_tick', P),
    command: (session, cmd, arg = null) => rpc('ag_command', { p_session: session, p_cmd: cmd, p_arg: arg, ...P }),
    async generate(req) {
      const { data, error } = await sb.functions.invoke('generate', { body: req })
      if (error) return { ok: false, reason: 'error' }
      return data
    },
    async admin(passcode, action) {
      const { data, error } = await sb.functions.invoke('admin', { body: { passcode, action } })
      if (error) return { ok: false }
      return data
    },
    onPoke(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    poke() {
      void channel.send({ type: 'broadcast', event: 'state', payload: {} })
    },
  }
}
