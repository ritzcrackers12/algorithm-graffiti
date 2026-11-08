import { GAMES, type GameId } from '../shared/games.ts'

const BASE = import.meta.env.BASE_URL
const P5 = `${BASE}vendor/p5.min.js`

export interface GameButton {
  id: string
  label: string
  primary?: boolean
  disabled?: boolean
}

export interface GameBridge {
  onInput(fn: (actionId: string) => void): void
  setControls(list: GameButton[], opts?: { locked?: boolean }): void
  emit(type: string, data?: unknown): void
  requestAd(opts?: { reward?: unknown }): Promise<{ watched: boolean }>
  onEnd(summary: Record<string, unknown>): void
}

export interface GameHandle {
  end(reason?: string): void
  getSummary(): unknown
  destroy(): void
}

export interface GameModule {
  meta: { id: string; title: string; behaviors: string[] }
  defaults: Record<string, unknown>
  profileRules: Record<string, unknown>
  configFromProfile: (profile: unknown, extra?: unknown) => Record<string, unknown>
  create: (container: HTMLElement, config: unknown, bridge: GameBridge) => GameHandle
}

declare global {
  interface Window {
    GAME_HOST?: boolean
    Games?: Record<string, GameModule>
    p5?: new (sketch: unknown, node?: HTMLElement) => unknown
  }
}

const loaded = new Set<string>()

function loadScript(src: string) {
  if (loaded.has(src)) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.onload = () => {
      loaded.add(src)
      resolve()
    }
    el.onerror = () => reject(new Error(`script ${src}`))
    document.head.appendChild(el)
  })
}

export function preloadP5() {
  window.GAME_HOST = true
  return loadScript(P5)
}

export async function loadGameModule(id: GameId): Promise<GameModule> {
  window.GAME_HOST = true
  await loadScript(P5)
  if (typeof window.p5 !== 'function') throw new Error('p5 did not load')
  const row = GAMES.find((g) => g.id === id)
  if (!row) throw new Error(`unknown game ${id}`)
  await loadScript(`${BASE}games/${row.file}?v=6`)
  const mod = window.Games?.[id] ?? window.Games?.[row.file.replace(/\.js$/, '')]
  if (!mod?.create) throw new Error(`game ${id} did not register`)
  return mod
}
