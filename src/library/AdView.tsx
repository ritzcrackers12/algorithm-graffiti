import { useEffect, useRef, useState } from 'react'
import type { VisitorProfile } from '../shared/profile.ts'
import { genreMeta, type GenreId } from '../shared/station.ts'
import type { AdResult } from '../shared/types.ts'

/** The STATION object: a generated instrumental tuned to the visitor's profile. */
export default function AdView({
  result, profile, tuning,
}: {
  result?: AdResult
  profile?: VisitorProfile | null
  tuning?: boolean
}) {
  const session = profile?.session.ad
  const genre = (result?.genre || session?.genre || result?.brandId || session?.brandId || 'ambient') as GenreId
  const label = genreMeta(genre).label
  const audioUrl = result?.audioUrl ?? session?.audioUrl ?? null
  const audioRef = useRef<HTMLAudioElement>(null)
  const [band, setBand] = useState(12)

  // Radio-tuning sweep while the track generates (placeholder graphic — polish later).
  useEffect(() => {
    if (!tuning) return
    const t = window.setInterval(() => setBand((b) => (b + 7) % 100), 140)
    return () => window.clearInterval(t)
  }, [tuning])

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load()
      audioRef.current.play().catch(() => { /* autoplay may require a gesture */ })
    }
  }, [audioUrl])

  const status = tuning ? 'TUNING IN…' : audioUrl ? 'ON AIR.' : 'STANDBY.'

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>station.wav</span>
      </div>
      <div className="ad-stage">
        {tuning ? (
          <div className="radio-tuner">
            <div className="radio-dial">
              <div className="radio-needle" style={{ left: `${band}%` }} />
              <div className="radio-scale">{'· '.repeat(24)}</div>
            </div>
            <div className="machine-line" style={{ color: '#c6ff3d' }}>TUNING IN TO YOUR STATION…</div>
          </div>
        ) : audioUrl ? (
          <div className="radio-tuner">
            <div className="radio-nowplaying">{label}</div>
            <div className="radio-eq">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
            <audio ref={audioRef} src={audioUrl} loop autoPlay controls />
          </div>
        ) : (
          <div className="machine-line" style={{ color: '#c6ff3d' }}>SET THE DIALS ON THE PHONE, THEN TUNE IN.</div>
        )}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{status}</span>
        <span style={{ width: 160 }}>{(result?.source || session?.source || '').toUpperCase()}</span>
      </div>
    </>
  )
}
