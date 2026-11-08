import { useEffect, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { adImageReady, adImageUrl, preloadAdImage } from '../lib/adReady.ts'
import type { AdPlacement } from '../shared/ads.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import { WhyButton } from './WhyAd.tsx'
import { XpWindow } from './XpWindow.tsx'

export default function AdPopup({
  place, profile, onClose,
}: { place: AdPlacement; profile: VisitorProfile; onClose: () => void }) {
  const src = adImageUrl(place.image)
  const [ready, setReady] = useState(() => adImageReady(place.image))

  useEffect(() => {
    preloadAdImage(place.image)
    if (adImageReady(place.image)) {
      setReady(true)
      return
    }
    setReady(false)
    const img = new Image()
    img.onload = () => setReady(true)
    img.onerror = () => setReady(true)
    img.src = src
  }, [place.image, src])

  if (!ready) return null

  return (
    <div className="ad-popup theme-win95">
      <XpWindow title="Message" menu={null} onClose={onClose}>
        <div className="ad-popup-body">
          <img src={src} alt="" />
          <div className="ad-popup-copy">
            <div className="ad-kicker">Sponsored <WhyButton place={place} profile={profile} /></div>
            <div className="ad-headline">{place.headline}</div>
            <div className="ad-brand">{place.brand}</div>
            <PixelButton type="button" className="xp-button" style={{ marginTop: 10 }} onClick={onClose}>OK</PixelButton>
          </div>
        </div>
      </XpWindow>
    </div>
  )
}
