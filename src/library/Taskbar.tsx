import { useEffect, useState } from 'react'
import { AssetImg } from '../components/AssetImg.tsx'
import { ObjectIcon } from '../components/ObjectIcons.tsx'
import { OBJECTS, type ObjectId } from '../shared/config.ts'
import type { Live } from '../lib/live.ts'

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])
  return <span>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
}

export default function Taskbar({ live, openId }: { live: Live; openId: ObjectId | null }) {
  const snap = live.snap
  const obj = OBJECTS.find((o) => o.id === openId)
  return (
    <div className="taskbar">
      <div className="start-btn">
        <AssetImg names={['start-button.png']} alt="Start" fallback={<div className="start-fallback"><i />start</div>} />
      </div>
      {obj && (
        <div className="task-btn">
          <span style={{ width: 22, height: 22 }}><ObjectIcon id={obj.id} /></span>
          {obj.file}
        </div>
      )}
      <div className="tray">
        {snap && (
          <span className="mono">
            {snap.hasActive ? 'OPERATOR ACTIVE' : 'AWAITING OPERATOR'}
            {snap.waiting > 0 ? ` · ${snap.waiting} IN QUEUE` : ''}
          </span>
        )}
        <span className="mono">
          {live.backendKind === 'local' ? (
            <><span className="dot ok" />LOCAL</>
          ) : live.connected ? (
            <><span className="dot ok" />CONNECTED</>
          ) : (
            <><span className="dot bad" />RECONNECTING</>
          )}
        </span>
        <Clock />
      </div>
    </div>
  )
}
