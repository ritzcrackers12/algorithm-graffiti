import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { asset } from '../lib/content.ts'
import { haptic } from '../lib/haptics.ts'
import { getLive, rejoinQueue, sendCommand, sendControl, sendGenerate, sessionId, startLive, useLive } from '../lib/live.ts'
import { startVersionCheck } from '../lib/versionCheck.ts'
import { resetChatWire } from '../lib/chatSync.ts'
import { bootProfile, getLocalProfile, recordArticle, resetLocalProfile, setLocalProfile } from '../lib/profileClient.ts'
import type { ObjectId } from '../shared/config.ts'
import { REEL_BUCKETS, bucketMeta, type ReelBucket } from '../shared/reelLibrary.ts'
import { poleMeaning } from '../shared/poleMeta.ts'
import { objectsTouched, reportReady } from '../shared/gating.ts'
import type { ArticleParams, GenerateRequest } from '../shared/types.ts'
import ArticleChooser from './ArticleChooser.tsx'
import ArticleControls from './ArticleControls.tsx'
import AdControls from './AdControls.tsx'
import ChatControls from './ChatControls.tsx'
import ReelControls from './ReelControls.tsx'
import { PixelButton } from '../components/PixelButton.tsx'
import { Segmented } from './controls.tsx'
import Picker from './Picker.tsx'
import Onboarding, { Tour, AppIcon, type Slide } from './Onboarding.tsx'
import ControllerReport from './ControllerReport.tsx'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ArticleResult } from '../shared/types.ts'

type GuideRow = { name: string; meaning: string }

const APP_GUIDE: Record<string, { title: string; how: string; rows?: GuideRow[] }> = {
  article: {
    title: 'Articles',
    how: 'This takes a real news story and rewrites it to fit who it thinks you are. Set your background and leanings with the sliders, then tap SUBMIT — and compare the rewrite to the original.',
    rows: [
      { name: 'Political lean', meaning: 'Which way the story’s framing tilts — the further you slide, the more left- or right-leaning it reads.' },
      { name: 'Connotation', meaning: 'The overall feeling of the writing, from a dark, negative tone to a positive, hopeful one.' },
      { name: 'Dramatic', meaning: 'How sensational it gets — from calm and matter-of-fact to exaggerated and attention-grabbing.' },
      { name: 'Reader profile', meaning: 'The education level the article is pitched at, from plain and simple to dense and academic.' },
      { name: 'Income bracket', meaning: 'The income level of the audience the story assumes it’s written for.' },
    ],
  },
  reel: {
    title: 'Videos',
    how: 'This is a feed that bends to your taste. Pick a vibe, then use the dials to tune your algorithm to the kind of content you want to see, and tap SEND.',
    rows: [
      { name: 'The dials', meaning: 'Each dial has two traits labeled on its ends. Drag toward whichever one you want the feed to lean into.' },
    ],
  },
  ad: {
    title: 'Radio',
    how: 'This builds a track from scratch to match your mood. Turn the three dials to shape its energy, mood and texture, then tap TUNE IN.',
    rows: [
      { name: 'Energy', meaning: 'How intense the track feels — slow and relaxed at one end, fast and driving at the other.' },
      { name: 'Mood', meaning: 'The emotional tone of the music, from dark and heavy to bright and upbeat.' },
      { name: 'Texture', meaning: 'How the sound is produced — smooth and polished at one end, raw and distorted (gritty, lo-fi) at the other.' },
    ],
  },
  chat: {
    title: 'Messages',
    how: 'This drops you into a text conversation. Pick who you’re talking to, then just reply with whatever feels right.',
  },
}

function isReelBucket(x: string): x is ReelBucket {
  return REEL_BUCKETS.some((b) => b.id === x)
}

function appSlides(app: string, reelBucket?: string | null): Slide[] {
  const g = APP_GUIDE[app]
  if (!g) return []
  const icon = <AppIcon id={app} />
  const slides: Slide[] = [{ icon, title: g.title, body: g.how }]
  // Videos: once a vibe is picked, explain THAT bucket's three poles in context.
  if (app === 'reel' && reelBucket && isReelBucket(reelBucket)) {
    for (const [l, r] of bucketMeta(reelBucket).poles) {
      slides.push({ icon, title: `${l} ↔ ${r}`, body: poleMeaning(l, r) })
    }
    return slides
  }
  for (const row of g.rows ?? []) slides.push({ icon, title: row.name, body: row.meaning })
  return slides
}

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

/** Floating cue that pops in when the phone↔screen hand-off changes. Stays up
 *  while the big screen is active; the "your turn" nudge auto-dismisses. */
function FocusPopup({ focus }: { focus: { dir: 'up' | 'down' | 'both'; text: string } | null }) {
  const [shown, setShown] = useState(false)
  const key = focus ? `${focus.dir}|${focus.text}` : ''
  useEffect(() => {
    if (!focus) { setShown(false); return }
    setShown(true)
    if (focus.dir === 'down') {
      const t = window.setTimeout(() => setShown(false), 2600)
      return () => window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!focus || !shown) return null
  const arrow = focus.dir === 'up' ? '↑' : focus.dir === 'down' ? '↓' : '↕'
  return (
    <div key={key} className={`focus-pop ${focus.dir}`} role="status">
      <span className="focus-arrow">{arrow}</span>
      <span>{focus.text}</span>
    </div>
  )
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
  const [showOnboard, setShowOnboard] = useState(() => {
    try { return sessionStorage.getItem('ag-onboarded') !== '1' } catch { return true }
  })
  const dismissOnboard = () => {
    try { sessionStorage.setItem('ag-onboarded', '1') } catch { /* private mode */ }
    setShowOnboard(false)
  }
  const [seenHints, setSeenHints] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem('ag-seen-hints') || '{}') } catch { return {} }
  })
  // Manually reopened tour (via a box's info button), independent of first-open auto-show.
  const [tourApp, setTourApp] = useState<string | null>(null)
  const [tourStart, setTourStart] = useState(0)
  // Captured when the visit finishes: the report moves to THIS phone and the iPad is freed.
  const [finalReport, setFinalReport] = useState<{ profile: VisitorProfile; article: ArticleResult | null } | null>(null)
  const endedForReport = useRef(false)
  const openTour = (app: string, slide: number) => { haptic('press'); setTourStart(slide); setTourApp(app) }
  const markSeen = (app: string) => {
    setSeenHints((prev) => {
      const next = { ...prev, [app]: true }
      try { sessionStorage.setItem('ag-seen-hints', JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
  }
  const lastTouch = useRef(0)

  useEffect(() => {
    startLive('controller')
    lockGestures()
    startVersionCheck(() => {
      const s = getLive().snap
      return !s || (!s.display.open && !s.display.busy)
    })
  }, [])

  const say = useCallback((text: string) => setToast({ text, key: Date.now() }), [])

  const active = snap?.position === 0
  const open = active ? snap.display.open : null
  const storyId = active ? snap.display.articleId : null
  const busy = active ? snap.display.busy : null
  const used = objectsTouched(snap)
  const showingReport = !!(active && !open && !choosingArticle && reportReady(used))
  // Per-app walkthrough: auto-shows the first time an app opens, and reopens
  // whenever the info button is tapped.
  const activeTour = open && APP_GUIDE[open] && (!seenHints[open] || tourApp === open) ? open : null
  const closeTour = () => { if (open) markSeen(open); setTourApp(null); setTourStart(0) }

  // Where should the visitor be looking? Flip a banner between the big screen
  // (while generating or when output is live there) and their phone (while tuning).
  const articleLive = !!(active && open === 'article' && storyId && snap?.altered.article?.params.articleId === storyId)
  const reelLive = !!(active && open === 'reel' && snap?.altered.reel)
  const adLive = !!(active && open === 'ad' && snap?.altered.ad)
  let focus: { dir: 'up' | 'down' | 'both'; text: string } | null = null
  if (active) {
    if (busy) focus = { dir: 'up', text: 'Generating — watch the big screen' }
    else if (showingReport) focus = { dir: 'up', text: 'Your report is on the big screen' }
    else if (articleLive) focus = { dir: 'up', text: 'Rewritten on the big screen · scroll & compare below' }
    else if (reelLive) focus = { dir: 'up', text: 'Playing on the big screen' }
    else if (adLive) focus = { dir: 'up', text: 'Playing on the big screen · play / pause below' }
    else if (open === 'chat') focus = { dir: 'both', text: 'Watch the big screen · reply on your phone' }
    else if (open || choosingArticle) focus = { dir: 'down', text: 'Your turn — adjust on your phone' }
  }

  // When the visit is finished, move the report onto this phone and release the
  // iPad so the next visitor can start. Capture the profile first so it survives.
  useEffect(() => {
    if (showingReport && !endedForReport.current) {
      endedForReport.current = true
      setFinalReport({ profile: getLocalProfile(), article: snap?.altered.article ?? null })
      void sendCommand('end')
    }
  }, [showingReport, snap])

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
    if (live.ended) {
      resetLocalProfile()
      resetChatWire()
    }
    wasActive.current = active
  }, [active, live.ended])

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

  const resetAfterReport = () => {
    resetLocalProfile()
    resetChatWire()
    endedForReport.current = false
    setFinalReport(null)
    rejoinQueue()
  }

  let content: ReactNode
  if (finalReport) {
    content = <ControllerReport profile={finalReport.profile} article={finalReport.article} onReset={resetAfterReport} />
  } else if (!snap) {
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
        <PixelButton block onClick={() => { haptic('press'); resetChatWire(); rejoinQueue() }}>
          REJOIN QUEUE
        </PixelButton>
      </Centered>
    )
  } else if (snap.position > 0) {
    content = <QueueScreen position={snap.position} />
  } else if (!active) {
    content = <Centered><div className="scanline" /><div className="ctl-label">REQUESTING ACCESS...</div></Centered>
  } else if (showingReport) {
    content = (
      <Centered>
        <div className="scanline" />
        <div className="ctl-label">PREPARING YOUR REPORT…</div>
      </Centered>
    )
  } else if (!open && !choosingArticle) {
    content = (
      <Picker
        used={used}
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
      : open === 'ad' ? !!snap.altered.ad : false
    content = (
      <div className="ctl-object" key={`${open}:${storyId ?? ''}`}>
        {open === 'article' && (
          <div className="article-view-row">
            <Segmented
              options={[
                { value: 'original', label: 'ORIGINAL' },
                { value: 'altered', label: 'ALTERED', disabled: !hasAltered },
              ]}
              value={hasAltered ? snap.display.view : 'original'}
              disabled={!!busy || !!snap.profile?.session?.articleCompare}
              onChange={(v) => void sendCommand('view', v)}
            />
            <PixelButton
              type="button"
              disabled={!!busy || !hasAltered}
              selected={!!snap.profile?.session?.articleCompare}
              onClick={() => {
                const prof = getLocalProfile()
                const session = { ...prof.session, articleCompare: !prof.session.articleCompare }
                setLocalProfile({ ...prof, session })
                void sendCommand('signal', JSON.stringify({ session }))
              }}
            >
              {snap.profile?.session?.articleCompare ? 'HIDE ORIGINAL' : 'COMPARE'}
            </PixelButton>
          </div>
        )}
        {open === 'article' && (
          <div className="article-scroll-row">
            <PixelButton type="button" disabled={!!busy} onClick={() => void sendControl({ kind: 'scroll', dir: 'up', pane: 'both' })}>
              SCROLL ▲
            </PixelButton>
            <PixelButton type="button" disabled={!!busy} onClick={() => void sendControl({ kind: 'scroll', dir: 'down', pane: 'both' })}>
              SCROLL ▼
            </PixelButton>
          </div>
        )}
        <div
          className="ctl-object-body"
          onScroll={(e) => e.currentTarget.classList.toggle('scrolled', e.currentTarget.scrollTop > 8)}
        >
          {open === 'article' && storyId && !hasAltered && (
            <ArticleControls snap={snap} articleId={storyId} locked={!!busy} transmit={transmit} say={say} onInfo={(s) => openTour('article', s)} />
          )}
          {open === 'article' && hasAltered && (
            <div className="ctl-done">
              <div className="ctl-display">REWRITTEN.</div>
              <div className="ctl-done-sub">Read it on the screen. Use COMPARE and the scroll buttons above.</div>
            </div>
          )}
          {open === 'reel' && (
            <ReelControls snap={snap} locked={!!busy} say={say} onInfo={(s) => openTour('reel', s)} />
          )}
          {open === 'ad' && (
            <AdControls snap={snap} locked={!!busy} onInfo={(s) => openTour('ad', s)} />
          )}
          {open === 'chat' && (
            <ChatControls snap={snap} locked={!!busy} onInfo={(s) => openTour('chat', s)} />
          )}
          {busy && open !== 'reel' && open !== 'chat' && open !== 'ad' && (
            <div className="lock-shade">
              <div>
                <div className="ctl-display">PROCESSING.<br />CONTROLS LOCKED.</div>
                <div className="scanline" />
              </div>
            </div>
          )}
        </div>
        <PixelButton
          className="end-session"
          block
          onClick={() => {
            haptic('press')
            setChoosingArticle(false)
            void sendCommand('home')
          }}
        >
          BACK TO ICONS
        </PixelButton>
      </div>
    )
  }

  const bgObject = open ?? (choosingArticle ? 'article' : null)

  return (
    <div
      className="ctl theme-retro"
      onPointerDownCapture={markActivity}
      onKeyDownCapture={markActivity}
    >
      <Background id={bgObject} />
      <div className="ctl-main">
        <div className="ctl-top">
          <div className="ctl-top-meta">
            <span className="chip">{active && (open || choosingArticle) ? (open ?? 'article').toUpperCase() : 'CONTROLLER'}</span>
            <StatusChip connected={live.connected} local={live.backendKind === 'local'} />
          </div>
          <div className="ctl-timer" />
        </div>
        {content}
      </div>
      <FocusPopup focus={focus} />
      {showOnboard && <Onboarding onDone={dismissOnboard} />}
      {!showOnboard && activeTour && (
        <Tour
          key={`${activeTour}-${tourStart}`}
          slides={appSlides(activeTour, activeTour === 'reel' ? getLocalProfile().session.reel.bucket : null)}
          start={tourStart}
          onDone={closeTour}
        />
      )}
      {toast && <div key={toast.key} className="toast" onAnimationEnd={() => setToast(null)}>{toast.text}</div>}
    </div>
  )
}
