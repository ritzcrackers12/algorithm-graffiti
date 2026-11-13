import { useEffect, useState } from 'react'
import { getLive, startLive, useLive } from '../lib/live.ts'
import { startVersionCheck } from '../lib/versionCheck.ts'
import Desktop from './Desktop.tsx'
import { stageLayout } from './stageLayout.ts'
import TapToBegin from './TapToBegin.tsx'

function useStageLayout() {
  const [layout, setLayout] = useState(stageLayout)
  useEffect(() => {
    const on = () => setLayout(stageLayout())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    window.visualViewport?.addEventListener('resize', on)
    window.visualViewport?.addEventListener('scroll', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
      window.visualViewport?.removeEventListener('resize', on)
      window.visualViewport?.removeEventListener('scroll', on)
    }
  }, [])
  return layout
}

let versionCheckStarted = false

export default function Library() {
  const live = useLive()
  const layout = useStageLayout()
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
    <div className="stage-outer theme-win95">
      <div className="stage" style={{ zoom: layout.scale, left: layout.left, top: layout.top }}>
        <Desktop live={live} begun={begun} />
        {!begun && <TapToBegin onBegin={() => setBegun(true)} />}
      </div>
    </div>
  )
}
