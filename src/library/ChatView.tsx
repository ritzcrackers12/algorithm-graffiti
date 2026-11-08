import { useSyncExternalStore } from 'react'
import { getChatWire, subscribeChatWire } from '../lib/chatSync.ts'
import type { VisitorProfile } from '../shared/profile.ts'

export default function ChatView({ profile }: { profile?: VisitorProfile | null }) {
  const wire = useSyncExternalStore(subscribeChatWire, getChatWire)
  const turns = profile?.session.chat.turns ?? []
  const liveBot = wire.bot
  const lines = turns.length
    ? turns
    : liveBot ? [{ role: 'bot' as const, text: liveBot, at: 0 }] : []

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>agent.exe</span>
      </div>
      <div className="chat-stage">
        {lines.length === 0 ? (
          <div className="machine-line" style={{ color: '#c6ff3d' }}>WAITING FOR THE PHONE.</div>
        ) : (
          <div className="chat-log">
            {lines.map((t, i) => (
              <div key={`${t.at}-${i}`} className={`chat-line ${t.role}`}>
                <span>{t.role === 'bot' ? 'AGENT' : 'YOU'}</span>
                <p>{t.text}</p>
              </div>
            ))}
            {wire.waiting && <div className="chat-line bot"><span>AGENT</span><p>…</p></div>}
          </div>
        )}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{wire.waiting ? 'COMPOSING.' : 'LIVE.'}</span>
        <span style={{ width: 160 }}>{(profile?.session.chat.source || '').toUpperCase()}</span>
      </div>
    </>
  )
}
