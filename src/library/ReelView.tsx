import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getBackend } from '../lib/backend.ts'
import { isAudioUnlocked } from '../lib/audio.ts'
import { loadReelLibrary, reelUrls } from '../lib/content.ts'
import { emptyAffinity, pickStart, type ReelResult } from '../shared/reel.ts'

function host() {
  return document.getElementById('ag-reel-host')
}

export default function ReelView({ result, openedAt = 0 }: { result?: ReelResult; openedAt?: number }) {
  const phase = result?.phase ?? 'idle'
  const [bootId, setBootId] = useState<string | null>(null)
  const id = phase === 'done' ? null : (result?.currentId || bootId)
  const urls = id ? reelUrls(id) : []
  const [srcIndex, setSrcIndex] = useState(0)
  const src = urls[srcIndex] ?? ''
  const videoRef = useRef<HTMLVideoElement>(null)
  const holeRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

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

  useLayoutEffect(() => {
    const hole = holeRef.current
    if (!hole || !src) {
      setBox(null)
      return
    }
    const sync = () => {
      const r = hole.getBoundingClientRect()
      setBox({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(hole)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [src, id])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !src) return
    el.defaultMuted = true
    el.muted = true
    el.playsInline = true
    el.setAttribute('playsinline', 'true')
    el.setAttribute('webkit-playsinline', 'true')

    const kick = () => {
      if (!el.paused && !el.ended) return
      void el.play().then(() => {
        if (!isAudioUnlocked()) return
        el.muted = false
        if (el.paused) {
          el.muted = true
          void el.play().catch(() => {})
        }
      }).catch(() => {
        el.muted = true
        void el.play().catch(() => {})
      })
    }

    kick()
    el.addEventListener('canplay', kick)
    el.addEventListener('loadeddata', kick)
    el.addEventListener('loadedmetadata', kick)
    window.addEventListener('ag-media-unlock', kick)
    const poll = window.setInterval(kick, 400)
    return () => {
      el.removeEventListener('canplay', kick)
      el.removeEventListener('loadeddata', kick)
      el.removeEventListener('loadedmetadata', kick)
      window.removeEventListener('ag-media-unlock', kick)
      window.clearInterval(poll)
    }
  }, [src, id, box])

  const report = (ended?: boolean, duration?: number) => {
    if (!id) return
    void getBackend().then((b) => b.reportReel({ id, ended, duration }))
  }

  const layer = host()
  const video = src && box && layer
    ? createPortal(
        <video
          ref={videoRef}
          key={`${id}:${src}`}
          className="reel-video"
          src={src}
          autoPlay
          muted
          loop={false}
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
          {...{ 'webkit-playsinline': 'true' }}
          onLoadedMetadata={(e) => report(false, e.currentTarget.duration)}
          onPlaying={() => report(false, videoRef.current?.duration)}
          onEnded={() => report(true)}
          onError={() => setSrcIndex((i) => (i + 1 < urls.length ? i + 1 : i))}
        />,
        layer,
      )
    : null

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>reel.mp4</span>
      </div>
      <div className="reel-stage" ref={holeRef}>
        {phase === 'done' ? (
          <div className="reel-session machine-line">
            <div>SESSION RECORDED. {result?.rounds.filter((r) => r.rating).length ?? 0} PREFERENCES SAVED.</div>
            <div style={{ marginTop: 18 }}>{result?.sessionLine || 'NO SESSION LINE.'}</div>
          </div>
        ) : (
          <div className="machine-line" style={{ color: '#c6ff3d', textAlign: 'center' }}>
            {src ? '' : 'LOADING.'}
          </div>
        )}
      </div>
      {video}
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>
          {phase === 'done' ? 'SESSION RECORDED.' : src ? `ITEM ${id}` : 'STANDBY.'}
        </span>
        <span style={{ width: 160 }}>{result?.source ? result.source.toUpperCase() : ''}</span>
      </div>
    </>
  )
}
