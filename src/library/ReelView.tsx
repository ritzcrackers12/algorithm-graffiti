import { useEffect, useRef, useState } from 'react'
import { getBackend } from '../lib/backend.ts'
import { isAudioUnlocked } from '../lib/audio.ts'
import { loadReelLibrary, reelUrls } from '../lib/content.ts'
import { emptyAffinity, pickStart, type ReelResult } from '../shared/reel.ts'

export default function ReelView({ result, openedAt = 0 }: { result?: ReelResult; openedAt?: number }) {
  const unlocked = isAudioUnlocked()
  const phase = result?.phase ?? 'idle'
  const [bootId, setBootId] = useState<string | null>(null)
  const id = phase === 'done' ? null : (result?.currentId || bootId)
  const urls = id ? reelUrls(id) : []
  const [srcIndex, setSrcIndex] = useState(0)
  const src = urls[srcIndex] ?? ''
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setSrcIndex(0)
  }, [id])

  useEffect(() => {
    if (result?.currentId || phase === 'done') return
    let go = true
    void loadReelLibrary().then((rows) => {
      if (!go || !rows.length) return
      const pick = pickStart(rows, emptyAffinity(), openedAt || 1)
      if (pick) setBootId(pick.id)
    })
    return () => { go = false }
  }, [result?.currentId, phase, openedAt])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !src) return
    el.muted = true
    void el.play().then(() => {
      if (unlocked) el.muted = false
    }).catch(() => {
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
            key={`${id}:${src}`}
            className="reel-video"
            src={src}
            autoPlay
            muted
            playsInline
            preload="auto"
            {...{ 'webkit-playsinline': 'true' }}
            onLoadedMetadata={(e) => report(false, e.currentTarget.duration)}
            onPlaying={() => report(false, videoRef.current?.duration)}
            onEnded={() => report(true)}
            onError={() => setSrcIndex((i) => (i + 1 < urls.length ? i + 1 : i))}
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
