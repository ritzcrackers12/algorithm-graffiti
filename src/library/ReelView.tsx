import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  kioskVideo, pauseKioskReel, playKioskReel, preloadReelAudio, reelAudioFile, stopKioskReel, syncKioskAudio,
} from '../lib/audio.ts'
import { getBackend } from '../lib/backend.ts'
import { loadReelLibrary, reelUrls } from '../lib/content.ts'
import { getReelClip, subscribeReelClip } from '../lib/reelSync.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ReelResult } from '../shared/reel.ts'

export default function ReelView({
  result, profile,
}: {
  result?: ReelResult
  openedAt?: number
  profile?: VisitorProfile | null
}) {
  const clip = useSyncExternalStore(subscribeReelClip, getReelClip)
  const id = clip?.id || profile?.session.reel.currentId || result?.currentId || null
  const urls = id ? reelUrls(id) : []
  const [srcIndex, setSrcIndex] = useState(0)
  const src = urls[srcIndex] ?? ''
  const holeRef = useRef<HTMLDivElement>(null)
  const skipped = !!(id && clip?.id === id && clip.ended)
  const waiting = !id

  useEffect(() => {
    setSrcIndex(0)
  }, [id])

  useEffect(() => {
    let gone = false
    const nodes: HTMLVideoElement[] = []
    const buffer = (clipId: string) => {
      preloadReelAudio(clipId)
      for (const url of reelUrls(clipId)) {
        const v = document.createElement('video')
        v.preload = 'auto'
        v.muted = true
        v.playsInline = true
        v.setAttribute('playsinline', 'true')
        v.src = url
        v.load()
        nodes.push(v)
      }
    }
    void loadReelLibrary().then((rows) => {
      if (gone) return
      for (const row of rows) buffer(row.id)
    })
    return () => {
      gone = true
      for (const v of nodes) {
        v.removeAttribute('src')
        v.load()
      }
    }
  }, [])

  useEffect(() => {
    const hole = holeRef.current
    if (!hole || waiting) {
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
    const onEnd = () => {
      pauseKioskReel()
      report(true)
    }
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
  }, [src, id, skipped, waiting, urls.length])

  useEffect(() => () => stopKioskReel(), [])

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>reel.mp4</span>
      </div>
      <div className="reel-stage" ref={holeRef}>
        {waiting ? (
          <div className="machine-line" style={{ color: '#c6ff3d', textAlign: 'center' }}>
            SELECT A BUCKET ON THE PHONE.
          </div>
        ) : null}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{waiting ? 'STANDBY.' : src ? 'PLAYING.' : 'LOADING.'}</span>
        <span style={{ width: 160 }}>{id ? `ITEM ${id}` : ''}</span>
      </div>
    </>
  )
}
