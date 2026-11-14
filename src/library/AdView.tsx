import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pauseStation, playStation, playWaitingPeace, resumeStation, stopStation } from '../lib/audio.ts'
import { asset } from '../lib/content.ts'
import { getControl, subscribeControl } from '../lib/controlSync.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { AdResult } from '../shared/types.ts'

const TUNE_TIMEOUT_MS = 75_000
const STATION_LOOPS = 4 // play the ~15s clip 4x ≈ one minute
const WAITING_VIDEO = asset('waiting-radio.mp4')
const WAITING_AUDIO = asset('waiting-radio.m4a')

const IOS_VIDEO_ATTRS = {
  'webkit-playsinline': 'true',
  playsinline: 'true',
} as Record<string, string>

function WaitingRadio() {
  const ref = useRef<HTMLVideoElement>(null)
  const [band, setBand] = useState(12)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const play = () => {
      el.muted = true
      el.defaultMuted = true
      el.playsInline = true
      el.loop = true
      el.setAttribute('muted', '')
      el.setAttribute('playsinline', 'true')
      el.setAttribute('webkit-playsinline', 'true')
      void el.play().catch(() => {})
    }
    play()
    const sweep = window.setInterval(() => setBand((b) => (b + 7) % 100), 140)
    window.addEventListener('ag-media-unlock', play)
    void playWaitingPeace(WAITING_AUDIO).catch(() => {})
    return () => {
      window.clearInterval(sweep)
      window.removeEventListener('ag-media-unlock', play)
      el.pause()
      stopStation()
    }
  }, [])
  return (
    <div className="waiting-radio">
      <video
        ref={ref}
        className="waiting-radio-video kiosk-loop"
        src={WAITING_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        {...IOS_VIDEO_ATTRS}
      />
      <div className="waiting-radio-overlay">
        <div className="radio-tuner">
          <div className="radio-dial">
            <div className="radio-needle" style={{ left: `${band}%` }} />
            <div className="radio-scale">{'· '.repeat(24)}</div>
          </div>
          <div className="machine-line" style={{ color: '#c6ff3d' }}>TUNING IN TO YOUR STATION…</div>
          <div className="waiting-radio-peace">enjoy the peace while you wait</div>
        </div>
      </div>
    </div>
  )
}

/** The STATION object: a generated instrumental tuned to the visitor's profile. */
export default function AdView({
  result, profile, tuning,
}: {
  result?: AdResult
  profile?: VisitorProfile | null
  tuning?: boolean
}) {
  const session = profile?.session.ad
  const audioUrl = result?.audioUrl ?? session?.audioUrl ?? null
  const submittedAt = session?.submittedAt ?? 0
  const resultAt = result?.at ?? 0
  const lastSeqRef = useRef(0)
  const [now, setNow] = useState(() => Date.now())

  // Generation has returned for this submission (with or without audio).
  const resolved = resultAt > 0 && resultAt >= submittedAt
  // Keep the radio up from TUNE IN until the track returns or we time out.
  const pending = submittedAt > 0 && !audioUrl && !resolved && now - submittedAt < TUNE_TIMEOUT_MS
  const showTuning = !audioUrl && (!!tuning || pending)
  const failed = submittedAt > 0 && resolved && !audioUrl

  // Tick while tuning so `pending` can expire.
  useEffect(() => {
    if (!showTuning) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [showTuning])

  // Auto-start through the element unlocked at TAP TO BEGIN, so no tap on the
  // iPad is needed; loops a fixed number of times (~1 min).
  useEffect(() => {
    if (!audioUrl) return
    void playStation(audioUrl, STATION_LOOPS)
    return () => stopStation()
  }, [audioUrl])

  // Phone PLAY / PAUSE, delivered over the control channel.
  const control = useSyncExternalStore(subscribeControl, getControl)
  useEffect(() => {
    if (!control || control.kind !== 'audio' || control.seq === lastSeqRef.current) return
    lastSeqRef.current = control.seq
    if (control.action === 'pause') pauseStation()
    else if (control.action === 'play') resumeStation()
    else if (control.action === 'replay' && audioUrl) void playStation(audioUrl, STATION_LOOPS)
  }, [control, audioUrl])

  const status = showTuning ? 'TUNING IN…' : audioUrl ? 'ON AIR.' : failed ? 'NO SIGNAL.' : 'STANDBY.'

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>station.wav</span>
      </div>
      <div className="ad-stage">
        {showTuning ? (
          <WaitingRadio />
        ) : audioUrl ? (
          <div className="radio-tuner">
            <div className="radio-eq">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
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
