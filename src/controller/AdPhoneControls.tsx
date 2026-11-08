import { useState } from 'react'
import { haptic } from '../lib/haptics.ts'
import type { AdPlacement } from '../shared/ads.ts'
import { fullReport, officialWhy } from '../shared/ads.ts'
import type { VisitorProfile } from '../shared/profile.ts'

export default function AdPhoneControls({
  place, profile, locked, onClose, onLike,
}: {
  place: AdPlacement
  profile: VisitorProfile
  locked: boolean
  onClose: () => void
  onLike: (liked: boolean) => void
}) {
  const [panel, setPanel] = useState<'main' | 'why' | 'like'>('main')
  const [full, setFull] = useState(false)

  if (panel === 'why') {
    return (
      <div className="ctl-center">
        <div className="ctl-display">
          {officialWhy()}
          {full ? (
            <>
              <br />
              <em style={{ fontSize: 13, letterSpacing: '0.04em' }}>{fullReport(place, profile)}</em>
            </>
          ) : null}
        </div>
        {!full && (
          <button className="big-btn" type="button" disabled={locked} onClick={() => { haptic('press'); setFull(true) }}>
            FULL REPORT
          </button>
        )}
        <button className="big-btn ghost" type="button" disabled={locked} onClick={() => { haptic('press'); setPanel('main'); setFull(false) }}>
          BACK
        </button>
      </div>
    )
  }

  if (panel === 'like') {
    return (
      <div className="ctl-center">
        <div className="ctl-display">DO YOU LIKE THIS PRODUCT?</div>
        <div className="ctl-label">{place.product.toUpperCase()}</div>
        <div className="reel-rates">
          <button className="big-btn" type="button" disabled={locked} onClick={() => { haptic('press'); onLike(true) }}>YES</button>
          <button className="big-btn ghost" type="button" disabled={locked} onClick={() => { haptic('press'); onLike(false) }}>NO</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ctl-center">
      <div className="ctl-display">AN AD IS ON THE IPAD SCREEN.</div>
      <div className="reel-rates">
        <button className="big-btn" type="button" disabled={locked} onClick={() => { haptic('press'); setPanel('why') }}>
          LEARN MORE
        </button>
        <button className="big-btn" type="button" disabled={locked} onClick={() => { haptic('press'); setPanel('like') }}>
          DO YOU LIKE THIS PRODUCT?
        </button>
        <button className="big-btn ghost" type="button" disabled={locked} onClick={() => { haptic('press'); onClose() }}>
          CLOSE
        </button>
      </div>
    </div>
  )
}
