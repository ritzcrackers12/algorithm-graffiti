import { useEffect, useRef } from 'react'
import { SEARCH_ROUNDS } from '../shared/search.ts'
import type { VisitorProfile } from '../shared/profile.ts'

export default function SearchView({ profile }: { profile?: VisitorProfile | null }) {
  const s = profile?.session.search
  const phase = s?.phase ?? 'options'
  const query = s?.picks.at(-1) ?? ''
  const fact = s?.facts.at(-1)
  const chat = s?.chat ?? []
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.length, fact?.title])

  const barText = phase === 'options'
    ? (s?.round ? 'what next…' : '')
    : query

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>SEARCH — round {(s?.round ?? 0) + 1} / {SEARCH_ROUNDS}</span>
      </div>
      <div className="search-stage">
        <div className="search-bar">
          <span className="search-glass" aria-hidden>⌕</span>
          <span className="search-bar-text">{barText}<span className="search-caret" /></span>
        </div>

        {phase === 'options' && (
          <div className="search-suggests">
            <div className="search-suggests-head">suggested for you</div>
            {(s?.options ?? []).map((q) => (
              <div key={q} className="search-suggest"><span className="search-glass sm" aria-hidden>⌕</span>{q}</div>
            ))}
            {!(s?.options ?? []).length && <div className="machine-line" style={{ color: '#c6ff3d' }}>SEARCHING…</div>}
            <div className="search-hint">pick one on your phone</div>
          </div>
        )}

        {phase !== 'options' && (
          <div className="search-result" ref={logRef}>
            {fact && (
              <div className="search-snippet">
                <div className="search-snippet-title">{fact.title}</div>
                <div className="search-snippet-body">{fact.body}</div>
              </div>
            )}
            <div className="search-assist">
              {chat.map((t, i) => (
                <div key={`${t.at}-${i}`} className={`search-msg ${t.role}`}>
                  {t.role === 'bot' && <span className="search-assist-tag">assistant</span>}
                  <span className="search-msg-text">{t.text}</span>
                </div>
              ))}
            </div>
            {phase === 'done' && <div className="search-done">that’s enough. we know what you’d search next.</div>}
          </div>
        )}
      </div>
      <div className="xp-statusbar"><span style={{ flex: 1 }}>LIVE.</span></div>
    </>
  )
}
