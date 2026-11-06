import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { asset } from '../lib/content.ts'
import { haptic } from '../lib/haptics.ts'
import { rejoinQueue, sendCommand, sendGenerate, sessionId, startLive, useLive, useNow } from '../lib/live.ts'
import { CONFIG, nextObject, playableObjects, type ObjectId } from '../shared/config.ts'
import type { ArticleParams, GenerateRequest, WebsiteParams } from '../shared/types.ts'
import ArticleControls from './ArticleControls.tsx'
import { Segmented } from './controls.tsx'
import WebsiteControls from './WebsiteControls.tsx'

export type Transmit = (req: { object: 'article'; params: ArticleParams } | { object: 'website'; params: WebsiteParams }) => void

let gesturesLocked = false
function lockGestures() {
  if (gesturesLocked) return
  gesturesLocked = true
  document.addEventListener('gesturestart', (e) => e.preventDefault())
  document.addEventListener(
    'touchmove',
    (e) => {
      if ((e.target as HTMLElement).closest?.('.ctl-allow-scroll')) return
      e.preventDefault()
    },
    { passive: false },
  )
  document.addEventListener('dblclick', (e) => e.preventDefault())
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Background({ id }: { id: ObjectId | null }) {
  return (
    <div className={`ctl-bg ctl-fallback-${id ?? 'default'}`}>
      {id && <div className="ctl-bg" style={{ backgroundImage: `url("${asset(`bg-${id}.jpg`)}")` }} />}
    </div>
  )
}

function StatusChip({ connected, local }: { connected: boolean; local: boolean }) {
  return (
    <span className="chip">
      <span className={`dot ${connected ? 'ok' : 'bad'}`} />
      {local ? 'LOCAL' : connected ? 'LINK' : 'WAIT'}
    </span>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="pop-in ctl-center">{children}</div>
}

function QueueScreen({ position }: { position: number }) {
  return (
    <Centered>
      <div className="radar" />
      <div className="ctl-display">
        QUEUE POSITION: {position}.
        <br />
        <em>{position === 1 ? 'YOU ARE NEXT.' : 'STAND BY.'}</em>
      </div>
      <div className="ctl-label">
        MAX WAIT {fmt(position * CONFIG.TURN_SECONDS * 1000)}
        <br />
        KEEP THIS PAGE OPEN.
      </div>
    </Centered>
  )
}

const REASONS: Record<string, string> = {
  cooldown: 'COOLDOWN ACTIVE.',
  busy: 'PROCESS ALREADY RUNNING.',
  blocked: 'INPUT REJECTED. TERM NOT PERMITTED.',
  invalid: 'INPUT REJECTED.',
  not_active: 'CONTROL NOT HELD.',
  error: 'TRANSMISSION FAILED. RETRY.',
}

export default function Controller() {
  const live = useLive()
  const now = useNow(250)
  const snap = live.snap
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)
  const lastTouch = useRef(0)

  useEffect(() => {
    startLive('controller')
    lockGestures()
  }, [])

  const say = useCallback((text: string) => setToast({ text, key: Date.now() }), [])

  const active = snap?.position === 0
  const open = active ? snap.display.open : null
  const busy = active ? snap.display.busy : null
  const completed = snap?.display.completed ?? []
  const completedKey = completed.join(',')
  const idleLeft = active && snap.lastActivityAt ? snap.lastActivityAt + CONFIG.IDLE_SECONDS * 1000 - now : Infinity
  const turnLeft = active && snap.turnStartedAt ? snap.turnStartedAt + CONFIG.TURN_SECONDS * 1000 - now : 0
  const idleWarning = active && !busy && idleLeft < 7000

  const finishObject = useCallback(async () => {
    haptic('press')
    await sendCommand('done')
  }, [])

  const wasBusy = useRef(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (wasBusy.current && !busy && active) {
      haptic('success')
      say('OUTPUT GENERATED.')
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(() => void finishObject(), 2800)
    }
    wasBusy.current = !!busy
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [busy, active, say, finishObject])

  useEffect(() => {
    if (!active || busy || !snap || live.ended) return
    if (open) return
    const n = nextObject(completed)
    if (n) void sendCommand('open', n)
    else if (completed.length > 0) void sendCommand('end')
  }, [active, open, busy, completedKey, completed.length, live.ended])

  const wasActive = useRef(false)
  useEffect(() => {
    if (active && !wasActive.current) haptic('success')
    wasActive.current = active
  }, [active])

  const markActivity = () => {
    if (!active) return
    const t = Date.now()
    if (t - lastTouch.current > 3000 || idleWarning) {
      lastTouch.current = t
      void sendCommand('touch')
    }
  }

  const transmit: Transmit = async (req) => {
    haptic('press')
    const res = await sendGenerate({ ...req, session: sessionId() } as GenerateRequest)
    if (res.ok) say('INPUT RECEIVED.')
    else {
      haptic('error')
      say(res.reason === 'cooldown' && res.secondsLeft ? `COOLDOWN. RETRY IN ${res.secondsLeft}S.` : REASONS[res.reason ?? 'error'])
    }
  }

  let content: ReactNode
  if (!snap) {
    content = <Centered><div className="scanline" /><div className="ctl-label">ESTABLISHING LINK...</div></Centered>
  } else if (live.ended) {
    content = (
      <Centered>
        <div className="ctl-display">
          SESSION COMPLETE.
          <br />
          <em>CONTROL TRANSFERRED.</em>
        </div>
        <div className="ctl-label">YOUR INPUT HAS BEEN RECORDED.</div>
        <button className="big-btn ghost" onClick={() => { haptic('press'); rejoinQueue() }}>
          REJOIN QUEUE
        </button>
      </Centered>
    )
  } else if (snap.position > 0) {
    content = <QueueScreen position={snap.position} />
  } else if (!active) {
    content = <Centered><div className="scanline" /><div className="ctl-label">REQUESTING ACCESS...</div></Centered>
  } else if (!open) {
    content = <Centered><div className="scanline" /><div className="ctl-label">LOADING NEXT OBJECT...</div></Centered>
  } else {
    const hasAltered = !!snap.altered[open as keyof typeof snap.altered]
    content = (
      <div className="ctl-object" key={open}>
        <Segmented
          options={[
            { value: 'original', label: 'ORIGINAL' },
            { value: 'altered', label: 'ALTERED', disabled: !hasAltered },
          ]}
          value={hasAltered ? snap.display.view : 'original'}
          pinkWhen="altered"
          disabled={!!busy}
          onChange={(v) => void sendCommand('view', v)}
        />
        <div className="ctl-object-body">
          {open === 'article' && <ArticleControls snap={snap} locked={!!busy} transmit={transmit} />}
          {open === 'website' && <WebsiteControls snap={snap} locked={!!busy} transmit={transmit} say={say} />}
          {busy && (
            <div className="lock-shade">
              <div>
                <div className="ctl-display">PROCESSING.<br />CONTROLS LOCKED.</div>
                <div className="scanline" />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ctl" onPointerDownCapture={markActivity}>
      <Background id={open} />
      <div className="ctl-main">
        <div className="ctl-top">
          {active && open ? (
            <span className="chip">{open.toUpperCase()} · {completed.length + 1}/{playableObjects().length}</span>
          ) : (
            <span className="chip">{CONFIG.TITLE}</span>
          )}
          <div className="ctl-timer">
            {active && (
              <>
                <div className={`ctl-clock ${turnLeft < 15000 ? 'hot' : ''}`}>{fmt(turnLeft)}</div>
                <div className="ctl-meter">
                  <div style={{ width: `${Math.max(0, turnLeft / (CONFIG.TURN_SECONDS * 10))}%` }} />
                </div>
              </>
            )}
          </div>
          <StatusChip connected={live.connected} local={live.backendKind === 'local'} />
        </div>
        {content}
        {active && open && (
          <button
            className="end-session"
            onClick={() => {
              if (advanceTimer.current) clearTimeout(advanceTimer.current)
              void finishObject()
            }}
          >
            NEXT OBJECT
          </button>
        )}
      </div>
      {idleWarning && (
        <div className="idle-warn">
          INACTIVITY DETECTED.
          <br />
          RELEASING CONTROL IN {Math.max(0, Math.ceil(idleLeft / 1000))}.
        </div>
      )}
      {toast && <div key={toast.key} className="toast" onAnimationEnd={() => setToast(null)}>{toast.text}</div>}
    </div>
  )
}
