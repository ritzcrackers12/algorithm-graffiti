import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { emitChatWire } from '../lib/chatSync.ts'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { sendCommand, sessionId } from '../lib/live.ts'
import {
  CHAT_MAX_TURNS, SCENARIOS, SCENARIO_IDS, isOvershare, isYou, scenarioCast, scriptedNext,
  type ChatCovert, type ChatTurn, type PersonaId, type ScenarioId,
} from '../shared/chatScript.ts'
import type { Snapshot } from '../shared/types.ts'

function sleep(ms: number) {
  return new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })
}

function burstFrom(res: {
  messages?: { from: PersonaId; text: string }[]
  bot?: string
  topic?: string
  source?: string
  done?: boolean
}) {
  const messages = res.messages?.filter((m) => m.text.trim()).map((m) => ({
    from: m.from,
    text: m.text.trim(),
  })) ?? []
  if (!messages.length && res.bot) messages.push({ from: 'jules', text: res.bot })
  return {
    messages,
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
    if (res.ok && (res.messages?.length || res.bot)) return burstFrom(res)
  } catch { /* scripted */ }
  return burstFrom({ ...fallback, source: 'scripted' })
}

function persist(turns: ChatTurn[], topic: string, n: number, source: string, log?: ChatCovert[]) {
  const p = getLocalProfile()
  const session = {
    ...p.session,
    chat: { ...p.session.chat, turns, topic, n, source, log: log ?? p.session.chat.log ?? [] },
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
  const [scenario, setScenario] = useState<ScenarioId | null>(chat0.scenario ?? null)
  const [turns, setTurns] = useState<ChatTurn[]>(chat0.turns)
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [edits, setEdits] = useState(0)
  const askedAt = useRef(Date.now())
  const aliveRef = useRef<{ go: boolean }>({ go: true })
  const openedAt = snap.display.openedAt
  const done = turns.some((t) => t.topic === 'done') || turns.filter(isYou).length >= CHAT_MAX_TURNS
  // Before the first incoming message exists, the wait is the initial load, not a reply.
  const hasBotTurn = turns.some((t) => !isYou(t))

  const playBurst = async (
    next: { messages: { from: PersonaId; text: string }[]; topic: string; source: string; done?: boolean },
    hist: ChatTurn[],
    sc: ScenarioId,
    alive: { go: boolean },
  ) => {
    setWaiting(true)
    let acc = hist
    for (let i = 0; i < next.messages.length; i++) {
      const m = next.messages[i]
      emitChatWire({ waiting: true, typingFrom: m.from, scenario: sc, session: sessionId() })
      await sleep(i === 0 ? 380 : 520 + Math.round(Math.random() * 360))
      if (!alive.go) return
      const last = i === next.messages.length - 1
      const turn: ChatTurn = {
        role: 'bot',
        from: m.from,
        text: m.text,
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
        scenario: sc,
        topic: next.topic,
        n: acc.filter((t) => !isYou(t)).length,
        waiting: !last,
        typingFrom: last ? '' : next.messages[i + 1]?.from ?? '',
      })
    }
    if (!alive.go) return
    setWaiting(false)
    askedAt.current = Date.now()
  }

  // Restore an in-progress thread, or kick the opening if a scenario was already
  // chosen. A fresh open with no scenario shows the picker (handled in render).
  useEffect(() => {
    const alive = { go: true }
    aliveRef.current = alive
    const chat = getLocalProfile().session.chat
    const sc = chat.scenario ?? null
    setScenario(sc)
    setTurns(chat.turns)
    setEdits(0)
    setDraft('')
    if (chat.turns.length) {
      const last = [...chat.turns].reverse().find((t) => !isYou(t))
      if (last) {
        askedAt.current = last.at
        emitChatWire({
          session: sessionId(),
          bot: last.text,
          from: last.from && last.from !== 'you' ? last.from : scenarioCast(sc ?? 'group')[0],
          scenario: sc,
          topic: last.topic || '',
          n: chat.turns.filter((t) => !isYou(t)).length,
          waiting: false,
          typingFrom: '',
        })
      }
      return () => { alive.go = false }
    }
    if (sc) {
      setWaiting(true)
      emitChatWire({ session: sessionId(), scenario: sc, waiting: true, typingFrom: scenarioCast(sc)[0], bot: '', chips: [], n: 0 })
      void (async () => {
        const next = await ask([])
        if (!alive.go) return
        await playBurst(next, [], sc, alive)
      })()
    }
    return () => { alive.go = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt])

  const pick = (id: ScenarioId) => {
    if (locked || scenario) return
    haptic('press')
    const p = getLocalProfile()
    const session = { ...p.session, chat: { ...p.session.chat, scenario: id } }
    setLocalProfile({ ...p, session })
    void sendCommand('signal', JSON.stringify({ session }))
    setScenario(id)
    const alive = { go: true }
    aliveRef.current = alive
    setWaiting(true)
    emitChatWire({ session: sessionId(), scenario: id, waiting: true, typingFrom: scenarioCast(id)[0], bot: '', chips: [], n: 0 })
    void (async () => {
      const next = await ask([])
      if (!alive.go) return
      await playBurst(next, [], id, alive)
    })()
  }

  const reply = async (text: string) => {
    const trimmed = text.trim()
    if (locked || waiting || done || !trimmed || !scenario) return
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
    persist(hist, topic, hist.filter((t) => !isYou(t)).length, getLocalProfile().session.chat.source, log)
    const alive = { go: true }
    aliveRef.current = alive
    const cast = scenarioCast(scenario)
    if (hist.filter(isYou).length >= CHAT_MAX_TURNS) {
      setWaiting(true)
      const next = await ask(hist)
      await playBurst({ ...next, done: true }, hist, scenario, alive)
      return
    }
    setWaiting(true)
    const typer = cast[(hist.filter(isYou).length) % cast.length]
    emitChatWire({ waiting: true, typingFrom: typer, scenario })
    const next = await ask(hist)
    await playBurst(next, hist, scenario, alive)
  }

  // ---- Picker ----
  if (!scenario) {
    return (
      <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 6 }}>
        <div className="ctl-display" style={{ fontSize: 14, lineHeight: 1.35 }}>PICK A CHAT.</div>
        <div className="ctl-done-sub" style={{ opacity: 0.65 }}>you’re dropped mid-conversation. reply however you want.</div>
        <div className="chat-picker">
          {SCENARIO_IDS.map((id) => {
            const sc = SCENARIOS[id]
            return (
              <button key={id} type="button" className="chat-pick" disabled={locked} onClick={() => pick(id)}>
                <span className="chat-pick-emoji">{sc.emoji}</span>
                <span className="chat-pick-text">
                  <span className="chat-pick-label">{sc.label}</span>
                  <span className="chat-pick-blurb">{sc.blurb}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 8, paddingTop: 6 }}>
      <div className="ctl-display" style={{ fontSize: 14, lineHeight: 1.35 }}>
        {waiting ? (hasBotTurn ? 'RESPONDING…' : 'LOADING…') : done ? 'SESSION RECORDED.' : 'TEXT BACK ON THIS PHONE.'}
      </div>
      {waiting && (
        <div className="chat-responding">
          <span className="chat-dots"><i /><i /><i /></span>
          <span>{hasBotTurn ? 'responding…' : 'loading…'}</span>
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
