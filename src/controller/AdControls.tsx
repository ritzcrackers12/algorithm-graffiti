import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { sendCommand, sendGenerate, sessionId } from '../lib/live.ts'
import { deriveGenre, genreMeta, STATION_POLES, stationCacheKey, stationLegitimacy } from '../shared/station.ts'
import type { AdSession } from '../shared/profile.ts'
import type { Snapshot } from '../shared/types.ts'
import { PercentDial } from './controls.tsx'

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
  const linger = useRef(false)
  const openedAt = snap.display.openedAt

  useEffect(() => {
    linger.current = false
    const t = window.setTimeout(() => { linger.current = true }, 2500)
    const cur = getLocalProfile().session.ad
    setDials(cur.dials ?? [50, 50, 50])
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt])

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
      source: 'template',
    })
    void sendGenerate({
      session: sessionId(),
      object: 'ad',
      params: { brandId: genre, genre, dials, cacheKey: stationCacheKey(genre, dials) },
      profile: getLocalProfile(),
    })
  }

  return (
    <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 8 }}>
      <div className="ctl-display">{locked ? 'TUNING IN.' : 'SET THE DIALS'}</div>
      {STATION_POLES.map((pole, i) => (
        <PercentDial
          key={pole[0]}
          left={pole[0]}
          right={pole[1]}
          value={dials[i]}
          disabled={locked}
          onChange={(v) => twist(i, v)}
        />
      ))}
      <PixelButton type="button" disabled={locked} onClick={tuneIn}>
        TUNE IN
      </PixelButton>
    </div>
  )
}
