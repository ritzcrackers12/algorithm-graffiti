import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { emitChatWire } from '../lib/chatSync.ts'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { sendCommand, sessionId } from '../lib/live.ts'
import {
  CHAT_MAX_TURNS, PERSONA_IDS, isPersona, isOvershare, isYou, scriptedNext,
  type ChatCovert, type ChatTurn, type PersonaId,
} from '../shared/chatScript.ts'
import type { Snapshot } from '../shared/types.ts'

function sleep(ms: number) {
  return new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })
}

function burstFrom(res: {
  messages?: { from: PersonaId; text: string }[]
  bot?: string
  chips?: string[]
  topic?: string
  source?: string
  done?: boolean
}, fallbackChips: string[]) {
  const messages = res.messages?.filter((m) => isPersona(m.from) && m.text.trim()).map((m) => ({
    from: m.from,
    text: m.text.trim(),
  })) ?? []
  if (!messages.length && res.bot) messages.push({ from: 'rik', text: res.bot })
  return {
    messages,
    chips: res.chips?.length ? res.chips : fallbackChips,
    topic: res.topic || '',
    source: res.source || 'scripted',
    done: !!res.done,
  }
}

async function ask(history: ChatTurn[]) {
  const profile = getLocalProfile()
  const fallback = scriptedNext(history, profile)
  try {
    const b = await getBackend()
    const res = await b.chat({ history, profile })
    if (res.ok && (res.messages?.length || res.bot)) return burstFrom(res, fallback.chips)
  } catch { /* scripted */ }
  return burstFrom({ ...fallback, source: 'scripted' }, fallback.chips)
}

function persist(turns: ChatTurn[], topic: string, n: number, source: string, log?: ChatCovert[]) {
  const p = getLocalProfile()
  const session = {
    ...p.session,
    chat: { turns, topic, n, source, log: log ?? p.session.chat.log ?? [] },
  }
  const events = [...p.events]
  const lastYou = [...turns].reverse().find(isYou)
  if (lastYou && !events.some((e) => e.source === 'chat' && e.value === lastYou.text && e.at === lastYou.at)) {
    events.push({ source: 'chat', key: topic || 'chat', value: lastYou.text, at: lastYou.at })
  }
  setLocalProfile({ ...p, session, events })
  void sendCommand('signal', JSON.stringify({ session, events }))
}

export default function ChatControls({ snap, locked }: { snap: Snapshot; locked: boolean }) {
  const chat0 = getLocalProfile().session.chat
  const [turns, setTurns] = useState<ChatTurn[]>(chat0.turns)
  const [chips, setChips] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [edits, setEdits] = useState(0)
  const askedAt = useRef(Date.now())
  const openedAt = snap.display.openedAt
  const done = turns.some((t) => t.topic === 'done') || turns.filter(isYou).length >= CHAT_MAX_TURNS

  useEffect(() => {
    const alive = { go: true }
    const existing = getLocalProfile().session.chat.turns
    setTurns(existing)
    setEdits(0)
    if (existing.length) {
      const last = [...existing].reverse().find((t) => !isYou(t) && t.chips?.length)
      if (last) {
        setChips(last.chips ?? [])
        askedAt.current = last.at
        emitChatWire({
          session: sessionId(),
          bot: last.text,
          from: last.from && last.from !== 'you' ? last.from : 'jules',
          chips: last.chips ?? [],
          topic: last.topic || '',
          n: existing.filter((t) => !isYou(t)).length,
          waiting: false,
          typingFrom: '',
        })
      }
      return () => { alive.go = false }
    }
    setWaiting(true)
    emitChatWire({ session: sessionId(), waiting: true, typingFrom: 'jules', bot: '', chips: [], n: 0 })
    void (async () => {
      const next = await ask([])
      if (!alive.go) return
      await playBurst(next, [], alive)
    })()
    return () => { alive.go = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt])

  const playBurst = async (
    next: { messages: { from: PersonaId; text: string }[]; chips: string[]; topic: string; source: string; done?: boolean },
    hist: ChatTurn[],
    alive: { go: boolean },
  ) => {
    setWaiting(true)
    setChips([])
    let acc = hist
    for (let i = 0; i < next.messages.length; i++) {
      const m = next.messages[i]
      emitChatWire({ waiting: true, typingFrom: m.from, session: sessionId() })
      await sleep(i === 0 ? 380 : 520 + Math.round(Math.random() * 360))
      if (!alive.go) return
      const last = i === next.messages.length - 1
      const turn: ChatTurn = {
        role: 'bot',
        from: m.from,
        text: m.text,
        chips: last && !next.done ? next.chips : undefined,
        topic: last ? next.topic : undefined,
        at: Date.now(),
      }
      acc = [...acc, turn]
      setTurns(acc)
      persist(acc, next.topic, acc.filter((t) => !isYou(t)).length, next.source)
      emitChatWire({
        session: sessionId(),
        bot: m.text,
        from: m.from,
        chips: last && !next.done ? next.chips : [],
        topic: next.topic,
        n: acc.filter((t) => !isYou(t)).length,
        waiting: !last,
        typingFrom: last ? '' : next.messages[i + 1]?.from ?? '',
      })
    }
    if (!alive.go) return
    setChips(next.done ? [] : next.chips)
    setWaiting(false)
    askedAt.current = Date.now()
  }

  const reply = async (text: string) => {
    const trimmed = text.trim()
    if (locked || waiting || done || !trimmed) return
    haptic('press')
    const now = Date.now()
    const topic = getLocalProfile().session.chat.topic
    const covert: ChatCovert = {
      text: trimmed,
      latencyMs: Math.max(0, now - askedAt.current),
      edits,
      length: trimmed.length,
      overshare: isOvershare(trimmed),
      topic,
      at: now,
    }
    const user: ChatTurn = { role: 'user', from: 'you', text: trimmed, at: now }
    const hist = [...turns, user]
    const log = [...(getLocalProfile().session.chat.log ?? []), covert]
    setTurns(hist)
    setDraft('')
    setEdits(0)
    setChips([])
    persist(hist, topic, hist.filter((t) => !isYou(t)).length, getLocalProfile().session.chat.source, log)
    const alive = { go: true }
    if (hist.filter(isYou).length >= CHAT_MAX_TURNS) {
      const next = await ask(hist)
      await playBurst({ ...next, done: true }, hist, alive)
      return
    }
    setWaiting(true)
    const typer = PERSONA_IDS[(hist.filter(isYou).length) % PERSONA_IDS.length]
    emitChatWire({ waiting: true, typingFrom: typer })
    const next = await ask(hist)
    await playBurst(next, hist, alive)
  }

  return (
    <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 8, paddingTop: 6 }}>
      <div className="ctl-display" style={{ fontSize: 14, lineHeight: 1.35 }}>
        {waiting ? 'RESPONDING…' : done ? 'SESSION RECORDED.' : 'ANSWER ON THIS PHONE.'}
      </div>
      <div className="chat-chips">
        {chips.map((c) => (
          <PixelButton key={c} type="button" disabled={locked || waiting || done} onClick={() => void reply(c)}>
            {c}
          </PixelButton>
        ))}
      </div>
      {waiting && (
        <div className="chat-responding">
          <span className="chat-dots"><i /><i /><i /></span>
          <span>responding…</span>
        </div>
      )}
      {!done && !waiting && (
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
            onChange={(e) => {
              if (e.target.value.length < draft.length) setEdits((n) => n + 1)
              setDraft(e.target.value)
            }}
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
