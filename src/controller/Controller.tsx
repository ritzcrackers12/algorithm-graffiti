import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AssetImg } from '../components/AssetImg.tsx'
import { ObjectIcon } from '../components/ObjectIcons.tsx'
import { asset } from '../lib/content.ts'
import { haptic } from '../lib/haptics.ts'
import { rejoinQueue, sendCommand, sendGenerate, sessionId, startLive, useLive, useNow } from '../lib/live.ts'
import { CONFIG, OBJECTS, type ObjectId } from '../shared/config.ts'
import type { ArticleParams, GenerateRequest, Snapshot, WebsiteParams } from '../shared/types.ts'
import ArticleControls from './ArticleControls.tsx'
import { Segmented } from './controls.tsx'
import WebsiteControls from './WebsiteControls.tsx'

export type Transmit = (req: { object: 'article'; params: ArticleParams } | { object: 'website'; params: WebsiteParams }) => void

// Stop the page itself from scrolling, bouncing or zooming while thumbs are on the controls.
let gesturesLocked = false
function lockGestures() {
  if (gesturesLocked) return
  gesturesLocked = true
  document.addEventListener('gesturestart', (e) => e.preventDefault())
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!(e.target as HTMLElement).closest?.('.ctl-scroll')) e.preventDefault()
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
    <span className="chip" style={{ display: 'flex', alignItems: 'center' }}>
      <span className={`dot ${connected ? 'ok' : 'bad'}`} />
      {local ? 'LOCAL' : connected ? 'CONNECTED' : 'RECONNECTING'}
    </span>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="pop-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18, padding: '0 10px' }}>{children}</div>
}

function QueueScreen({ position }: { position: number }) {
  return (
    <Centered>
      <div className="radar" />
      <div style={{ font: '800 26px/1.2 var(--font-mono)', letterSpacing: 2 }}>
        {position === 1 ? 'YOU ARE NEXT.' : `QUEUE POSITION: ${position}.`}
        <br />
        <span style={{ color: 'var(--color-signal)' }}>STAND BY.</span>
      </div>
      <div className="ctl-label" style={{ lineHeight: 1.7 }}>
        MAX WAIT {fmt(position * CONFIG.TURN_SECONDS * 1000)}
        <br />
        KEEP THIS PAGE OPEN.
      </div>
    </Centered>
  )
}

function Picker({ snap, onPick }: { snap: Snapshot; onPick: (id: ObjectId) => void }) {
  return (
    <div className="ctl-scroll pop-in" style={{ paddingTop: 6 }}>
      <div className="ctl-label" style={{ textAlign: 'center', margin: '6px 0 14px' }}>SELECT OBJECT FOR MODIFICATION.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {OBJECTS.map((o, i) => (
          <button
            key={o.id}
            className="tile"
            disabled={!o.ready}
            style={{ minHeight: 150, gridColumn: i === OBJECTS.length - 1 && OBJECTS.length % 2 ? 'span 2' : undefined }}
            onClick={() => onPick(o.id)}
          >
            {snap.altered[o.id as keyof typeof snap.altered] && <span className="tag">ALTERED</span>}
            <div className="art"><AssetImg names={[`icon-${o.id}.png`]} fallback={<ObjectIcon id={o.id} />} /></div>
            <div className="name">{o.label}</div>
            <div className="sub">{o.ready ? o.file.toUpperCase() : 'MODULE OFFLINE'}</div>
          </button>
        ))}
      </div>
    </div>
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
  const idleLeft = active && snap.lastActivityAt ? snap.lastActivityAt + CONFIG.IDLE_SECONDS * 1000 - now : Infinity
  const turnLeft = active && snap.turnStartedAt ? snap.turnStartedAt + CONFIG.TURN_SECONDS * 1000 - now : 0
  const idleWarning = active && !busy && idleLeft < 7000

  // Feedback when a generation finishes.
  const wasBusy = useRef(false)
  useEffect(() => {
    if (wasBusy.current && !busy && active) {
      haptic('success')
      say('OUTPUT GENERATED.')
    }
    wasBusy.current = !!busy
  }, [busy, active, say])

  // Gaining control.
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
        <div style={{ font: '800 26px/1.25 var(--font-mono)', letterSpacing: 2 }}>
          SESSION COMPLETE.
          <br />
          <span style={{ color: 'var(--color-signal)' }}>CONTROL TRANSFERRED.</span>
        </div>
        <div className="ctl-label">YOUR INPUT HAS BEEN RECORDED.</div>
        <button className="big-btn ghost" style={{ marginTop: 20 }} onClick={() => { haptic('press'); rejoinQueue() }}>
          REJOIN QUEUE
        </button>
      </Centered>
    )
  } else if (snap.position > 0) {
    content = <QueueScreen position={snap.position} />
  } else if (!active) {
    content = <Centered><div className="scanline" /><div className="ctl-label">REQUESTING ACCESS...</div></Centered>
  } else if (!open) {
    content = <Picker snap={snap} onPick={(id) => { haptic('press'); void sendCommand('open', id) }} />
  } else {
    const hasAltered = !!snap.altered[open as keyof typeof snap.altered]
    content = (
      <div className="ctl-scroll" key={open} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 6 }}>
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
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {open === 'article' && <ArticleControls snap={snap} locked={!!busy} transmit={transmit} />}
          {open === 'website' && <WebsiteControls snap={snap} locked={!!busy} transmit={transmit} say={say} />}
          {busy && (
            <div className="lock-shade">
              <div>
                <div style={{ font: '800 18px/1.4 var(--font-mono)', letterSpacing: 2 }}>PROCESSING.<br />CONTROLS LOCKED.</div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, marginBottom: 10 }}>
          {active && open ? (
            <button
              className="chip"
              style={{ border: 0, color: '#fff', padding: '12px 16px', fontSize: 13 }}
              onClick={() => { haptic('press'); void sendCommand('home') }}
            >
              ⌂ HOME
            </button>
          ) : (
            <span className="chip">{CONFIG.TITLE}</span>
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {active && (
              <>
                <div style={{ font: '800 26px/1 var(--font-mono)', letterSpacing: 2, color: turnLeft < 15000 ? '#ff2ea0' : '#fff' }}>{fmt(turnLeft)}</div>
                <div style={{ height: 3, marginTop: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(0, turnLeft / (CONFIG.TURN_SECONDS * 10))}%`, background: turnLeft < 15000 ? '#ff2ea0' : 'var(--color-signal)', transition: 'width .25s linear' }} />
                </div>
              </>
            )}
          </div>
          <StatusChip connected={live.connected} local={live.backendKind === 'local'} />
        </div>
        {content}
        {active && (
          <button
            style={{ background: 'none', border: 0, color: 'rgba(255,255,255,0.45)', font: '700 11px/1 var(--font-mono)', letterSpacing: 2, padding: '12px 0 2px' }}
            onClick={() => { haptic('press'); void sendCommand('end') }}
          >
            END SESSION
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
