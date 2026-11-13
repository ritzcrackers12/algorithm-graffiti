import type { ChatFrom, PersonaId, ScenarioId } from '../shared/chatScript.ts'

export interface ChatWire {
  session: string
  rev: number
  bot: string
  from: ChatFrom
  chips: string[]
  topic: string
  n: number
  waiting: boolean
  typingFrom: PersonaId | ''
  scenario: ScenarioId | null
}

const empty: ChatWire = {
  session: '',
  rev: 0,
  bot: '',
  from: 'jules',
  chips: [],
  topic: '',
  n: 0,
  waiting: false,
  typingFrom: '',
  scenario: null,
}

let wire: ChatWire = { ...empty }
const subs = new Set<() => void>()
let echoing = false

export function getChatWire() {
  return wire
}

export function subscribeChatWire(cb: () => void) {
  subs.add(cb)
  return () => subs.delete(cb)
}

export function noteChatWire(next: Partial<ChatWire>) {
  wire = { ...wire, ...next }
  subs.forEach((cb) => cb())
}

export function emitChatWire(next: Partial<ChatWire>) {
  noteChatWire({ ...next, rev: Date.now() })
  bus()?.postMessage(wire)
  if (echoing) return
  void import('./backend.ts').then(({ getBackend }) => getBackend().then((b) => b.reportChat(wire))).catch(() => {})
}

export function applyRemoteChat(next: ChatWire) {
  echoing = true
  noteChatWire(next)
  echoing = false
}

export function resetChatWire() {
  wire = { ...empty, rev: Date.now() }
  subs.forEach((cb) => cb())
}

let bc: BroadcastChannel | null = null
function bus() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!bc) {
    bc = new BroadcastChannel('ag-chat')
    bc.onmessage = (e) => {
      if (e.data && typeof e.data === 'object' && 'bot' in e.data) {
        applyRemoteChat(e.data as ChatWire)
      }
    }
  }
  return bc
}
bus()
