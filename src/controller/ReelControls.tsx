import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { sendCommand } from '../lib/live.ts'
import {
  REEL_BUCKETS, bucketMeta, nearestSlot, twistDistance, type ReelBucket,
} from '../shared/reelLibrary.ts'
import type { ReelSession } from '../shared/profile.ts'
import type { Snapshot } from '../shared/types.ts'
import { PercentDial } from './controls.tsx'

function persistReel(next: ReelSession) {
  const p = getLocalProfile()
  const session = { ...p.session, reel: next }
  setLocalProfile({ ...p, session })
  void sendCommand('signal', JSON.stringify({ session }))
}

function playSlot(id: string) {
  void getBackend().then((b) => b.reportReel({ id, ended: false, duration: 0 }))
}

export default function ReelControls({ snap, locked }: { snap: Snapshot; locked: boolean; say?: (t: string) => void }) {
  const started = useRef(Date.now())
  const lastDials = useRef<[number, number, number]>([50, 50, 50])
  const reel = getLocalProfile().session.reel
  const [bucket, setBucket] = useState<ReelBucket | null>((reel.bucket as ReelBucket | null) ?? null)
  const [dials, setDials] = useState<[number, number, number]>(reel.dials ?? [50, 50, 50])
  const [reacted, setReacted] = useState(reel.react)
  const openedAt = snap.display.openedAt

  useEffect(() => {
    started.current = Date.now()
    const p = getLocalProfile().session.reel
    setBucket((p.bucket as ReelBucket | null) ?? null)
    setDials(p.dials ?? [50, 50, 50])
    setReacted(p.react)
    lastDials.current = p.dials ?? [50, 50, 50]
  }, [openedAt])

  const serve = (nextBucket: ReelBucket, nextDials: [number, number, number], extra: Partial<ReelSession> = {}) => {
    const { slot, distance } = nearestSlot(nextBucket, nextDials)
    const prev = getLocalProfile().session.reel
    const twist = prev.currentId ? prev.twist + twistDistance(lastDials.current, nextDials) : Math.round(distance)
    lastDials.current = nextDials
    const tried = prev.tried.includes(nextBucket) ? prev.tried : [...prev.tried, nextBucket]
    const skipped = REEL_BUCKETS.map((b) => b.id).filter((id) => !tried.includes(id))
    const next: ReelSession = {
      ...prev,
      ...extra,
      tried,
      skipped,
      bucket: nextBucket,
      dials: nextDials,
      currentId: slot.clipId,
      currentSlot: slot.slotId,
      legitimacy: slot.legitimacy,
      twist,
      dwellMs: Date.now() - started.current,
      phase: 'tune',
    }
    persistReel(next)
    playSlot(slot.clipId)
  }

  const pickBucket = (id: ReelBucket) => {
    if (locked) return
    haptic('press')
    setBucket(id)
    setReacted(false)
    serve(id, dials, { react: false, send: false })
  }

  const twist = (i: number, v: number) => {
    if (locked || !bucket) return
    const next: [number, number, number] = [...dials]
    next[i] = v
    setDials(next)
    serve(bucket, next)
  }

  const react = () => {
    if (locked || !bucket) return
    haptic('press')
    setReacted(true)
    persistReel({ ...getLocalProfile().session.reel, react: true, dwellMs: Date.now() - started.current })
  }

  const send = () => {
    if (locked || !bucket) return
    haptic('success')
    persistReel({
      ...getLocalProfile().session.reel,
      send: true,
      dwellMs: Date.now() - started.current,
      phase: 'done',
    })
  }

  if (!bucket) {
    return (
      <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', paddingTop: 8 }}>
        <div className="ctl-label">PICK A BUCKET.</div>
        <div className="bucket-grid">
          {REEL_BUCKETS.map((b) => (
            <PixelButton key={b.id} type="button" disabled={locked} onClick={() => pickBucket(b.id)}>
              {b.label}
            </PixelButton>
          ))}
        </div>
      </div>
    )
  }

  const poles = bucketMeta(bucket).poles
  const sent = getLocalProfile().session.reel.send

  return (
    <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 4 }}>
      <div className="ctl-label">{bucket.toUpperCase()}</div>
      {poles.map((pole, i) => (
        <PercentDial
          key={pole[0]}
          left={pole[0]}
          right={pole[1]}
          value={dials[i]}
          disabled={locked || sent}
          onChange={(v) => twist(i, v)}
        />
      ))}
      <div className="reel-rates">
        <PixelButton type="button" disabled={locked || sent} selected={reacted} onClick={react}>
          {reacted ? 'REACTED 😂' : 'REACT 😂'}
        </PixelButton>
        <PixelButton type="button" disabled={locked || sent} onClick={send}>
          {sent ? 'SENT' : 'SEND'}
        </PixelButton>
        <PixelButton
          type="button"
          disabled={locked || sent}
          onClick={() => {
            haptic('press')
            setBucket(null)
            persistReel({ ...getLocalProfile().session.reel, bucket: null, phase: 'pick' })
          }}
        >
          OTHER BUCKET
        </PixelButton>
      </div>
    </div>
  )
}
