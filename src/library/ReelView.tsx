import { useEffect, useRef } from 'react'
import { getBackend } from '../lib/backend.ts'
import { isAudioUnlocked } from '../lib/audio.ts'
import type { ReelResult } from '../shared/reel.ts'

export default function ReelView({ result }: { result?: ReelResult }) {
  const unlocked = isAudioUnlocked()
  const phase = result?.phase ?? 'word'
  const url = result?.videoUrl
  const id = result?.currentId
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !url) return
    el.muted = !unlocked
    void el.play().catch(() => {
      el.muted = true
      void el.play().catch(() => {})
    })
  }, [url, unlocked, id])

  const report = (ended?: boolean, duration?: number) => {
    if (!id) return
    void getBackend().then((b) => b.reportReel({ id, ended, duration }))
  }

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>reel.mp4</span>
      </div>
      <div className="reel-stage">
        {phase === 'done' ? (
          <div className="reel-session machine-line">
            <div>SESSION RECORDED. {result?.rounds.filter((r) => r.rating).length ?? 0} PREFERENCES SAVED.</div>
            <div style={{ marginTop: 18 }}>{result?.sessionLine || 'NO SESSION LINE.'}</div>
          </div>
        ) : url ? (
          <video
            ref={videoRef}
            key={id}
            className="reel-video"
            src={url}
            autoPlay
            playsInline
            muted={!unlocked}
            onLoadedMetadata={(e) => report(false, e.currentTarget.duration)}
            onEnded={() => report(true)}
          />
        ) : (
          <div className="machine-line" style={{ color: '#c6ff3d', textAlign: 'center' }}>
            AWAITING INPUT.
          </div>
        )}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>
          {phase === 'done' ? 'SESSION RECORDED.' : url ? `ITEM ${id}` : 'STANDBY.'}
        </span>
        <span style={{ width: 160 }}>{result?.source ? result.source.toUpperCase() : ''}</span>
      </div>
    </>
  )
}
