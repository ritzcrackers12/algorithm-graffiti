import { useState } from 'react'
import type { AdPlacement } from '../shared/ads.ts'
import { fullReport, officialWhy } from '../shared/ads.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import { emptyProfile } from '../shared/profile.ts'
import { XpWindow } from './XpWindow.tsx'

export function WhyButton({ place, profile }: { place: AdPlacement; profile?: VisitorProfile | null }) {
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState(false)
  const p = profile ?? emptyProfile()
  return (
    <>
      <button type="button" className="why-btn" aria-label="Why am I seeing this?" onClick={() => { setOpen(true); setFull(false) }}>i</button>
      {open && (
        <div className="xp-dialog-shade" onClick={() => setOpen(false)}>
          <div className="xp-dialog" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
            <XpWindow title="Ad notice" menu={null} closeOnly>
              <div style={{ padding: 16, font: '13px Tahoma, sans-serif', color: '#111', lineHeight: 1.45 }}>
                <p>{officialWhy()}</p>
                {!full ? (
                  <button type="button" className="xp-button" style={{ marginTop: 12 }} onClick={() => setFull(true)}>
                    FULL REPORT
                  </button>
                ) : (
                  <p style={{ marginTop: 12, font: '11px/1.5 "SF Mono", Menlo, monospace', whiteSpace: 'pre-wrap' }}>
                    {fullReport(place, p)}
                  </p>
                )}
                <div style={{ marginTop: 14, textAlign: 'right' }}>
                  <button type="button" className="xp-button" onClick={() => setOpen(false)}>OK</button>
                </div>
              </div>
            </XpWindow>
          </div>
        </div>
      )}
    </>
  )
}
