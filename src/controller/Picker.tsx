import { useState } from 'react'
import { AssetImg } from '../components/AssetImg.tsx'
import { ObjectIcon } from '../components/ObjectIcons.tsx'
import { haptic } from '../lib/haptics.ts'
import { OBJECTS, type ObjectId } from '../shared/config.ts'
import { XpWindow } from '../library/XpWindow.tsx'

export default function Picker({
  onPick, used = [],
}: { onPick: (id: ObjectId) => void; used?: string[] }) {
  const [why, setWhy] = useState(false)
  return (
    <div className="picker">
      <div className="picker-label ctl-display">CLICK AN ICON TO START.</div>
      <div className="picker-grid">
        {OBJECTS.map((o) => {
          const locked = !o.ready
          const inner = (
            <>
              {locked && <span className="tag">ACCESS RESTRICTED</span>}
              <div className="art">
                <AssetImg names={[`icon-${o.id}.png`]} fallback={<ObjectIcon id={o.id} />} />
              </div>
              <div className="name">{o.label}</div>
              <div className="sub">{locked ? 'INSUFFICIENT DATA.' : o.file}</div>
              {locked && (
                <button
                  type="button"
                  className="why-btn"
                  aria-label="Why can't I open this?"
                  onClick={(e) => {
                    e.stopPropagation()
                    haptic('press')
                    setWhy(true)
                  }}
                >
                  i
                </button>
              )}
            </>
          )
          return locked ? (
            <div key={o.id} className="tile locked">{inner}</div>
          ) : (
            <button
              key={o.id}
              type="button"
              className="tile"
              onClick={() => {
                haptic('press')
                onPick(o.id)
              }}
            >
              {inner}
            </button>
          )
        })}
      </div>
      {why && (
        <div className="xp-dialog-shade" onClick={() => setWhy(false)}>
          <div className="xp-dialog" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <XpWindow title="Access notice" menu={null} closeOnly onClose={() => setWhy(false)}>
              <div style={{ padding: 16, font: '13px Tahoma, sans-serif', color: '#111', lineHeight: 1.45 }}>
                <p>ACCESS RESTRICTED. INSUFFICIENT DATA.</p>
                <p style={{ marginTop: 12, font: '11px/1.5 "SF Mono", Menlo, monospace' }}>
                  OBJECT UNLOCKS AFTER TWO OTHER OBJECTS ARE OPENED. CURRENT: {used.length}.
                </p>
                <div style={{ marginTop: 14, textAlign: 'right' }}>
                  <button type="button" className="xp-button" onClick={() => setWhy(false)}>OK</button>
                </div>
              </div>
            </XpWindow>
          </div>
        </div>
      )}
    </div>
  )
}
