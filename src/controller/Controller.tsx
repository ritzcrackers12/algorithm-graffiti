import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { asset } from '../lib/content.ts'
import { haptic } from '../lib/haptics.ts'
import { rejoinQueue, sendCommand, sendGenerate, sessionId, startLive, useLive, useNow } from '../lib/live.ts'
import { CONFIG, type ObjectId } from '../shared/config.ts'
import type { ArticleParams, GenerateRequest, WebsiteParams } from '../shared/types.ts'
import ArticleChooser from './ArticleChooser.tsx'
import ArticleControls from './ArticleControls.tsx'
import { Segmented } from './controls.tsx'
import Picker from './Picker.tsx'
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

function DoneAllButton({ onDone }: { onDone: () => void }) {
  return (
    <button className="done-all" onClick={onDone}>
      I AM DONE WITH ALL THE MEDIA OBJECTS
    </button>
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
  const [choosingArticle, setChoosingArticle] = useState(false)
  const lastTouch = useRef(0)

  useEffect(() => {
    startLive('controller')
    lockGestures()
  }, [])

  const say = useCallback((text: string) => setToast({ text, key: Date.now() }), [])

  const active = snap?.position === 0
  const open = active ? snap.display.open : null
  const storyId = active ? snap.display.articleId : null
  const busy = active ? snap.display.busy : null
  const idleLeft = active && snap.lastActivityAt ? snap.lastActivityAt + CONFIG.IDLE_SECONDS * 1000 - now : Infinity
  const turnLeft = active && snap.turnStartedAt ? snap.turnStartedAt + CONFIG.TURN_SECONDS * 1000 - now : 0
  const idleWarning = active && !busy && idleLeft < 7000

  const endVisit = useCallback(() => {
    haptic('press')
    void sendCommand('end')
  }, [])

  const wasBusy = useRef(false)
  useEffect(() => {
    if (wasBusy.current && !busy && active) {
      haptic('success')
      say('OUTPUT GENERATED.')
    }
    wasBusy.current = !!busy
  }, [busy, active, say])

  const wasActive = useRef(false)
  useEffect(() => {
    if (active && !wasActive.current) haptic('success')
    if (!active) setChoosingArticle(false)
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
  } else if (!open && !choosingArticle) {
    content = (
      <Picker
        onPick={(id) => {
          if (id === 'article') setChoosingArticle(true)
          else void sendCommand('open', id)
        }}
      />
    )
  } else if ((choosingArticle && !open) || (open === 'article' && !storyId)) {
    content = (
      <ArticleChooser
        onPick={(id) => {
          void sendCommand('story', id)
        }}
        onBack={() => {
          haptic('press')
          setChoosingArticle(false)
          if (open) void sendCommand('home')
        }}
      />
    )
  } else {
    const hasAltered = open === 'article'
      ? snap.altered.article?.params.articleId === storyId
      : !!snap.altered[open as keyof typeof snap.altered]
    content = (
      <div className="ctl-object" key={`${open}:${storyId ?? ''}`}>
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
          {open === 'article' && storyId && (
            <ArticleControls snap={snap} articleId={storyId} locked={!!busy} transmit={transmit} say={say} />
          )}
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
        <button
          className="end-session"
          onClick={() => {
            haptic('press')
            setChoosingArticle(false)
            void sendCommand('home')
          }}
        >
          BACK TO ICONS
        </button>
      </div>
    )
  }

  return (
    <div className="ctl" onPointerDownCapture={markActivity}>
      <Background id={open ?? (choosingArticle ? 'article' : null)} />
      <div className="ctl-main">
        <div className="ctl-top">
          <div className="ctl-top-meta">
            <span className="chip">{active && (open || choosingArticle) ? (open ?? 'article').toUpperCase() : CONFIG.TITLE}</span>
            <StatusChip connected={live.connected} local={live.backendKind === 'local'} />
          </div>
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
          {active && <DoneAllButton onDone={endVisit} />}
        </div>
        {content}
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
