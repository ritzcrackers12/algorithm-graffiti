import { CONFIG } from '../shared/config.ts'
import { unlockAudio } from '../lib/audio.ts'

export default function TapToBegin({ onBegin }: { onBegin: () => void }) {
  const begin = async () => {
    unlockAudio()
    try {
      await document.documentElement.requestFullscreen?.()
    } catch {
      /* iPad Safari may refuse; Home Screen mode is already full screen */
    }
    try {
      await (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen')
    } catch {
      /* not supported */
    }
    onBegin()
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
