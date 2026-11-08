import { useEffect, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { applyPrompt, emitChatWire } from '../lib/chatSync.ts'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { sendCommand, sessionId } from '../lib/live.ts'
import { CHAT_MAX_TURNS, scriptedNext, type ChatTurn } from '../shared/chatScript.ts'
import type { Snapshot } from '../shared/types.ts'

async function ask(history: ChatTurn[]) {
  const profile = getLocalProfile()
  const fallback = scriptedNext(history, profile)
  try {
    const b = await getBackend()
    const res = await b.chat({ history, profile })
    if (res.ok && res.bot) {
      return { bot: res.bot, chips: res.chips?.length ? res.chips : fallback.chips, topic: res.topic || fallback.topic, source: res.source || 'ai' }
    }
  } catch { /* scripted */ }
  return { bot: fallback.bot, chips: fallback.chips, topic: fallback.topic, source: 'scripted' }
}

function persist(turns: ChatTurn[], topic: string, n: number, source: string) {
  const p = getLocalProfile()
  const session = { ...p.session, chat: { turns, topic, n, source } }
  setLocalProfile({ ...p, session })
  void sendCommand('signal', JSON.stringify({ session }))
}

export default function ChatControls({ snap, locked }: { snap: Snapshot; locked: boolean }) {
  const chat0 = getLocalProfile().session.chat
  const [turns, setTurns] = useState<ChatTurn[]>(chat0.turns)
  const [chips, setChips] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)
  const openedAt = snap.display.openedAt
  const done = turns.filter((t) => t.role === 'user').length >= CHAT_MAX_TURNS

  useEffect(() => {
    let go = true
    const existing = getLocalProfile().session.chat.turns
    setTurns(existing)
    if (existing.length) {
      const last = [...existing].reverse().find((t) => t.role === 'bot')
      if (last) {
        setChips(last.chips ?? [])
        applyPrompt(sessionId(), { id: 'resume', topic: last.topic || '', bot: last.text, chips: last.chips ?? [] }, existing.filter((t) => t.role === 'bot').length)
        return
      }
    }
    setWaiting(true)
    emitChatWire({ session: sessionId(), waiting: true, bot: '', chips: [], n: 0 })
    void ask([]).then((next) => {
      if (!go) return
      const bot: ChatTurn = { role: 'bot', text: next.bot, chips: next.chips, topic: next.topic, at: Date.now() }
      const hist = [bot]
      setTurns(hist)
      setChips(next.chips)
      setWaiting(false)
      persist(hist, next.topic, 1, next.source)
      applyPrompt(sessionId(), { id: next.topic, topic: next.topic, bot: next.bot, chips: next.chips }, 1)
    })
    return () => { go = false }
  }, [openedAt])

  const reply = async (text: string) => {
    const trimmed = text.trim()
    if (locked || waiting || done || !trimmed) return
    haptic('press')
    const user: ChatTurn = { role: 'user', text: trimmed, at: Date.now() }
    const hist = [...turns, user]
    setTurns(hist)
    setDraft('')
    setChips([])
    setWaiting(true)
    emitChatWire({ waiting: true })
    persist(hist, getLocalProfile().session.chat.topic, hist.filter((t) => t.role === 'bot').length, getLocalProfile().session.chat.source)
    if (hist.filter((t) => t.role === 'user').length >= CHAT_MAX_TURNS) {
      setWaiting(false)
      emitChatWire({ waiting: false, bot: 'That is enough for now.', chips: [], n: hist.filter((t) => t.role === 'bot').length })
      return
    }
    const next = await ask(hist)
    const bot: ChatTurn = { role: 'bot', text: next.bot, chips: next.chips, topic: next.topic, at: Date.now() }
    const out = [...hist, bot]
    setTurns(out)
    setChips(next.chips)
    setWaiting(false)
    persist(out, next.topic, out.filter((t) => t.role === 'bot').length, next.source)
    applyPrompt(sessionId(), { id: next.topic, topic: next.topic, bot: next.bot, chips: next.chips }, out.filter((t) => t.role === 'bot').length)
  }

  return (
    <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 8, paddingTop: 6 }}>
      <div className="ctl-display" style={{ fontSize: 14, lineHeight: 1.35 }}>
        {waiting ? 'THINKING.' : done ? 'SESSION RECORDED.' : 'ANSWER ON THIS PHONE.'}
      </div>
      <div className="chat-chips">
        {chips.map((c) => (
          <PixelButton key={c} type="button" disabled={locked || waiting || done} onClick={() => void reply(c)}>
            {c}
          </PixelButton>
        ))}
      </div>
      {!done && (
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            void reply(draft)
          }}
        >
          <input
            className="chat-input"
            value={draft}
            disabled={locked || waiting}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="TYPE A REPLY"
            maxLength={240}
            autoComplete="off"
          />
          <PixelButton type="submit" disabled={locked || waiting || !draft.trim()}>SEND</PixelButton>
        </form>
      )}
    </div>
  )
}
