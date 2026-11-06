import type { ObjectId } from '../shared/config.ts'

export default function PlaceholderView({ id }: { id: ObjectId }) {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: '#000', color: '#c6ff3d' }}>
      <div className="machine-line" style={{ color: '#c6ff3d', textAlign: 'center', fontSize: 20 }}>
        MODULE {id.toUpperCase()}: NOT INSTALLED.
        <br />
        <span style={{ color: '#888', fontSize: 15 }}>AWAITING DEPLOYMENT.</span>
      </div>
    </div>
  )
}
