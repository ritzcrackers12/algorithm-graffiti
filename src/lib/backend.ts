import type { ChatTurn } from '../shared/chatScript.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { AdminAction, AdminExtra, AdminStatus, GenerateRequest, GenerateResponse, Snapshot } from '../shared/types.ts'

export interface ChatAsk {
  history: ChatTurn[]
  profile?: VisitorProfile
}

export interface ChatReply {
  ok: boolean
  bot?: string
  chips?: string[]
  topic?: string
  source?: string
}

export type Command = 'touch' | 'open' | 'home' | 'view' | 'end' | 'done' | 'story' | 'signal'

export interface Backend {
  kind: 'supabase' | 'local'
  heartbeat(session: string, join: boolean): Promise<Snapshot>
  tick(): Promise<Snapshot>
  command(session: string, cmd: Command, arg?: string | null): Promise<Snapshot>
  generate(req: GenerateRequest): Promise<GenerateResponse>
  admin(passcode: string, action: AdminAction, extra?: AdminExtra): Promise<{ ok: boolean; status?: AdminStatus; tests?: unknown; tokenSaved?: string }>
  /** Called whenever another device changed the shared state. */
  onPoke(cb: () => void): () => void
  /** Tell other devices to refresh now. */
  poke(): void
  /** iPad reports clip duration / end so the phone can follow along. */
  reportReel(clip: { id: string; ended?: boolean; duration?: number }): void
  /** Phone ⇄ iPad chatbot lines. */
  reportChat(state: import('./chatSync.ts').ChatWire): void
  chat(req: ChatAsk): Promise<ChatReply>
}

let instance: Backend | null = null

export async function getBackend(): Promise<Backend> {
  if (instance) return instance
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && key && !new URLSearchParams(location.search).has('local')) {
    const { createSupabaseBackend } = await import('./supabaseBackend.ts')
    instance = createSupabaseBackend(url, key)
  } else {
    const { createLocalBackend } = await import('./localBackend.ts')
    instance = createLocalBackend()
  }
  return instance
}
