import { AssetImg } from '../components/AssetImg.tsx'
import { ObjectIcon } from '../components/ObjectIcons.tsx'
import { PixelButton } from '../components/PixelButton.tsx'
import { haptic } from '../lib/haptics.ts'
import { OBJECTS, type ObjectId } from '../shared/config.ts'
import { inputCount, objectLocked, UNLOCK_AFTER } from '../shared/gating.ts'

export default function Picker({
  onPick, used = [],
}: { onPick: (id: ObjectId) => void; used?: string[] }) {
  const stillLocked = inputCount(used) < UNLOCK_AFTER
  return (
    <div className="picker">
      <div className="picker-label ctl-display">CLICK AN APP TO START.</div>
      {stillLocked && (
        <div className="picker-hint">MESSAGES &amp; RADIO UNLOCK ONCE YOU USE ARTICLES &amp; VIDEOS.</div>
      )}
      <div className="picker-grid">
        {OBJECTS.map((o) => {
          const locked = objectLocked(o.id, used) || !o.ready
          const inner = (
            <>
              {locked && <span className="tag">ACCESS RESTRICTED</span>}
              <div className="art">
                <AssetImg names={[`icon-${o.id}.png`]} fallback={<ObjectIcon id={o.id} />} />
              </div>
              <div className="name">{o.label}</div>
              <div className="sub">
                {locked ? 'INSUFFICIENT DATA.' : o.file}
              </div>
            </>
          )
          return locked ? (
            <div key={o.id} className="tile locked">{inner}</div>
          ) : (
            <PixelButton
              key={o.id}
              type="button"
              className="tile"
              onClick={() => {
                haptic('press')
                onPick(o.id)
              }}
            >
              {inner}
            </PixelButton>
          )
        })}
      </div>
    </div>
  )
}
