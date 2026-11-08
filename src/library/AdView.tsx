import { templateCard } from '../shared/adTuner.ts'
import { PARODY_BRANDS } from '../shared/parodyBrands.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { AdResult } from '../shared/types.ts'

export default function AdView({
  result, profile,
}: {
  result?: AdResult
  profile?: VisitorProfile | null
}) {
  const session = profile?.session.ad
  const brand = PARODY_BRANDS.find((b) => b.id === (result?.brandId || session?.brandId))
  const dials = result?.dials ?? session?.dials ?? [50, 50, 50]
  const card = brand ? templateCard(brand, dials) : null
  const overlay = result?.overlay ?? session?.overlay ?? card?.overlay
  const imageUrl = result?.imageUrl ?? session?.imageUrl ?? null
  const hue = card?.hue ?? 210

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>promo.bmp</span>
      </div>
      <div className="ad-stage">
        {!overlay ? (
          <div className="machine-line" style={{ color: '#c6ff3d' }}>SET THE DIALS ON THE PHONE.</div>
        ) : (
          <div className="ad-hero" style={{ background: `linear-gradient(160deg, hsl(${hue} 40% 18%), hsl(${hue} 30% 8%))` }}>
            {imageUrl ? <img src={imageUrl} alt="" /> : <div className="ad-hero-ph" />}
            <div className="ad-overlay">
              <div className="ad-word">{overlay.wordmark}</div>
              <div className="ad-head">{overlay.headline}</div>
              <div className="ad-cta">{overlay.cta}</div>
            </div>
          </div>
        )}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{imageUrl ? 'IMAGE GENERATED.' : overlay ? 'TEMPLATE CARD.' : 'STANDBY.'}</span>
        <span style={{ width: 160 }}>{(result?.source || session?.source || '').toUpperCase()}</span>
      </div>
    </>
  )
}
