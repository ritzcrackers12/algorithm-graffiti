import { CONFIG } from '../shared/config.ts'
import { unlockAudio } from '../lib/audio.ts'

export default function TapToBegin({ onBegin }: { onBegin: () => void }) {
  const begin = () => {
    unlockAudio()
    document.querySelectorAll<HTMLVideoElement>('video.wallpaper-video').forEach((v) => {
      v.muted = true
      void v.play().catch(() => {})
    })
    onBegin()
    window.setTimeout(() => {
      void document.documentElement.requestFullscreen?.().catch(() => {})
      void (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen').catch(() => {})
    }, 400)
  }
  return (
    <div className="boot" onPointerDown={begin}>
      <div>
        <h1>{CONFIG.TITLE}</h1>
        <p>{CONFIG.TAGLINE}</p>
        <div className="tap">TAP TO BEGIN</div>
        <div className="bar"><i /></div>
      </div>
    </div>
  )
}
