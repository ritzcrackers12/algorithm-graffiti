import type { AdPlacement } from '../shared/ads.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import { WhyButton } from './WhyAd.tsx'
import { XpWindow } from './XpWindow.tsx'

const BASE = import.meta.env.BASE_URL

export default function AdPopup({
  place, profile, onClose,
}: { place: AdPlacement; profile: VisitorProfile; onClose: () => void }) {
  return (
    <div className="ad-popup">
      <XpWindow title="Message" menu={null} onClose={onClose}>
        <div className="ad-popup-body">
          <img src={`${BASE}assets/${place.image}`} alt="" />
          <div className="ad-popup-copy">
            <div className="ad-kicker">Sponsored <WhyButton place={place} profile={profile} /></div>
            <div className="ad-headline">{place.headline}</div>
            <div className="ad-brand">{place.brand}</div>
            <button type="button" className="xp-button" style={{ marginTop: 10 }} onClick={onClose}>OK</button>
          </div>
        </div>
      </XpWindow>
    </div>
  )
}
