import { useEffect, useRef, useSyncExternalStore } from 'react'
import { getChatWire, subscribeChatWire } from '../lib/chatSync.ts'
import { PERSONAS, isPersona, who, type ChatTurn, type PersonaId } from '../shared/chatScript.ts'
import type { VisitorProfile } from '../shared/profile.ts'

function Avatar({ id }: { id: PersonaId }) {
  const p = PERSONAS[id]
  return (
    <span className="gc-ava" style={{ background: p.fill, color: p.ink }}>{p.initial}</span>
  )
}

function Row({ t }: { t: ChatTurn }) {
  const from = who(t)
  if (from === 'you') {
    return (
      <div className="gc-row you">
        <div className="gc-bubble you">{t.text}</div>
      </div>
    )
  }
  const id = isPersona(from) ? from : 'jules'
  const p = PERSONAS[id]
  return (
    <div className="gc-row">
      <Avatar id={id} />
      <div>
        <div className="gc-name" style={{ color: p.ink }}>{p.name}</div>
        <div className="gc-bubble them" style={{ background: p.fill, color: '#f3eee6' }}>{t.text}</div>
      </div>
    </div>
  )
}

export default function ChatView({ profile }: { profile?: VisitorProfile | null }) {
  const wire = useSyncExternalStore(subscribeChatWire, getChatWire)
  const turns = profile?.session.chat.turns ?? []
  const lines: ChatTurn[] = turns.length
    ? turns
    : wire.bot
      ? [{ role: 'bot', from: isPersona(wire.from) ? wire.from : 'jules', text: wire.bot, at: 0 }]
      : []
  const logRef = useRef<HTMLDivElement>(null)
  const typing = wire.waiting ? (isPersona(wire.typingFrom) ? wire.typingFrom : 'mina') : null

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines.length, typing])

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>jules, mina, rik</span>
      </div>
      <div className="chat-stage">
        {lines.length === 0 && !typing ? (
          <div className="machine-line" style={{ color: '#c6ff3d' }}>WAITING FOR THE PHONE.</div>
        ) : (
          <div className="chat-log gc-log" ref={logRef}>
            {lines.map((t, i) => (
              <Row key={`${t.at}-${i}`} t={t} />
            ))}
            {typing && (
              <div className="gc-row">
                <Avatar id={typing} />
                <div>
                  <div className="gc-name" style={{ color: PERSONAS[typing].ink }}>{PERSONAS[typing].name}</div>
                  <div className="gc-bubble them gc-typing" style={{ background: PERSONAS[typing].fill }}>
                    <i /><i /><i />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{typing ? '…' : 'LIVE.'}</span>
      </div>
    </>
  )
}
