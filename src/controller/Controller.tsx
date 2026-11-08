import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { asset } from '../lib/content.ts'
import { haptic } from '../lib/haptics.ts'
import { rejoinQueue, sendCommand, sendGenerate, sessionId, startLive, useLive } from '../lib/live.ts'
import { bootProfile, getLocalProfile, recordArticle, resetLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import { pickAd, personalizeAd } from '../shared/ads.ts'
import { CONFIG, type ObjectId } from '../shared/config.ts'
import { objectsTouched } from '../shared/games.ts'
import { addEvent, hydrateProfile } from '../shared/profile.ts'
import type { ArticleParams, GenerateRequest } from '../shared/types.ts'
import AdPhoneControls from './AdPhoneControls.tsx'
import ArticleChooser from './ArticleChooser.tsx'
import ArticleControls from './ArticleControls.tsx'
import GameControls from './GameControls.tsx'
import ReelControls from './ReelControls.tsx'
import { Segmented } from './controls.tsx'
import Picker from './Picker.tsx'

export type Transmit = (req: { object: 'article'; params: ArticleParams }) => void

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
      <div className="ctl-label">KEEP THIS PAGE OPEN.</div>
    </Centered>
  )
}

function DoneAllButton({ onDone }: { onDone: () => void }) {
  return (
    <button className="done-all" onClick={onDone}>
      END SESSION
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
  const snap = live.snap
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)
  const [choosingArticle, setChoosingArticle] = useState(false)
  const lastTouch = useRef(0)
  const lastPopup = useRef(0)

  useEffect(() => {
    startLive('controller')
    lockGestures()
  }, [])

  const say = useCallback((text: string) => setToast({ text, key: Date.now() }), [])

  const active = snap?.position === 0
  const open = active ? snap.display.open : null
  const storyId = active ? snap.display.articleId : null
  const busy = active ? snap.display.busy : null

  const endVisit = useCallback(() => {
    haptic('press')
    resetLocalProfile()
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
    if (active && !wasActive.current) {
      haptic('success')
      bootProfile()
    }
    if (!active) setChoosingArticle(false)
    if (live.ended) resetLocalProfile()
    wasActive.current = active
  }, [active, live.ended])

  const usedCount = snap?.display.used?.length ?? 0
  const popups = snap?.profile?.popups ?? 0
  useEffect(() => {
    if (!active || !snap) return
    const used = snap.display.used ?? []
    if (used.length < 1) return
    const p = hydrateProfile(snap.profile)
    if (p.popups >= CONFIG.AD_POPUP_MAX) return
    const now = Date.now()
    if (p.lastPopupAt && now - p.lastPopupAt < CONFIG.AD_POPUP_GAP_SECONDS * 1000) return
    if (now - lastPopup.current < 2000) return
    const atHome = !snap.display.open && !choosingArticle
    const loading = !!snap.display.busy
    const first = p.popups === 0 && atHome
    const later = p.popups >= 1 && (atHome || loading)
    if (!first && !later) return
    const match = pickAd(p)
    if (!match) return
    const place = personalizeAd(match, p)
    lastPopup.current = now
    void sendCommand('signal', JSON.stringify({
      lastAd: place,
      popups: p.popups + 1,
      lastPopupAt: now,
      adsShown: [...p.adsShown, place.adId],
    }))
  }, [active, snap, choosingArticle, usedCount, popups, busy?.id, open])

  const liveAd = snap?.profile
    ? (() => {
      const p = hydrateProfile(snap.profile)
      return p.lastAd && p.lastAd.at > (p.adClosedAt ?? 0) ? p.lastAd : null
    })()
    : null

  const closeAd = () => {
    haptic('press')
    const p = getLocalProfile()
    const next = { ...p, adClosedAt: Date.now() }
    setLocalProfile(next)
    void sendCommand('signal', JSON.stringify({ adClosedAt: next.adClosedAt }))
  }

  const likeAd = (liked: boolean) => {
    haptic('press')
    const p = getLocalProfile()
    const id = liveAd?.adId ?? 'ad'
    const ev = addEvent(p, { source: 'ad', key: 'product_like', value: `${id}:${liked ? 'yes' : 'no'}`, at: Date.now() })
    const next = { ...ev, adClosedAt: Date.now() }
    setLocalProfile(next)
    void sendCommand('signal', JSON.stringify({ adClosedAt: next.adClosedAt, events: next.events.slice(-16) }))
  }

  const markActivity = () => {
    if (!active) return
    const t = Date.now()
    if (t - lastTouch.current > 3000) {
      lastTouch.current = t
      void sendCommand('touch')
    }
  }

  const transmit: Transmit = async (req) => {
    haptic('press')
    const profile = req.object === 'article' ? recordArticle(req.params) : getLocalProfile()
    const res = await sendGenerate({ ...req, session: sessionId(), profile } as GenerateRequest)
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
        <div className="ctl-label">INPUT RECORDED.</div>
        <button className="big-btn ghost" onClick={() => { haptic('press'); rejoinQueue() }}>
          REJOIN QUEUE
        </button>
      </Centered>
    )
  } else if (snap.position > 0) {
    content = <QueueScreen position={snap.position} />
  } else if (!active) {
    content = <Centered><div className="scanline" /><div className="ctl-label">REQUESTING ACCESS...</div></Centered>
  } else if (liveAd && open !== 'reel' && open !== 'game') {
    content = (
      <AdPhoneControls
        place={liveAd}
        profile={hydrateProfile(snap.profile)}
        locked={!!busy}
        onClose={closeAd}
        onLike={likeAd}
      />
    )
  } else if (!open && !choosingArticle) {
    content = (
      <Picker
        used={objectsTouched(snap)}
        seen={hydrateProfile(snap.profile).game.seen}
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
      : false
    content = (
      <div className="ctl-object" key={`${open}:${storyId ?? ''}`}>
        {open === 'article' && (
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
        )}
        <div className="ctl-object-body">
          {open === 'article' && storyId && (
            <ArticleControls snap={snap} articleId={storyId} locked={!!busy} transmit={transmit} say={say} />
          )}
          {open === 'reel' && (
            <ReelControls snap={snap} locked={!!busy} say={say} />
          )}
          {open === 'game' && (
            <GameControls snap={snap} locked={!!busy} />
          )}
          {open && open !== 'article' && open !== 'reel' && open !== 'game' && (
            <div className="ctl-center">
              <div className="ctl-display">{open.toUpperCase()}</div>
              <div className="ctl-label">CONTROLS NOT INSTALLED.</div>
            </div>
          )}
          {busy && open !== 'reel' && (
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
            <span className="chip">{active && (open || choosingArticle) ? (open ?? 'article').toUpperCase() : 'CONTROLLER'}</span>
            <StatusChip connected={live.connected} local={live.backendKind === 'local'} />
          </div>
          <div className="ctl-timer" />
          {active && <DoneAllButton onDone={endVisit} />}
        </div>
        {content}
      </div>
      {toast && <div key={toast.key} className="toast" onAnimationEnd={() => setToast(null)}>{toast.text}</div>}
    </div>
  )
}
