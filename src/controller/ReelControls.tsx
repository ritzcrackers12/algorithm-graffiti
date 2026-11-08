import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { sendCommand, sendGenerate, sessionId } from '../lib/live.ts'
import { addEvent } from '../shared/profile.ts'
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
  const phase = reel?.phase ?? 'idle'
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
        params: { action: 'start', seed: snap.display.openedAt || Date.now() },
        profile: getLocalProfile(),
      }).then((res) => {
        if (cancelled || res.ok || res.reason === 'busy') return
        window.setTimeout(kick, 900)
      })
    }
    kick()
    return () => { cancelled = true }
  }, [locked, phase, reel?.currentId, busy, snap.display.openedAt])

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

  const skip = () => {
    if (locked || !reel?.currentId || ended || phase === 'done') return
    haptic('press')
    endedAt.current = Date.now()
    setEnded(true)
    void getBackend().then((b) => b.reportReel({ id: reel.currentId!, ended: true, duration: clip?.duration ?? 0 }))
  }

  const sendRate = async (rating: ReelRating) => {
    if (locked || !ended || phase === 'done' || !reel?.currentId) return
    haptic('press')
    const hesitationMs = endedAt.current ? Date.now() - endedAt.current : 0
    const cur = reel.rounds.find((r) => r.reelId === reel.currentId)
    let profile = getLocalProfile()
    if (cur) {
      profile = addEvent(profile, {
        source: 'reel',
        key: 'tags',
        value: [rating, cur.audience, cur.topic, cur.subtopic, cur.keywords].filter(Boolean).join(' '),
        at: Date.now(),
      })
      setLocalProfile(profile)
      void sendCommand('signal', JSON.stringify({ events: profile.events.slice(-16) }))
    }
    const res = await sendGenerate({
      session: sessionId(), object: 'reel',
      params: { action: 'rate', rating, hesitationMs },
      profile,
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
        <PixelButton type="button" block disabled={locked || !reel?.currentId} onClick={skip}>
          SKIP
        </PixelButton>
      </div>
    )
  }

  return (
    <div className="ctl-center">
      <div className="ctl-label">RATE THIS ITEM.</div>
      <div className="reel-rates">
        {CHOICES.map((c) => (
          <PixelButton key={c.rating} block disabled={locked} onClick={() => void sendRate(c.rating)}>
            {c.label}
          </PixelButton>
        ))}
      </div>
    </div>
  )
}
