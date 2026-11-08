import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { sendCommand, sendGenerate, sessionId } from '../lib/live.ts'
import { CONFIG } from '../shared/config.ts'
import { AD_POLES, adCacheKey, nearestBrand } from '../shared/adTuner.ts'
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
  const timer = useRef(0)
  const openedAt = snap.display.openedAt

  useEffect(() => {
    linger.current = false
    const t = window.setTimeout(() => { linger.current = true }, 2500)
    const cur = getLocalProfile().session.ad
    setDials(cur.dials ?? [50, 50, 50])
    settle(cur.dials ?? [50, 50, 50], false)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt])

  const settle = (next: [number, number, number], generate: boolean) => {
    const profile = getLocalProfile()
    const { brand, matchedProfile, legitimacy } = nearestBrand(next, profile)
    persistAd({
      dials: next,
      brandId: brand.id,
      brandName: brand.name,
      legitimacy,
      matchedProfile,
      lingered: linger.current,
      overlay: {
        wordmark: brand.name,
        headline: brand.tagline,
        cta: next[2] > 60 ? 'SHOP NOW' : next[1] > 60 ? 'GET STARTED' : 'LEARN MORE',
      },
      source: 'template',
    })
    if (!generate) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void sendGenerate({
        session: sessionId(),
        object: 'ad',
        params: {
          brandId: brand.id,
          dials: next,
          cacheKey: adCacheKey(brand.id, next, profile),
        },
        profile: getLocalProfile(),
      })
    }, CONFIG.AD_GENERATE_DEBOUNCE_MS)
  }

  const twist = (i: number, v: number) => {
    if (locked) return
    const next: [number, number, number] = [...dials]
    next[i] = v
    setDials(next)
    settle(next, true)
  }

  const brand = getLocalProfile().session.ad.brandName

  return (
    <div className="ctl-center ctl-allow-scroll" style={{ justifyContent: 'flex-start', gap: 10, paddingTop: 8 }}>
      <div className="ctl-display">{brand || 'TUNING.'}</div>
      {AD_POLES.map((pole, i) => (
        <PercentDial
          key={pole[0]}
          left={pole[0]}
          right={pole[1]}
          value={dials[i]}
          disabled={locked}
          onChange={(v) => twist(i, v)}
        />
      ))}
      <PixelButton type="button" disabled={locked} onClick={() => settle(dials, true)}>
        SETTLE
      </PixelButton>
    </div>
  )
}
