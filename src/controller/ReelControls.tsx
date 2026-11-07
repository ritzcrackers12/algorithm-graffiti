import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { haptic } from '../lib/haptics.ts'
import { getLocalProfile } from '../lib/profileClient.ts'
import { sendGenerate, sessionId } from '../lib/live.ts'
import { getReelClip, subscribeReelClip } from '../lib/reelSync.ts'
import type { ReelRating } from '../shared/reel.ts'
import type { Snapshot } from '../shared/types.ts'

const CHOICES: { rating: ReelRating; label: string }[] = [
  { rating: 'HIGH', label: 'LIKE' },
  { rating: 'MEDIUM', label: 'NEUTRAL' },
  { rating: 'LOW', label: 'DISLIKE' },
]

export default function ReelControls({ snap, locked, say }: { snap: Snapshot; locked: boolean; say: (t: string) => void }) {
  const reel = snap.altered.reel
  const phase = reel?.phase ?? 'word'
  const busy = !!snap.display.busy
  const [ended, setEnded] = useState(false)
  const endedAt = useRef(0)
  const clip = useSyncExternalStore(subscribeReelClip, getReelClip)

  useEffect(() => {
    if (locked || phase === 'done' || reel?.currentId || busy) return
    let cancelled = false
    const kick = () => {
      if (cancelled) return
      void sendGenerate({
        session: sessionId(),
        object: 'reel',
        params: { action: 'start' },
        profile: getLocalProfile(),
      }).then((res) => {
        if (cancelled || res.ok || res.reason === 'busy') return
        window.setTimeout(kick, 900)
      })
    }
    kick()
    return () => { cancelled = true }
  }, [locked, phase, reel?.currentId, busy])

  useEffect(() => {
    setEnded(false)
    endedAt.current = 0
  }, [reel?.currentId])

  useEffect(() => {
    if (!reel?.currentId) return
    if (clip?.id === reel.currentId && clip.ended) {
      if (!ended) {
        endedAt.current = Date.now()
        setEnded(true)
      }
      return
    }
    const ms = clip?.id === reel.currentId && clip.duration > 0 ? (clip.duration + 0.8) * 1000 : 0
    if (!ms) return
    const t = window.setTimeout(() => {
      endedAt.current = Date.now()
      setEnded(true)
    }, ms)
    return () => window.clearTimeout(t)
  }, [reel?.currentId, clip, ended])

  const sendRate = async (rating: ReelRating) => {
    if (locked || !ended || phase === 'done' || !reel?.currentId) return
    haptic('press')
    const hesitationMs = endedAt.current ? Date.now() - endedAt.current : 0
    const res = await sendGenerate({
      session: sessionId(), object: 'reel',
      params: { action: 'rate', rating, hesitationMs },
      profile: getLocalProfile(),
    })
    if (res.ok) say('PREFERENCE SAVED.')
    else {
      haptic('error')
      say('TRANSMISSION FAILED. RETRY.')
    }
  }

  if (phase === 'done') {
    const n = reel?.rounds.filter((r) => r.rating).length ?? 0
    return (
      <div className="ctl-center">
        <div className="ctl-display">
          SESSION RECORDED.
          <br />
          <em>{n} PREFERENCES SAVED.</em>
        </div>
      </div>
    )
  }

  if (!ended || !reel?.currentId) {
    return (
      <div className="ctl-center">
        <div className="ctl-display">WATCH THE VIDEO ON THE IPAD SCREEN.</div>
      </div>
    )
  }

  return (
    <div className="ctl-center">
      <div className="ctl-label">RATE THIS ITEM.</div>
      <div className="reel-rates">
        {CHOICES.map((c) => (
          <button key={c.rating} className="big-btn" disabled={locked} onClick={() => void sendRate(c.rating)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
