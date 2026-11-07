import { AssetImg } from '../components/AssetImg.tsx'
import { ObjectIcon } from '../components/ObjectIcons.tsx'
import { OBJECTS, type ObjectId } from '../shared/config.ts'
import { haptic } from '../lib/haptics.ts'

export default function Picker({ onPick }: { onPick: (id: ObjectId) => void }) {
  return (
    <div className="picker">
      <div className="picker-label ctl-display">CLICK AN ICON TO START.</div>
      <div className="picker-grid">
        {OBJECTS.map((o) => (
          <button
            key={o.id}
            className="tile"
            disabled={!o.ready}
            onClick={() => {
              haptic('press')
              onPick(o.id)
            }}
          >
            {!o.ready && <span className="tag">OFFLINE</span>}
            <div className="art">
              <AssetImg names={[`icon-${o.id}.png`]} fallback={<ObjectIcon id={o.id} />} />
            </div>
            <div className="name">{o.label}</div>
            <div className="sub">{o.file}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
