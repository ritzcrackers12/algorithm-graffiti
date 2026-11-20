import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getBackend } from '../lib/backend.ts'
import { refreshSoon } from '../lib/live.ts'

// The one thing on the iPad you're allowed to touch: if a phone is stuck on
// "waiting in queue" (usually because someone walked away mid-turn), this drops
// whoever holds the station and lets the next waiting phone in. Two taps, so a
// stray touch can't kick someone out mid-turn.
type Phase = 'idle' | 'confirm' | 'working' | 'done' | 'error'

export default function KioskReset({ style }: { style?: CSSProperties }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const later = (ms: number, next: Phase) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPhase(next), ms)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const tap = async () => {
    if (phase === 'idle' || phase === 'done' || phase === 'error') { setPhase('confirm'); later(5000, 'idle'); return }
    if (phase !== 'confirm') return
    if (timer.current) clearTimeout(timer.current)
    setPhase('working')
    try {
      const b = await getBackend()
      await b.kioskReset()
      b.poke()
      refreshSoon(0)
      setPhase('done')
      later(4000, 'idle')
    } catch (e) {
      console.error('kiosk reset failed', e)
      setPhase('error')
      later(4000, 'idle')
    }
  }

  const label = {
    idle: 'Reset the queue',
    confirm: 'Tap again to confirm',
    working: 'Resetting…',
    done: 'Queue reset ✓',
    error: 'Didn’t work — try again',
  }[phase]

  return (
    <div className="kiosk-reset" style={style}>
      <div className="kiosk-reset-note">If your phone says <b>“waiting in queue”</b>, tap this button to reset the queue.</div>
      <button type="button" className={`kiosk-reset-btn ${phase}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => void tap()}>
        {label}
      </button>
    </div>
  )
}
