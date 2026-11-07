import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  kioskVideo, pauseKioskReel, playKioskReel, reelAudioFile, stopKioskReel, syncKioskAudio,
} from '../lib/audio.ts'
import { getBackend } from '../lib/backend.ts'
import { loadReelLibrary, reelUrls } from '../lib/content.ts'
import { getReelClip, subscribeReelClip } from '../lib/reelSync.ts'
import { emptyAffinity, pickStart, type ReelResult } from '../shared/reel.ts'

export default function ReelView({ result, openedAt = 0 }: { result?: ReelResult; openedAt?: number }) {
  const phase = result?.phase ?? 'idle'
  const [bootId, setBootId] = useState<string | null>(null)
  const id = phase === 'done' ? null : (result?.currentId || bootId)
  const urls = id ? reelUrls(id) : []
  const [srcIndex, setSrcIndex] = useState(0)
  const src = urls[srcIndex] ?? ''
  const holeRef = useRef<HTMLDivElement>(null)
  const clip = useSyncExternalStore(subscribeReelClip, getReelClip)
  const skipped = !!(id && clip?.id === id && clip.ended)

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
    const hole = holeRef.current
    if (!hole || phase === 'done') {
      stopKioskReel()
      return
    }
    const v = kioskVideo()
    v.className = 'reel-video'
    hole.appendChild(v)

    const report = (ended?: boolean, duration?: number) => {
      if (!id) return
      void getBackend().then((b) => b.reportReel({ id, ended, duration }))
    }
    const onMeta = () => report(false, v.duration)
    const onPlay = () => report(false, v.duration)
    const onEnd = () => report(true)
    const onTime = () => syncKioskAudio(v.currentTime)
    const onErr = () => setSrcIndex((i) => (i + 1 < urls.length ? i + 1 : i))
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('playing', onPlay)
    v.addEventListener('ended', onEnd)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('error', onErr)

    if (src && id && !skipped) void playKioskReel(src, reelAudioFile(id))
    else pauseKioskReel()

    return () => {
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('playing', onPlay)
      v.removeEventListener('ended', onEnd)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('error', onErr)
    }
  }, [src, id, skipped, phase, urls.length])

  useEffect(() => () => stopKioskReel(), [])

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
        ) : !src ? (
          <div className="machine-line" style={{ color: '#c6ff3d', textAlign: 'center' }}>LOADING.</div>
        ) : null}
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
