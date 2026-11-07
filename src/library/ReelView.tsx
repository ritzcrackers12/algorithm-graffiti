import { useEffect, useRef } from 'react'
import { getBackend } from '../lib/backend.ts'
import { isAudioUnlocked } from '../lib/audio.ts'
import { reelFile } from '../lib/content.ts'
import type { ReelResult } from '../shared/reel.ts'

export default function ReelView({ result }: { result?: ReelResult }) {
  const unlocked = isAudioUnlocked()
  const phase = result?.phase ?? 'word'
  const id = result?.currentId
  const src = id ? reelFile(id) : ''
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !src) return
    el.muted = !unlocked
    void el.play().catch(() => {
      el.muted = true
      void el.play().catch(() => {})
    })
  }, [src, unlocked, id])

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
        ) : src ? (
          <video
            ref={videoRef}
            key={id}
            className="reel-video"
            src={src}
            autoPlay
            playsInline
            preload="auto"
            muted={!unlocked}
            onLoadedMetadata={(e) => report(false, e.currentTarget.duration)}
            onEnded={() => report(true)}
          />
        ) : (
          <div className="machine-line" style={{ color: '#c6ff3d', textAlign: 'center' }}>
            LOADING.
          </div>
        )}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>
          {phase === 'done' ? 'SESSION RECORDED.' : src ? `ITEM ${id}` : 'STANDBY.'}
        </span>
        <span style={{ width: 160 }}>{result?.source ? result.source.toUpperCase() : ''}</span>
      </div>
    </>
  )
}
