import { useEffect, useState } from 'react'
import { getLive, startLive, useLive } from '../lib/live.ts'
import { startVersionCheck } from '../lib/versionCheck.ts'
import Desktop from './Desktop.tsx'
import TapToBegin from './TapToBegin.tsx'

function useStageScale() {
  const calc = () => Math.min(window.innerWidth / 1366, window.innerHeight / 1024)
  const [scale, setScale] = useState(calc)
  useEffect(() => {
    const on = () => setScale(calc())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return scale
}

let versionCheckStarted = false

export default function Library() {
  const live = useLive()
  const scale = useStageScale()
  const [begun, setBegun] = useState(false)

  useEffect(() => {
    startLive('library')
    if (!versionCheckStarted) {
      versionCheckStarted = true
      // Only reload for a new deploy when nobody is mid-interaction.
      startVersionCheck(() => {
        const s = getLive().snap
        return !s || (!s.hasActive && !s.display.busy)
      })
    }
  }, [])

  return (
    <div className="stage-outer">
      <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <Desktop live={live} />
        {!begun && <TapToBegin onBegin={() => setBegun(true)} />}
      </div>
    </div>
  )
}
