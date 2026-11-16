import { useEffect, useRef, useState } from 'react'
import { getLive, sendControl, startLive, useLive } from '../lib/live.ts'
import { getControl, subscribeControl } from '../lib/controlSync.ts'
import { startVersionCheck } from '../lib/versionCheck.ts'
import { TouchWarning } from '../components/TouchWarning.tsx'
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
  const [touchWarn, setTouchWarn] = useState(false)
  const warnRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  warnRef.current = touchWarn

  // Any touch on the display is a mistake — it's a screen, not a controller.
  // Show the warning here and push it to the active phone; auto-clear after 8s
  // so it never sticks between visitors.
  useEffect(() => {
    if (!begun) return
    const show = () => {
      if (warnRef.current) return
      setTouchWarn(true)
      void sendControl({ kind: 'touchwarn', action: 'show' })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setTouchWarn(false)
        void sendControl({ kind: 'touchwarn', action: 'clear' })
      }, 8000)
    }
    const onDown = () => show()
    window.addEventListener('pointerdown', onDown, true)
    const unsub = subscribeControl(() => {
      const c = getControl()
      if (c?.kind === 'touchwarn' && c.action === 'clear') {
        setTouchWarn(false)
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      }
    })
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [begun])

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
      {touchWarn && <TouchWarning variant="ipad" />}
    </div>
  )
}
