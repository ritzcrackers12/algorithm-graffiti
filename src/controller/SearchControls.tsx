import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { sendCommand } from '../lib/live.ts'
import { InfoDot } from './Onboarding.tsx'
import { SEARCH_ROUNDS, takeawayPrompt } from '../shared/search.ts'
import type { SearchSession } from '../shared/profile.ts'
import type { Snapshot } from '../shared/types.ts'

export default function SearchControls({ snap, locked, onInfo }: { snap: Snapshot; locked: boolean; onInfo?: (slide: number) => void }) {
  const [s, setS] = useState<SearchSession>(() => getLocalProfile().session.search)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const openedAt = snap.display.openedAt
  const kicked = useRef(false)

  // Merge a patch into the persisted search session and sync it to the iPad.
  const update = (patch: Partial<SearchSession>) => {
    const p = getLocalProfile()
    const search = { ...p.session.search, ...patch }
    const session = { ...p.session, search }
    setLocalProfile({ ...p, session })
    setS(search)
    void sendCommand('signal', JSON.stringify({ session }))
    return search
  }

  const backend = () => getBackend()

  const fetchOptions = async (round: number, picks: string[], takeaways: string[]) => {
    setBusy(true)
    try {
      const b = await backend()
      const res = await b.search({ kind: 'options', profile: getLocalProfile(), round, picks, takeaways })
      update({ options: res.options ?? [], phase: 'options' })
    } finally {
      setBusy(false)
    }
  }

  // On open: if we have no options yet, pull the first set.
  useEffect(() => {
    kicked.current = false
    const cur = getLocalProfile().session.search
    setS(cur)
    setDraft('')
    if (cur.phase === 'options' && !cur.options.length && !kicked.current) {
      kicked.current = true
      void fetchOptions(cur.round, cur.picks, cur.takeaways)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt])

  const pick = async (q: string) => {
    if (busy || locked) return
    haptic('press')
    const cur = getLocalProfile().session.search
    update({ picks: [...cur.picks, q], phase: 'reading', chat: [] })
    setBusy(true)
    try {
      const b = await backend()
      const res = await b.search({ kind: 'fact', profile: getLocalProfile(), query: q, round: cur.round })
      const fact = res.fact ?? { q, title: q, body: 'hm, nothing came back on that one.' }
      update({
        facts: [...getLocalProfile().session.search.facts, fact],
        chat: [{ role: 'bot', text: `found something on "${q}". ask me anything about it.`, at: Date.now() }],
        phase: 'reading',
      })
    } finally {
      setBusy(false)
    }
  }

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || busy || locked) return
    haptic('press')
    const cur = getLocalProfile().session.search
    const chat = [...cur.chat, { role: 'you' as const, text: q, at: Date.now() }]
    update({ chat })
    setDraft('')
    setBusy(true)
    try {
      const b = await backend()
      const res = await b.search({ kind: 'assistant', profile: getLocalProfile(), fact: cur.facts.at(-1), chat, question: q })
      update({ chat: [...getLocalProfile().session.search.chat, { role: 'bot', text: res.reply ?? '…', at: Date.now() }] })
    } finally {
      setBusy(false)
    }
  }

  const goDeeper = () => {
    if (busy || locked) return
    haptic('press')
    const cur = getLocalProfile().session.search
    const fact = cur.facts.at(-1)
    const prompt = fact ? takeawayPrompt(fact) : 'before we go deeper — what did you make of that?'
    update({ phase: 'takeaway', chat: [...cur.chat, { role: 'bot', text: prompt, at: Date.now() }] })
    setDraft('')
  }

  const submitTakeaway = async (text: string) => {
    const t = text.trim()
    if (!t || busy || locked) return
    haptic('press')
    const cur = getLocalProfile().session.search
    const takeaways = [...cur.takeaways, t]
    const chat = [...cur.chat, { role: 'you' as const, text: t, at: Date.now() }]
    const round = cur.round + 1
    setDraft('')
    if (round >= SEARCH_ROUNDS) {
      update({ takeaways, chat, round, phase: 'done' })
      return
    }
    update({ takeaways, chat, round, phase: 'options', options: [] })
    await fetchOptions(round, cur.picks, takeaways)
  }

  const lastBot = [...s.chat].reverse().find((t) => t.role === 'bot')?.text

  // ---- render by phase ----
  if (s.phase === 'done') {
    return (
      <div className="ctl-center" style={{ gap: 10 }}>
        <div className="ctl-display" style={{ fontSize: 16 }}>THE RABBIT HOLE HAS YOU.</div>
        <div className="ctl-done-sub">{SEARCH_ROUNDS} searches deep. it knows what you’ll click next.</div>
      </div>
    )
  }

  if (s.phase === 'options') {
    const loading = busy || !s.options.length
    return (
      <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 6, position: 'relative' }}>
        {onInfo && <span className="box-info"><InfoDot onClick={() => onInfo(0)} /></span>}
        <div className="ctl-display" style={{ fontSize: 14 }}>ROUND {s.round + 1} / {SEARCH_ROUNDS}</div>
        <div className="ctl-done-sub" style={{ opacity: 0.7 }}>pick what you want to search</div>
        {loading ? (
          <div className="chat-responding"><span className="chat-dots"><i /><i /><i /></span><span>searching…</span></div>
        ) : (
          <div className="search-opts">
            {s.options.map((q) => (
              <button key={q} type="button" className="search-opt" disabled={locked} onClick={() => void pick(q)}>
                <span className="search-opt-q">{q}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (s.phase === 'takeaway') {
    const prompt = [...s.chat].reverse().find((t) => t.role === 'bot')?.text ?? 'what did you make of that?'
    return (
      <div className="ctl-center" style={{ gap: 10, position: 'relative' }}>
        {onInfo && <span className="box-info"><InfoDot onClick={() => onInfo(0)} /></span>}
        <div className="ctl-display" style={{ fontSize: 14, lineHeight: 1.35 }}>{prompt}</div>
        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); void submitTakeaway(draft) }}>
          <input className="chat-input" value={draft} disabled={locked || busy} placeholder="YOUR TAKE" maxLength={200} autoComplete="off" onChange={(e) => setDraft(e.target.value)} />
          <PixelButton type="submit" disabled={locked || busy || !draft.trim()}>NEXT</PixelButton>
        </form>
      </div>
    )
  }

  // reading
  return (
    <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 6, position: 'relative' }}>
      {onInfo && <span className="box-info"><InfoDot onClick={() => onInfo(0)} /></span>}
      <div className="ctl-display" style={{ fontSize: 13 }}>READING ON THE SCREEN</div>
      {lastBot && <div className="search-assist-echo">{busy ? 'thinking…' : lastBot}</div>}
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); void ask(draft) }}>
        <input className="chat-input" value={draft} disabled={locked || busy} placeholder="ASK THE ASSISTANT" maxLength={200} autoComplete="off" onChange={(e) => setDraft(e.target.value)} />
        <PixelButton type="submit" disabled={locked || busy || !draft.trim()}>ASK</PixelButton>
      </form>
      <PixelButton block type="button" disabled={locked || busy} onClick={goDeeper}>GO DEEPER →</PixelButton>
    </div>
  )
}
