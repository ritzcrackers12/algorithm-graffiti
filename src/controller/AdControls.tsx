import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { sendCommand, sendControl, sendGenerate, sessionId } from '../lib/live.ts'
import { deriveGenre, genreMeta, STATION_POLES, stationCacheKey, stationLegitimacy } from '../shared/station.ts'
import { poleWord } from '../shared/poles.ts'
import type { AdSession } from '../shared/profile.ts'
import type { Snapshot } from '../shared/types.ts'
import { Knob } from './controls.tsx'

const DIAL_STEPS = ['', '', '', '', '', '', '', '', '', '', '']
const DIAL_TITLES = ['ENERGY', 'MOOD', 'TEXTURE']

/** Cosmetic FM readout: dials nudge a fake frequency so the band feels live. */
function fmFreq(dials: [number, number, number]): string {
  const blend = dials[0] * 0.5 + dials[1] * 0.2 + dials[2] * 0.3
  const f = 88.1 + (blend / 100) * 19.8
  return `FM ${f.toFixed(1)}`
}

function persistAd(patch: Partial<AdSession>) {
  const p = getLocalProfile()
  const ad = { ...p.session.ad, ...patch }
  const session = { ...p.session, ad }
  setLocalProfile({ ...p, session })
  void sendCommand('signal', JSON.stringify({ session }))
}

export default function AdControls({ snap, locked }: { snap: Snapshot; locked: boolean }) {
  const ad0 = getLocalProfile().session.ad
  const [dials, setDials] = useState<[number, number, number]>(ad0.dials ?? [50, 50, 50])
  const [tuned, setTuned] = useState((ad0.submittedAt ?? 0) > 0)
  const [playing, setPlaying] = useState(true)
  const linger = useRef(false)
  const openedAt = snap.display.openedAt

  useEffect(() => {
    linger.current = false
    const t = window.setTimeout(() => { linger.current = true }, 2500)
    const cur = getLocalProfile().session.ad
    setDials(cur.dials ?? [50, 50, 50])
    setTuned((cur.submittedAt ?? 0) > 0)
    setPlaying(true)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt])

  const togglePlay = () => {
    const next = !playing
    setPlaying(next)
    void sendControl({ kind: 'audio', action: next ? 'play' : 'pause' })
  }

  // Genre is derived from the profile the visitor already built — not chosen here.
  const genre = deriveGenre(getLocalProfile())
  const genreLabel = genreMeta(genre).label

  const twist = (i: number, v: number) => {
    if (locked) return
    const next: [number, number, number] = [...dials]
    next[i] = v
    setDials(next)
    persistAd({ dials: next, lingered: linger.current })
  }

  const tuneIn = () => {
    if (locked) return
    persistAd({
      dials,
      genre,
      genreLabel,
      brandId: genre,
      brandName: genreLabel,
      legitimacy: stationLegitimacy(genre),
      matchedProfile: true,
      lingered: linger.current,
      submittedAt: Date.now(),
      audioUrl: null,
      source: 'template',
    })
    setTuned(true)
    setPlaying(true)
    void sendGenerate({
      session: sessionId(),
      object: 'ad',
      params: { brandId: genre, genre, dials, cacheKey: stationCacheKey(genre, dials) },
      profile: getLocalProfile(),
    })
  }

  return (
    <div className="ctl-center station-ctl" style={{ gap: 8, paddingTop: 8 }}>
      <div className="prompt"><span className="bobtext">FIND YOUR SOUND</span></div>
      <div className="fm">{fmFreq(dials)}</div>
      <div className="station-dials">
        {STATION_POLES.map((pole, i) => (
          <div key={pole[0]} className="station-dial">
            <div className="ctitle">{DIAL_TITLES[i]}</div>
            <div className="unit-poles">
              <span className="pole l">{pole[0]}</span>
              <Knob
                steps={DIAL_STEPS}
                value={Math.round(dials[i] / 10)}
                onChange={(step) => twist(i, step * 10)}
                disabled={locked}
                size={64}
                label={`${pole[0]} TO ${pole[1]}`}
              />
              <span className="pole r">{pole[1]}</span>
            </div>
            <div className="explain">{poleWord(pole[0], pole[1], dials[i])}</div>
          </div>
        ))}
      </div>
      <PixelButton type="button" block disabled={locked} onClick={tuneIn}>
        {locked ? 'TUNING IN…' : 'TUNE IN'}
      </PixelButton>
      {tuned && (
        <PixelButton type="button" block disabled={locked} onClick={togglePlay}>
          {playing ? '❚❚ PAUSE' : '▶ PLAY'}
        </PixelButton>
      )}
    </div>
  )
}
