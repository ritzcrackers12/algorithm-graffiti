import { useEffect, useRef, useState } from 'react'
import type { VisitorProfile } from '../shared/profile.ts'
import { genreMeta, type GenreId } from '../shared/station.ts'
import type { AdResult } from '../shared/types.ts'

const TUNE_TIMEOUT_MS = 75_000

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
  const submittedAt = session?.submittedAt ?? 0
  const resultAt = result?.at ?? 0
  const audioRef = useRef<HTMLAudioElement>(null)
  const [band, setBand] = useState(12)
  const [now, setNow] = useState(() => Date.now())

  // Generation has returned for this submission (with or without audio).
  const resolved = resultAt > 0 && resultAt >= submittedAt
  // Keep the radio up from TUNE IN until the track returns or we time out.
  const pending = submittedAt > 0 && !audioUrl && !resolved && now - submittedAt < TUNE_TIMEOUT_MS
  const showTuning = !!tuning || pending
  const failed = submittedAt > 0 && resolved && !audioUrl

  // Tick while tuning so `pending` can expire and the sweep animates.
  useEffect(() => {
    if (!showTuning) return
    const t = window.setInterval(() => {
      setBand((b) => (b + 7) % 100)
      setNow(Date.now())
    }, 140)
    return () => window.clearInterval(t)
  }, [showTuning])

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load()
      audioRef.current.play().catch(() => { /* autoplay may need a gesture */ })
    }
  }, [audioUrl])

  const status = showTuning ? 'TUNING IN…' : audioUrl ? 'ON AIR.' : failed ? 'NO SIGNAL.' : 'STANDBY.'

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>station.wav</span>
      </div>
      <div className="ad-stage">
        {showTuning ? (
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
        ) : failed ? (
          <div className="machine-line" style={{ color: '#c6ff3d' }}>NO SIGNAL. SET THE DIALS AND TUNE IN AGAIN.</div>
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
