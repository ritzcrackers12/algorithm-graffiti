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
  const url = reel?.videoUrl
  const [word, setWord] = useState('')
  const [ended, setEnded] = useState(false)
  const endedAt = useRef(0)
  const clip = useSyncExternalStore(subscribeReelClip, getReelClip)

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

  const sendWord = async () => {
    const w = word.trim()
    if (!w || locked) return
    haptic('press')
    const res = await sendGenerate({ session: sessionId(), object: 'reel', params: { action: 'word', word: w }, profile: getLocalProfile() })
    if (res.ok) say('INPUT RECEIVED.')
    else {
      haptic('error')
      say(res.reason === 'blocked' ? 'INPUT REJECTED. TERM NOT PERMITTED.' : 'TRANSMISSION FAILED. RETRY.')
    }
  }

  const sendRate = async (rating: ReelRating) => {
    if (locked || !ended || phase === 'done' || phase === 'word') return
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

  if (phase === 'word' || !reel?.currentId || !url) {
    return (
      <form
        className="ctl-center ctl-allow-scroll"
        onSubmit={(e) => {
          e.preventDefault()
          void sendWord()
        }}
      >
        <div className="ctl-display">ENTER ONE WORD.</div>
        <input
          className="reel-word"
          value={word}
          disabled={locked}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onChange={(e) => setWord(e.target.value)}
          aria-label="One word"
        />
        <button className="big-btn" type="submit" disabled={locked || !word.trim()}>SEND</button>
      </form>
    )
  }

  if (!ended) {
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
