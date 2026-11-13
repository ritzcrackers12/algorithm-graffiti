import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { sendCommand } from '../lib/live.ts'
import { clearReelClip, getReelClip, subscribeReelClip } from '../lib/reelSync.ts'
import { REEL_BUCKETS, bucketMeta, nearestSlot, type ReelBucket } from '../shared/reelLibrary.ts'
import { poleWord } from '../shared/poles.ts'
import type { ReelSession } from '../shared/profile.ts'
import type { Snapshot } from '../shared/types.ts'
import { Knob } from './controls.tsx'
import { InfoDot } from './Onboarding.tsx'

const KNOB_STEPS = ['', '', '', '', '', '', '', '', '', '', '']

function persistReel(next: ReelSession) {
  const p = getLocalProfile()
  const session = { ...p.session, reel: next }
  setLocalProfile({ ...p, session })
  void sendCommand('signal', JSON.stringify({ session }))
}

function playSlot(id: string) {
  void getBackend().then((b) => b.reportReel({ id, ended: false, duration: 0 }))
}

export default function ReelControls({ snap, locked, onInfo }: { snap: Snapshot; locked: boolean; say?: (t: string) => void; onInfo?: (slide: number) => void }) {
  const started = useRef(Date.now())
  const lastDials = useRef<[number, number, number]>([50, 50, 50])
  const clip = useSyncExternalStore(subscribeReelClip, getReelClip)
  const reel0 = getLocalProfile().session.reel
  const [bucket, setBucket] = useState<ReelBucket | null>((reel0.bucket as ReelBucket | null) ?? null)
  const [dials, setDials] = useState<[number, number, number]>(reel0.dials ?? [50, 50, 50])
  const [moved, setMoved] = useState<[boolean, boolean, boolean]>(reel0.moved ?? [false, false, false])
  const [sent, setSent] = useState(!!reel0.send)
  const [emoji, setEmoji] = useState(reel0.emoji ?? '')
  const [reactOpen, setReactOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const openedAt = snap.display.openedAt

  useEffect(() => {
    started.current = Date.now()
    const p = getLocalProfile().session.reel
    setBucket((p.bucket as ReelBucket | null) ?? null)
    setDials(p.dials ?? [50, 50, 50])
    setMoved(p.moved ?? [false, false, false])
    setSent(!!p.send)
    setEmoji(p.emoji ?? '')
    setReactOpen(false)
    setDraft('')
    lastDials.current = p.dials ?? [50, 50, 50]
    if (!p.send) clearReelClip()
  }, [openedAt])

  const servedId = getLocalProfile().session.reel.currentId
  const ended = !!(sent && servedId && clip?.id === servedId && clip.ended)
  useEffect(() => {
    if (!sent || ended || !servedId) return
    const ms = clip?.id === servedId && clip.duration > 0 ? (clip.duration + 0.6) * 1000 : 16_000
    const t = window.setTimeout(() => {
      void getBackend().then((b) => b.reportReel({ id: servedId, ended: true, duration: clip?.duration ?? 0 }))
    }, ms)
    return () => window.clearTimeout(t)
  }, [sent, ended, servedId, clip])

  const pickBucket = (id: ReelBucket) => {
    if (locked) return
    haptic('press')
    const prev = getLocalProfile().session.reel
    const tried = prev.tried.includes(id) ? prev.tried : [...prev.tried, id]
    const skipped = REEL_BUCKETS.map((b) => b.id).filter((b) => !tried.includes(b))
    const next: ReelSession = {
      ...prev,
      tried,
      skipped,
      bucket: id,
      dials: [50, 50, 50],
      currentId: null,
      currentSlot: null,
      legitimacy: null,
      emoji: null,
      send: false,
      moved: [false, false, false],
      twistEach: [0, 0, 0],
      twist: 0,
      dwellMs: Date.now() - started.current,
      phase: 'tune',
    }
    lastDials.current = [50, 50, 50]
    setBucket(id)
    setDials([50, 50, 50])
    setMoved([false, false, false])
    setSent(false)
    setEmoji('')
    clearReelClip()
    persistReel(next)
  }

  const twist = (i: number, step: number) => {
    if (locked || !bucket || sent) return
    const v = step * 10
    const nextDials: [number, number, number] = [...dials]
    nextDials[i] = v
    const delta = Math.abs(v - lastDials.current[i])
    lastDials.current = nextDials
    const nextMoved: [boolean, boolean, boolean] = [...moved]
    nextMoved[i] = true
    setDials(nextDials)
    setMoved(nextMoved)
    const prev = getLocalProfile().session.reel
    const twistEach: [number, number, number] = [...(prev.twistEach ?? [0, 0, 0])]
    twistEach[i] += delta
    persistReel({
      ...prev,
      bucket,
      dials: nextDials,
      moved: nextMoved,
      twistEach,
      twist: twistEach[0] + twistEach[1] + twistEach[2],
      dwellMs: Date.now() - started.current,
      phase: 'tune',
    })
  }

  const send = () => {
    if (locked || !bucket || sent) return
    if (!moved[0] || !moved[1] || !moved[2]) return
    haptic('success')
    const { slot } = nearestSlot(bucket, dials)
    const prev = getLocalProfile().session.reel
    const next: ReelSession = {
      ...prev,
      bucket,
      dials,
      moved,
      send: true,
      currentId: slot.clipId,
      currentSlot: slot.slotId,
      legitimacy: slot.legitimacy,
      dwellMs: Date.now() - started.current,
      phase: 'play',
    }
    setSent(true)
    persistReel(next)
    playSlot(slot.clipId)
  }

  const submitEmoji = () => {
    const value = draft.trim()
    if (locked || !value) return
    haptic('press')
    setEmoji(value)
    setReactOpen(false)
    persistReel({
      ...getLocalProfile().session.reel,
      emoji: value,
      dwellMs: Date.now() - started.current,
      phase: 'done',
    })
  }

  if (!bucket) {
    return (
      <div className="ctl-center reel-pick" style={{ paddingTop: 8 }}>
        <div className="prompt"><span className="bobtext">WHAT WOULD YOU LIKE TO SEE?</span></div>
        <div className="bucket-grid">
          {REEL_BUCKETS.map((b) => (
            <PixelButton key={b.id} type="button" disabled={locked} onClick={() => pickBucket(b.id)}>
              <span>{b.label}</span>
              <span className="bucket-sub">{b.subtitle}</span>
            </PixelButton>
          ))}
        </div>
      </div>
    )
  }

  if (sent && (ended || emoji) && !reactOpen) {
    return (
      <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 8 }}>
        {emoji ? (
          <div className="ctl-display" style={{ fontSize: 28 }}>{emoji}</div>
        ) : (
          <PixelButton type="button" disabled={locked} onClick={() => { haptic('press'); setReactOpen(true) }}>
            REACT
          </PixelButton>
        )}
      </div>
    )
  }

  if (sent && reactOpen) {
    return (
      <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 8 }}>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            submitEmoji()
          }}
        >
          <input
            className="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder=""
            maxLength={16}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            enterKeyHint="done"
            aria-label="emoji"
          />
          <PixelButton type="submit" disabled={locked || !draft.trim()}>OK</PixelButton>
        </form>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="ctl-center">
        <div className="ctl-display">WATCH THE VIDEO ON THE IPAD SCREEN.</div>
      </div>
    )
  }

  const canSend = moved[0] && moved[1] && moved[2]
  const poles = bucketMeta(bucket).poles

  return (
    <div className="ctl-center reel-tune" style={{ gap: 8, paddingTop: 8 }}>
      <div className="prompt">
        <span className="bobtext">ADJUST TO YOUR LIKING</span>
        {onInfo && <InfoDot onClick={() => onInfo(1)} title="What the dials do" />}
      </div>
      <div className="reel-units">
        {poles.map((pole, i) => (
          <div key={pole[0]} className="reel-unit">
            <div className="unit-poles">
              <span className="pole l">{pole[0]}</span>
              <Knob
                steps={KNOB_STEPS}
                value={Math.round(dials[i] / 10)}
                onChange={(step) => twist(i as 0 | 1 | 2, step)}
                disabled={locked}
                size={72}
                label={`${pole[0]} TO ${pole[1]}`}
              />
              <span className="pole r">{pole[1]}</span>
            </div>
            <div className="explain">{moved[i] ? poleWord(pole[0], pole[1], dials[i]) : '— — —'}</div>
          </div>
        ))}
      </div>
      <div className="reel-rates">
        <PixelButton type="button" disabled={locked || !canSend} onClick={send}>
          SEND
        </PixelButton>
        <PixelButton
          type="button"
          disabled={locked}
          onClick={() => {
            haptic('press')
            setBucket(null)
            persistReel({
              ...getLocalProfile().session.reel,
              bucket: null,
              currentId: null,
              send: false,
              phase: 'pick',
              dwellMs: Date.now() - started.current,
            })
          }}
        >
          BACK
        </PixelButton>
      </div>
    </div>
  )
}
