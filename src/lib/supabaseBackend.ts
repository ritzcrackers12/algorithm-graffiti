import { createClient } from '@supabase/supabase-js'
import { CONFIG } from '../shared/config.ts'
import type { Backend } from './backend.ts'
import { applyRemoteChat, type ChatWire } from './chatSync.ts'
import { emitReelClip, noteReelClip } from './reelSync.ts'
import type { Snapshot } from '../shared/types.ts'

const TOPIC = 'ag-installation'

export function createSupabaseBackend(url: string, key: string): Backend {
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const listeners = new Set<() => void>()
  const fire = () => listeners.forEach((cb) => cb())

  const channel = sb.channel(TOPIC, { config: { broadcast: { self: false } } })
  channel.on('broadcast', { event: 'state' }, fire)
  channel.on('broadcast', { event: 'reel' }, ({ payload }) => {
    if (payload && typeof payload === 'object' && 'id' in payload) {
      noteReelClip(payload as { id: string; ended?: boolean; duration?: number })
    }
    fire()
  })
  channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
    if (payload && typeof payload === 'object') applyRemoteChat(payload as ChatWire)
    fire()
  })
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
    async admin(passcode, action, extra) {
      const { data, error } = await sb.functions.invoke('admin', { body: { passcode, action, ...extra } })
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
    reportReel(clip) {
      emitReelClip(clip)
      void channel.send({ type: 'broadcast', event: 'reel', payload: clip })
    },
    reportChat(state) {
      void channel.send({ type: 'broadcast', event: 'chat', payload: state })
    },
    async chat(req) {
      const { data, error } = await sb.functions.invoke('chat', { body: req })
      if (error) return { ok: false }
      return data
    },
    async portrait(profile) {
      try {
        const { data, error } = await sb.functions.invoke('chat', { body: { mode: 'portrait', profile } })
        if (error || !data?.ok || !Array.isArray(data.portrait)) return null
        return data.portrait as { k: string; v: string }[]
      } catch {
        return null
      }
    },
  }
}
